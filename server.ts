import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  DEFAULT_SITE_SETTINGS,
  SEED_ALERTS,
  SEED_SHIPMENTS,
  SEED_SUPPORT_TICKETS,
} from './src/data/seedData.ts';
import { distanceMeters, distanceToPolylineMeters } from './src/utils/geo.ts';
import type {
  ContactMessage,
  GeofenceZone,
  PushAlert,
  ReturnRequest,
  Shipment,
  SiteSettings,
  SupportReply,
  SupportTicket,
} from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.NODE_ENV === 'production' && process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json({ limit: '10mb' }));

function isSafeMediaUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// ======================== ADMIN AUTHENTICATION ========================
const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET?.trim() || crypto.randomBytes(32).toString('hex');
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

let claimedAdmin: { email: string; salt: string; hashHex: string } | null = null;

function sha256Buffer(value: string): Buffer {
  return crypto.createHash('sha256').update(value).digest();
}

function timingSafeEqualString(a: string, b: string): boolean {
  return crypto.timingSafeEqual(sha256Buffer(a), sha256Buffer(b));
}

function hashPassword(password: string, salt: string): Buffer {
  return crypto.scryptSync(password, salt, 64);
}

function getConfiguredEnvCredentials(): { email: string; password: string } | null {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return null;
  return { email, password };
}

function verifyAdminCredentials(emailInput: string, passwordInput: string): string | null {
  const normalizedInputEmail = emailInput.trim().toLowerCase();
  if (!normalizedInputEmail || !passwordInput) return null;

  const envCreds = getConfiguredEnvCredentials();
  if (envCreds) {
    const emailMatches = timingSafeEqualString(
      normalizedInputEmail,
      envCreds.email.trim().toLowerCase()
    );
    const ephemeralSalt = crypto.randomBytes(16).toString('hex');
    const expectedHash = hashPassword(envCreds.password, ephemeralSalt);
    const actualHash = hashPassword(passwordInput, ephemeralSalt);
    const passwordMatches = crypto.timingSafeEqual(expectedHash, actualHash);
    return emailMatches && passwordMatches ? envCreds.email : null;
  }

  if (claimedAdmin) {
    const emailMatches = timingSafeEqualString(
      normalizedInputEmail,
      claimedAdmin.email.trim().toLowerCase()
    );
    const expectedHash = Buffer.from(claimedAdmin.hashHex, 'hex');
    const actualHash = hashPassword(passwordInput, claimedAdmin.salt);
    const passwordMatches =
      expectedHash.length === actualHash.length &&
      crypto.timingSafeEqual(expectedHash, actualHash);
    return emailMatches && passwordMatches ? claimedAdmin.email : null;
  }

  return null;
}

function createAdminToken(email: string): string {
  const payload = Buffer.from(
    JSON.stringify({ email, role: 'admin', exp: Date.now() + TOKEN_TTL_MS }),
    'utf-8'
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyAdminToken(token: string): { email: string } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  if (!payload || !sig) return null;

  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as {
      email?: string;
      role?: string;
      exp?: number;
    };
    if (decoded.role !== 'admin' || !decoded.email || typeof decoded.exp !== 'number') {
      return null;
    }
    if (Date.now() > decoded.exp) {
      return null;
    }
    return { email: decoded.email };
  } catch {
    return null;
  }
}

function getAuthenticatedAdmin(req: express.Request): { email: string } | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  return verifyAdminToken(token);
}

function requireAdminAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const admin = getAuthenticatedAdmin(req);
  if (!admin) {
    res.status(401).json({ ok: false, error: 'Admin authentication required' });
    return;
  }
  next();
}

// In-memory state store synchronized with clients via REST + SSE
let shipments: Shipment[] = structuredClone(SEED_SHIPMENTS);
let alerts: PushAlert[] = structuredClone(SEED_ALERTS);
let siteSettings: SiteSettings = structuredClone(DEFAULT_SITE_SETTINGS);
let supportTickets: SupportTicket[] = structuredClone(SEED_SUPPORT_TICKETS);
let contactMessages: ContactMessage[] = [
  {
    id: 'msg-1001',
    name: 'Amelia Hart',
    email: 'amelia@example.com',
    subject: 'Delivery window request · TP26AB100245',
    message: 'Could the courier call 15 minutes before reaching Deansgate Manchester?',
    createdAt: '2026-10-09T11:20:00.000Z',
    status: 'open',
  },
  {
    id: 'msg-1002',
    name: 'Nordic Studio Ltd',
    email: 'ops@nordicstudio.co.uk',
    subject: 'Business API webhook verification',
    message: 'Requesting production webhook signing key for monthly bulk CSV batch manifests.',
    createdAt: '2026-10-08T16:45:00.000Z',
    status: 'resolved',
    adminNote: 'Webhook secret provisioned and tested against staging endpoint.',
  },
];

let returnRequests: ReturnRequest[] = [
  {
    id: 'ret-101',
    code: 'RET-UK-9042',
    retailer: 'Soho Footwear Ltd',
    dropPoint: 'Testford Lockers #14, London',
    status: 'Scanned',
    createdAt: '2026-10-09 09:15',
  },
  {
    id: 'ret-102',
    code: 'RET-EU-3180',
    retailer: 'Atelier Nord',
    dropPoint: 'Central Station Smart Locker, Berlin',
    status: 'Issued',
    createdAt: '2026-10-09 13:40',
  },
];

type SSEClient = express.Response;
const sseClients = new Set<SSEClient>();

function broadcastSSE(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch {
      sseClients.delete(res);
    }
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'Metro Parcel Service API', timestamp: new Date().toISOString() });
});

app.get('/api/admin/auth/status', (req, res) => {
  const envCreds = getConfiguredEnvCredentials();
  const needsSetup = !envCreds && !claimedAdmin;
  const admin = getAuthenticatedAdmin(req);
  res.json({
    ok: true,
    needsSetup,
    authenticated: Boolean(admin),
    email: admin?.email ?? null,
  });
});

app.post('/api/admin/auth/setup', (req, res) => {
  const envCreds = getConfiguredEnvCredentials();
  if (envCreds || claimedAdmin) {
    res.status(409).json({ ok: false, error: 'Admin account is already configured' });
    return;
  }
  const { email, password } = req.body ?? {};
  const cleanEmail = String(email ?? '').trim().toLowerCase();
  const rawPassword = String(password ?? '');

  if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    res.status(400).json({ ok: false, error: 'Valid admin email address is required' });
    return;
  }
  if (rawPassword.length < 8) {
    res.status(400).json({ ok: false, error: 'Admin password must be at least 8 characters' });
    return;
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hashHex = hashPassword(rawPassword, salt).toString('hex');
  claimedAdmin = { email: cleanEmail, salt, hashHex };

  const token = createAdminToken(cleanEmail);
  res.status(201).json({ ok: true, token, email: cleanEmail });
});

app.post('/api/admin/auth/login', (req, res) => {
  const envCreds = getConfiguredEnvCredentials();
  if (!envCreds && !claimedAdmin) {
    res.status(409).json({
      ok: false,
      needsSetup: true,
      error: 'Initial admin setup required before signing in',
    });
    return;
  }

  const { email, password } = req.body ?? {};
  const verifiedEmail = verifyAdminCredentials(String(email ?? ''), String(password ?? ''));
  if (!verifiedEmail) {
    res.status(401).json({ ok: false, error: 'Invalid admin email or password' });
    return;
  }

  const token = createAdminToken(verifiedEmail);
  res.json({ ok: true, token, email: verifiedEmail });
});

app.post('/api/admin/auth/logout', (_req, res) => {
  res.json({ ok: true });
});

// Gate all /api/admin/* routes except /api/admin/auth/*
app.use('/api/admin', (req, res, next) => {
  if (req.path.startsWith('/auth/')) {
    next();
    return;
  }
  requireAdminAuth(req, res, next);
});

app.get('/api/stream/tracking', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, count: shipments.length })}\n\n`);
  sseClients.add(res);

  const heartbeat = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(res);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

app.get('/api/shipments', (_req, res) => {
  res.json({ ok: true, shipments, alerts });
});

app.get('/api/shipments/:id', (req, res) => {
  const query = req.params.id.trim().toUpperCase();
  const found = shipments.find(
    (s) => s.tracking_no.toUpperCase() === query || s.receipt_no.toUpperCase() === query
  );
  if (!found) {
    res.status(404).json({ ok: false, error: 'Shipment not found' });
    return;
  }
  res.json({ ok: true, shipment: found });
});

app.post('/api/shipments/:id/position', requireAdminAuth, (req, res) => {
  const id = req.params.id.trim().toUpperCase();
  const idx = shipments.findIndex((s) => s.tracking_no.toUpperCase() === id);
  if (idx === -1) {
    res.status(404).json({ ok: false, error: 'Shipment not found' });
    return;
  }

  const { lat, lng, location, speedKmh, headingDeg, progress, deviationThresholdMeters = 12000 } = req.body ?? {};
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    res.status(400).json({ ok: false, error: 'Valid lat and lng coordinates required' });
    return;
  }

  const current = shipments[idx];
  const nextAlerts: PushAlert[] = [];
  const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const shortTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  // Evaluate geofences
  const updatedGeofences = current.geofences.map((gf) => {
    if (!gf.active) return gf;
    const dist = distanceMeters({ lat, lng }, { lat: gf.lat, lng: gf.lng });
    if (dist <= gf.radiusMeters && !gf.triggered) {
      const alertType = gf.type === 'destination' ? 'arrival' : 'geofence_enter';
      const newAlert: PushAlert = {
        id: `al-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        trackingNo: current.tracking_no,
        type: alertType,
        title:
          gf.type === 'destination'
            ? `Driver Arrived at ${gf.name}`
            : `Entered ${gf.name} Geofence`,
        message: `${current.courier.name} entered the ${(gf.radiusMeters / 1000).toFixed(1)} km ${gf.name} zone.`,
        timestamp: `Today, ${shortTime}`,
        read: false,
        lat,
        lng,
      };
      nextAlerts.push(newAlert);
      return { ...gf, triggered: true };
    }
    return gf;
  });

  // Evaluate route corridor deviation
  const corridorDist = distanceToPolylineMeters({ lat, lng }, current.routeWaypoints);
  let nextStatus = current.status;
  if (corridorDist > deviationThresholdMeters && current.status !== 'Delivered') {
    nextStatus = 'Route Deviation';
    nextAlerts.push({
      id: `al-dev-${Date.now()}`,
      trackingNo: current.tracking_no,
      type: 'deviation',
      title: `Route Deviation Alert · ${current.tracking_no}`,
      message: `${current.courier.name} deviated ${(corridorDist / 1000).toFixed(1)} km from planned corridor near ${location || 'active sector'}.`,
      timestamp: `Today, ${shortTime}`,
      read: false,
      lat,
      lng,
    });
  } else if (updatedGeofences.some((g) => g.type === 'destination' && g.triggered)) {
    nextStatus = 'Delivered';
  } else if (current.status === 'Route Deviation') {
    nextStatus = 'In Transit';
  }

  const updatedShipment: Shipment = {
    ...current,
    status: nextStatus,
    progress: typeof progress === 'number' ? Math.min(100, Math.max(0, progress)) : current.progress,
    updated_at: nowStr,
    current: {
      lat,
      lng,
      location: typeof location === 'string' && location ? location : `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      speedKmh: typeof speedKmh === 'number' ? speedKmh : current.current.speedKmh,
      headingDeg: typeof headingDeg === 'number' ? headingDeg : current.current.headingDeg,
    },
    geofences: updatedGeofences,
    routeWaypoints: [
      ...current.routeWaypoints,
      {
        lat,
        lng,
        timestamp: `Live ${shortTime}`,
        speedKmh: typeof speedKmh === 'number' ? speedKmh : 68,
        headingDeg: typeof headingDeg === 'number' ? headingDeg : 0,
        label: location || 'Live GPS Ping',
      },
    ],
  };

  shipments[idx] = updatedShipment;
  if (nextAlerts.length > 0) {
    alerts = [...nextAlerts, ...alerts].slice(0, 50);
  }

  broadcastSSE('position', { shipment: updatedShipment, newAlerts: nextAlerts });
  res.json({ ok: true, shipment: updatedShipment, newAlerts: nextAlerts });
});

app.put('/api/geofences/:trackingNo', requireAdminAuth, (req, res) => {
  const id = req.params.trackingNo.trim().toUpperCase();
  const idx = shipments.findIndex((s) => s.tracking_no.toUpperCase() === id);
  if (idx === -1) {
    res.status(404).json({ ok: false, error: 'Shipment not found' });
    return;
  }
  const { geofences } = req.body as { geofences: GeofenceZone[] };
  if (!Array.isArray(geofences)) {
    res.status(400).json({ ok: false, error: 'geofences array required' });
    return;
  }
  shipments[idx] = { ...shipments[idx], geofences };
  broadcastSSE('geofences', { trackingNo: shipments[idx].tracking_no, geofences });
  res.json({ ok: true, shipment: shipments[idx] });
});

app.get('/api/settings', (_req, res) => {
  res.json({ ok: true, settings: siteSettings });
});

app.put('/api/admin/settings', (req, res) => {
  const body = req.body ?? {};
  const nextContact = body.contact ?? {};
  const nextAbout = body.about ?? {};
  const nextHelp = body.help ?? {};

  const safeAddress = String(nextContact.address ?? siteSettings.contact.address).trim().slice(0, 300);
  const safeEmail = String(nextContact.email ?? siteSettings.contact.email).trim().slice(0, 150);
  const safePhone = String(nextContact.phone ?? siteSettings.contact.phone).trim().slice(0, 60);

  if (!safeAddress || !safeEmail || !safePhone) {
    res.status(400).json({ ok: false, error: 'Address, email, and phone contact are required' });
    return;
  }

  const heroCandidate = String(nextAbout.heroImage ?? siteSettings.about.heroImage).trim();
  const safeHeroImage = isSafeMediaUrl(heroCandidate)
    ? heroCandidate
    : siteSettings.about.heroImage;

  const safeValues = Array.isArray(nextAbout.values)
    ? nextAbout.values
        .map((v: Record<string, unknown>) => ({
          title: String(v?.title ?? '').trim().slice(0, 100),
          desc: String(v?.desc ?? '').trim().slice(0, 400),
        }))
        .filter((v: { title: string; desc: string }) => v.title && v.desc)
        .slice(0, 6)
    : siteSettings.about.values;

  const safeMilestones = Array.isArray(nextAbout.milestones)
    ? nextAbout.milestones
        .map((m: Record<string, unknown>) => ({
          year: String(m?.year ?? '').trim().slice(0, 20),
          text: String(m?.text ?? '').trim().slice(0, 250),
        }))
        .filter((m: { year: string; text: string }) => m.year && m.text)
        .slice(0, 12)
    : siteSettings.about.milestones;

  const safeFaqs = Array.isArray(nextHelp.faqs)
    ? nextHelp.faqs
        .map((f: Record<string, unknown>, idx: number) => ({
          id: String(f?.id ?? `faq-${Date.now()}-${idx}`).trim(),
          category: String(f?.category ?? 'General').trim().slice(0, 60) || 'General',
          q: String(f?.q ?? '').trim().slice(0, 240),
          a: String(f?.a ?? '').trim().slice(0, 1000),
        }))
        .filter((f: { q: string; a: string }) => f.q && f.a)
        .slice(0, 40)
    : siteSettings.help.faqs;

  siteSettings = {
    contact: {
      address: safeAddress,
      email: safeEmail,
      phone: safePhone,
      supportHours: String(nextContact.supportHours ?? siteSettings.contact.supportHours).trim().slice(0, 120),
      salesHours: String(nextContact.salesHours ?? siteSettings.contact.salesHours).trim().slice(0, 120),
    },
    about: {
      eyebrow: String(nextAbout.eyebrow ?? siteSettings.about.eyebrow).trim().slice(0, 80),
      headline: String(nextAbout.headline ?? siteSettings.about.headline).trim().slice(0, 160),
      intro: String(nextAbout.intro ?? siteSettings.about.intro).trim().slice(0, 800),
      heroImage: safeHeroImage,
      values: safeValues.length > 0 ? safeValues : siteSettings.about.values,
      milestones: safeMilestones.length > 0 ? safeMilestones : siteSettings.about.milestones,
    },
    help: {
      eyebrow: String(nextHelp.eyebrow ?? siteSettings.help.eyebrow).trim().slice(0, 80),
      headline: String(nextHelp.headline ?? siteSettings.help.headline).trim().slice(0, 160),
      searchPlaceholder: String(nextHelp.searchPlaceholder ?? siteSettings.help.searchPlaceholder).trim().slice(0, 160),
      stillStuckTitle: String(nextHelp.stillStuckTitle ?? siteSettings.help.stillStuckTitle).trim().slice(0, 120),
      stillStuckSubtitle: String(nextHelp.stillStuckSubtitle ?? siteSettings.help.stillStuckSubtitle).trim().slice(0, 300),
      faqs: safeFaqs.length > 0 ? safeFaqs : siteSettings.help.faqs,
    },
  };

  broadcastSSE('settings_updated', { settings: siteSettings });
  res.json({ ok: true, settings: siteSettings });
});

// ======================== REAL-TIME SUPPORT TICKETS API ========================

const VALID_CATEGORIES = new Set(['Tracking', 'Delivery Issue', 'Receipt & Billing', 'Return', 'General']);

function createSupportTicketRecord(input: {
  name: string;
  email: string;
  subject?: string;
  message: string;
  trackingNo?: string;
  category?: string;
  priority?: string;
}): SupportTicket {
  const now = new Date().toISOString();
  const codeNum = Math.floor(1000 + Math.random() * 8999);
  const ticketCode = `TKT-${codeNum}`;
  const safeCategory = VALID_CATEGORIES.has(String(input.category || ''))
    ? (String(input.category) as SupportTicket['category'])
    : 'General';
  const safePriority: SupportTicket['priority'] =
    input.priority === 'Urgent' ? 'Urgent' : 'Normal';
  const cleanTracking = input.trackingNo ? String(input.trackingNo).trim().toUpperCase().slice(0, 40) : undefined;

  return {
    id: `tkt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ticketCode,
    name: String(input.name).trim().slice(0, 120),
    email: String(input.email).trim().slice(0, 150),
    trackingNo: cleanTracking || undefined,
    category: safeCategory,
    priority: safePriority,
    subject: String(input.subject || 'Support Ticket').trim().slice(0, 200),
    status: 'open',
    createdAt: now,
    updatedAt: now,
    replies: [
      {
        id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        senderRole: 'visitor',
        senderName: String(input.name).trim().slice(0, 120),
        text: String(input.message).trim().slice(0, 2000),
        createdAt: now,
      },
    ],
  };
}

// Visitor lookup of a specific ticket by ticketCode (preserves privacy of other visitors' tickets)
app.get('/api/tickets/:code', (req, res) => {
  const q = req.params.code.trim().toUpperCase();
  const found = supportTickets.find(
    (t) => t.ticketCode.toUpperCase() === q || t.id.toUpperCase() === q
  );
  if (!found) {
    res.status(404).json({ ok: false, error: 'Ticket not found' });
    return;
  }
  res.json({ ok: true, ticket: found });
});

app.post('/api/tickets', (req, res) => {
  const { name, email, subject, message, trackingNo, category, priority } = req.body ?? {};
  if (!name || !email || !message) {
    res.status(400).json({ ok: false, error: 'Name, email, and message are required' });
    return;
  }
  const ticket = createSupportTicketRecord({ name, email, subject, message, trackingNo, category, priority });
  supportTickets = [ticket, ...supportTickets];

  const legacyEntry: ContactMessage = {
    id: `msg-${Date.now()}`,
    name: ticket.name,
    email: ticket.email,
    subject: ticket.subject,
    message: ticket.replies[0].text,
    createdAt: ticket.createdAt,
    status: 'open',
  };
  contactMessages = [legacyEntry, ...contactMessages];

  broadcastSSE('ticket_created', { ticket });
  broadcastSSE('admin_contact', { entry: legacyEntry });
  res.status(201).json({ ok: true, ticket });
});

app.post('/api/tickets/:id/replies', (req, res) => {
  const key = req.params.id.trim().toUpperCase();
  const idx = supportTickets.findIndex(
    (t) => t.id.toUpperCase() === key || t.ticketCode.toUpperCase() === key
  );
  if (idx === -1) {
    res.status(404).json({ ok: false, error: 'Support ticket not found' });
    return;
  }
  const { senderRole, senderName, text } = req.body ?? {};
  const cleanText = String(text ?? '').trim().slice(0, 2000);
  if (!cleanText) {
    res.status(400).json({ ok: false, error: 'Reply message cannot be empty' });
    return;
  }
  const role: SupportReply['senderRole'] = senderRole === 'admin' ? 'admin' : 'visitor';
  if (role === 'admin' && !getAuthenticatedAdmin(req)) {
    res.status(401).json({ ok: false, error: 'Admin authentication required for admin replies' });
    return;
  }
  const fallbackName = role === 'admin' ? 'Metro Parcel Service Support' : supportTickets[idx].name;
  const cleanName = String(senderName ?? fallbackName).trim().slice(0, 120) || fallbackName;
  const now = new Date().toISOString();

  const reply: SupportReply = {
    id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    senderRole: role,
    senderName: cleanName,
    text: cleanText,
    createdAt: now,
  };

  const current = supportTickets[idx];
  const nextStatus: SupportTicket['status'] =
    role === 'admin'
      ? current.status === 'resolved'
        ? 'resolved'
        : 'in_progress'
      : current.status === 'resolved'
      ? 'open'
      : current.status;

  const updatedTicket: SupportTicket = {
    ...current,
    status: nextStatus,
    updatedAt: now,
    replies: [...current.replies, reply],
  };

  supportTickets[idx] = updatedTicket;
  broadcastSSE('ticket_reply', { ticket: updatedTicket, reply });
  res.status(201).json({ ok: true, ticket: updatedTicket, reply });
});

app.get('/api/admin/tickets', (_req, res) => {
  res.json({ ok: true, tickets: supportTickets });
});

app.patch('/api/admin/tickets/:id', (req, res) => {
  const key = req.params.id.trim().toUpperCase();
  const idx = supportTickets.findIndex(
    (t) => t.id.toUpperCase() === key || t.ticketCode.toUpperCase() === key
  );
  if (idx === -1) {
    res.status(404).json({ ok: false, error: 'Support ticket not found' });
    return;
  }
  const { status } = req.body ?? {};
  const nextStatus: SupportTicket['status'] =
    status === 'resolved' ? 'resolved' : status === 'in_progress' ? 'in_progress' : 'open';
  supportTickets[idx] = {
    ...supportTickets[idx],
    status: nextStatus,
    updatedAt: new Date().toISOString(),
  };
  broadcastSSE('ticket_updated', { ticket: supportTickets[idx] });
  res.json({ ok: true, ticket: supportTickets[idx] });
});

app.post('/api/contact', (req, res) => {
  const { name, email, subject, message, trackingNo, category, priority } = req.body ?? {};
  if (!name || !email || !message) {
    res.status(400).json({ ok: false, error: 'Name, email, and message are required' });
    return;
  }
  const entry: ContactMessage = {
    id: `msg-${Date.now()}`,
    name: String(name),
    email: String(email),
    subject: String(subject || 'General inquiry'),
    message: String(message),
    createdAt: new Date().toISOString(),
    status: 'open',
  };
  contactMessages = [entry, ...contactMessages];

  const ticket = createSupportTicketRecord({ name, email, subject, message, trackingNo, category, priority });
  supportTickets = [ticket, ...supportTickets];

  broadcastSSE('admin_contact', { entry });
  broadcastSSE('ticket_created', { ticket });
  res.status(201).json({ ok: true, entry, ticket });
});

app.post('/api/sync', (req, res) => {
  const { actions } = req.body as { actions?: Array<{ id: string; kind: string; payload: Record<string, unknown> }> };
  if (!Array.isArray(actions)) {
    res.status(400).json({ ok: false, error: 'actions array required' });
    return;
  }
  const processedIds: string[] = [];
  for (const act of actions) {
    processedIds.push(act.id);
    if (act.kind === 'contact' && act.payload) {
      const p = act.payload;
      if (p.name && p.email && p.message) {
        const ticket = createSupportTicketRecord({
          name: String(p.name),
          email: String(p.email),
          subject: p.subject ? String(p.subject) : undefined,
          message: String(p.message),
          trackingNo: p.trackingNo ? String(p.trackingNo) : undefined,
          category: p.category ? String(p.category) : undefined,
          priority: p.priority ? String(p.priority) : undefined,
        });
        supportTickets = [ticket, ...supportTickets];
        broadcastSSE('ticket_created', { ticket });
      }
    } else if (act.kind === 'ticket_reply' && act.payload) {
      const p = act.payload;
      const tIdx = supportTickets.findIndex(
        (t) => t.id === p.ticketId || t.ticketCode === p.ticketCode
      );
      if (tIdx !== -1 && p.text) {
        const isAdminSync = p.senderRole === 'admin' && Boolean(getAuthenticatedAdmin(req));
        const reply: SupportReply = {
          id: `rep-sync-${Date.now()}`,
          senderRole: isAdminSync ? 'admin' : 'visitor',
          senderName: String(p.senderName || supportTickets[tIdx].name),
          text: String(p.text),
          createdAt: new Date().toISOString(),
        };
        supportTickets[tIdx] = {
          ...supportTickets[tIdx],
          updatedAt: reply.createdAt,
          replies: [...supportTickets[tIdx].replies, reply],
        };
        broadcastSSE('ticket_reply', { ticket: supportTickets[tIdx], reply });
      }
    }
  }
  res.json({ ok: true, syncedCount: processedIds.length, processedIds });
});

// ======================== ADMIN PORTAL API ========================

app.get('/api/admin/overview', (_req, res) => {
  res.json({
    ok: true,
    shipments,
    alerts,
    contactMessages,
    supportTickets,
    returnRequests,
    settings: siteSettings,
  });
});

app.post('/api/admin/shipments', (req, res) => {
  const body = req.body ?? {};
  const originCity = String(body.originCity || 'London, UK').trim();
  const destCity = String(body.destCity || 'Manchester, UK').trim();
  const senderName = String(body.senderName || 'Metro Parcel Service Dispatch').trim();
  const receiverName = String(body.receiverName || 'Verified Recipient').trim();

  if (!originCity || !destCity) {
    res.status(400).json({ ok: false, error: 'Origin and destination cities are required' });
    return;
  }

  const randCode = Math.floor(100000 + Math.random() * 899999);
  const trackingNo = body.trackingNo
    ? String(body.trackingNo).trim().toUpperCase()
    : `TP26AD${randCode}`;
  const receiptNo =
    body.receiptNo ||
    `RCP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(randCode).slice(0, 4)}`;

  if (shipments.some((s) => s.tracking_no.toUpperCase() === trackingNo)) {
    res.status(409).json({ ok: false, error: `Tracking number ${trackingNo} already exists` });
    return;
  }

  const originLat = Number(body.originLat) || 51.5072;
  const originLng = Number(body.originLng) || -0.1276;
  const destLat = Number(body.destLat) || 53.4808;
  const destLng = Number(body.destLng) || -2.2426;
  const midLat = (originLat + destLat) / 2;
  const midLng = (originLng + destLng) / 2;
  const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const totalFee = Number(body.totalFee) || 29.99;
  const paymentState = (body.paymentState || 'Paid') as Shipment['payment']['state'];
  const status = String(body.status || 'Picked Up');
  const progress = Math.min(100, Math.max(0, Number(body.progress ?? 20)));

  const parcelImages: string[] = Array.isArray(body.parcelImages)
    ? body.parcelImages
        .map((img: unknown) => String(img || '').trim())
        .filter((img: string) => Boolean(img))
        .slice(0, 6)
    : [];
  const primaryProof =
    parcelImages[0] || (body.proofImage ? String(body.proofImage).trim() : undefined);

  const newShipment: Shipment = {
    tracking_no: trackingNo,
    receipt_no: receiptNo,
    company: 'Metro Parcel Service',
    status,
    service: body.service || 'Express',
    package: String(body.packageDesc || 'Commercial Parcel'),
    weight: Number(body.weightKg) || 2.5,
    dimensionsCm: String(body.dimensionsCm || '35x25x18 cm'),
    pieces: Math.max(1, Number(body.pieces) || 1),
    progress,
    origin: { city: originCity, lat: originLat, lng: originLng },
    dest: { city: destCity, lat: destLat, lng: destLng },
    current: {
      lat: originLat,
      lng: originLng,
      location: `${originCity} Hub`,
      speedKmh: status === 'In Transit' ? 76 : 0,
      headingDeg: 335,
    },
    sender: {
      name: senderName,
      city: originCity,
      address: String(body.senderAddress || `${originCity} Central Depot`),
      email: body.senderEmail ? String(body.senderEmail).trim() : undefined,
      phone: body.senderPhone ? String(body.senderPhone).trim() : undefined,
    },
    receiver: {
      name: receiverName,
      city: destCity,
      address: String(body.receiverAddress || `${destCity} Delivery Point`),
      email: body.receiverEmail ? String(body.receiverEmail).trim() : undefined,
      phone: body.receiverPhone ? String(body.receiverPhone).trim() : undefined,
    },
    courier: {
      name: String(body.courierName || 'Richard Dheo'),
      phone: String(body.courierPhone || '+44 7700 900789').trim(),
      vehicle: String(body.courierVehicle || 'EV Sprinter · TP-402'),
    },
    pickup: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    eta: String(body.eta || 'Tomorrow, 16:00'),
    payment: {
      state: paymentState,
      total: `£${totalFee.toFixed(2)}`,
      paid: paymentState === 'Partial' ? `£${(totalFee * 0.5).toFixed(2)}` : `£${totalFee.toFixed(2)}`,
      balance: paymentState === 'Partial' ? `£${(totalFee * 0.5).toFixed(2)}` : '£0.00',
      shippingFee: `£${(totalFee / 1.2).toFixed(2)}`,
      insuranceFee: '£0.00',
      vatFee: `£${(totalFee - totalFee / 1.2).toFixed(2)}`,
      method: String(body.paymentMethod || 'Admin Portal Dispatch'),
      reference: receiptNo,
      issuedAt: new Date().toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
    distance_km: Math.max(15, Math.round(distanceMeters({ lat: originLat, lng: originLng }, { lat: destLat, lng: destLng }) / 1000)),
    updated_at: nowStr,
    proofImage: primaryProof,
    parcelImages: parcelImages.length > 0 ? parcelImages : primaryProof ? [primaryProof] : undefined,
    events: [
      {
        status,
        location: originCity,
        lat: originLat,
        lng: originLng,
        note: 'Created & dispatched via Metro Parcel Service Admin Portal',
        event_time: nowStr,
        time_h: 'Just now',
      },
    ],
    routeWaypoints: [
      { lat: originLat, lng: originLng, timestamp: 'Just now', speedKmh: 0, headingDeg: 335, label: `${originCity} Origin` },
      { lat: midLat, lng: midLng, timestamp: 'Planned Corridor', speedKmh: 78, headingDeg: 335, label: 'Midpoint Sector' },
      { lat: destLat, lng: destLng, timestamp: String(body.eta || 'ETA'), speedKmh: 0, headingDeg: 0, label: `${destCity} Arrival` },
    ],
    geofences: [
      { id: `gf-o-${randCode}`, name: `${originCity} Origin`, lat: originLat, lng: originLng, radiusMeters: 5000, type: 'origin', active: true, triggered: true },
      { id: `gf-d-${randCode}`, name: `${destCity} Arrival Zone`, lat: destLat, lng: destLng, radiusMeters: 6500, type: 'destination', active: true, triggered: false },
    ],
  };

  shipments = [newShipment, ...shipments];
  const alert: PushAlert = {
    id: `al-adm-${Date.now()}`,
    trackingNo,
    type: 'route_update',
    title: `Admin Dispatch Created · ${trackingNo}`,
    message: `${originCity} → ${destCity} assigned to ${newShipment.courier.name}.`,
    timestamp: 'Just now',
    read: false,
    lat: originLat,
    lng: originLng,
  };
  alerts = [alert, ...alerts].slice(0, 50);
  broadcastSSE('shipment_created', { shipment: newShipment, alert });
  res.status(201).json({ ok: true, shipment: newShipment, alert });
});

app.patch('/api/admin/shipments/:id', (req, res) => {
  const id = req.params.id.trim().toUpperCase();
  const idx = shipments.findIndex((s) => s.tracking_no.toUpperCase() === id);
  if (idx === -1) {
    res.status(404).json({ ok: false, error: 'Shipment not found' });
    return;
  }

  const current = shipments[idx];
  const body = req.body ?? {};
  const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const shortTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const nextStatus = body.status !== undefined ? String(body.status) : current.status;
  const nextProgress =
    body.progress !== undefined
      ? Math.min(100, Math.max(0, Number(body.progress)))
      : nextStatus === 'Delivered'
      ? 100
      : current.progress;

  const nextCurrentLocation =
    body.currentLocation !== undefined ? String(body.currentLocation) : current.current.location;

  const updatedEvents = [...current.events];
  if (body.eventNote || (body.status !== undefined && body.status !== current.status)) {
    updatedEvents.push({
      status: nextStatus,
      location: nextCurrentLocation,
      lat: current.current.lat,
      lng: current.current.lng,
      note: String(body.eventNote || `Admin updated status to ${nextStatus}`),
      event_time: nowStr,
      time_h: `Today, ${shortTime}`,
    });
  }

  const updatedPayment = body.paymentState
    ? {
        ...current.payment,
        state: body.paymentState as Shipment['payment']['state'],
        paid: body.paymentState === 'Paid' ? current.payment.total : current.payment.paid,
        balance: body.paymentState === 'Paid' || body.paymentState === 'Refunded' ? '£0.00' : current.payment.balance,
      }
    : current.payment;

  const nextParcelImages: string[] | undefined = Array.isArray(body.parcelImages)
    ? body.parcelImages
        .map((img: unknown) => String(img || '').trim())
        .filter((img: string) => Boolean(img))
        .slice(0, 6)
    : current.parcelImages;

  const updated: Shipment = {
    ...current,
    status: nextStatus,
    progress: nextProgress,
    service: body.service ?? current.service,
    eta: body.eta !== undefined ? String(body.eta) : current.eta,
    package: body.package !== undefined ? String(body.package) : current.package,
    weight: body.weight !== undefined ? Number(body.weight) : current.weight,
    dimensionsCm: body.dimensionsCm !== undefined ? String(body.dimensionsCm) : current.dimensionsCm,
    updated_at: nowStr,
    current: {
      ...current.current,
      location: nextCurrentLocation,
    },
    sender: {
      ...current.sender,
      email: body.senderEmail !== undefined ? String(body.senderEmail).trim() || undefined : current.sender.email,
      phone: body.senderPhone !== undefined ? String(body.senderPhone).trim() || undefined : current.sender.phone,
    },
    receiver: {
      ...current.receiver,
      email: body.receiverEmail !== undefined ? String(body.receiverEmail).trim() || undefined : current.receiver.email,
      phone: body.receiverPhone !== undefined ? String(body.receiverPhone).trim() || undefined : current.receiver.phone,
    },
    courier: {
      name: body.courierName !== undefined ? String(body.courierName) : current.courier.name,
      phone: body.courierPhone !== undefined ? String(body.courierPhone) : current.courier.phone,
      vehicle: body.courierVehicle !== undefined ? String(body.courierVehicle) : current.courier.vehicle,
    },
    proofImage:
      nextParcelImages && nextParcelImages.length > 0
        ? nextParcelImages[0]
        : body.proofImage !== undefined
        ? String(body.proofImage) || undefined
        : current.proofImage,
    parcelImages: nextParcelImages,
    payment: updatedPayment,
    events: updatedEvents,
  };

  shipments[idx] = updated;
  broadcastSSE('shipment_updated', { shipment: updated });
  res.json({ ok: true, shipment: updated });
});

app.post('/api/admin/shipments/:id/events', (req, res) => {
  const id = req.params.id.trim().toUpperCase();
  const idx = shipments.findIndex((s) => s.tracking_no.toUpperCase() === id);
  if (idx === -1) {
    res.status(404).json({ ok: false, error: 'Shipment not found' });
    return;
  }

  const { status, location, note, progress } = req.body ?? {};
  if (!location || !note) {
    res.status(400).json({ ok: false, error: 'Location and note are required' });
    return;
  }

  const current = shipments[idx];
  const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const shortTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const nextStatus = String(status || current.status);

  const updated: Shipment = {
    ...current,
    status: nextStatus,
    progress:
      progress !== undefined
        ? Math.min(100, Math.max(0, Number(progress)))
        : nextStatus === 'Delivered'
        ? 100
        : current.progress,
    updated_at: nowStr,
    current: {
      ...current.current,
      location: String(location),
    },
    events: [
      ...current.events,
      {
        status: nextStatus,
        location: String(location),
        lat: current.current.lat,
        lng: current.current.lng,
        note: String(note),
        event_time: nowStr,
        time_h: `Today, ${shortTime}`,
      },
    ],
  };

  shipments[idx] = updated;
  const alert: PushAlert = {
    id: `al-ev-${Date.now()}`,
    trackingNo: updated.tracking_no,
    type: nextStatus === 'Delivered' ? 'arrival' : 'route_update',
    title: `${updated.tracking_no} · ${nextStatus}`,
    message: `${location}: ${note}`,
    timestamp: `Today, ${shortTime}`,
    read: false,
    lat: updated.current.lat,
    lng: updated.current.lng,
  };
  alerts = [alert, ...alerts].slice(0, 50);
  broadcastSSE('shipment_updated', { shipment: updated, alert });
  res.status(201).json({ ok: true, shipment: updated, alert });
});

app.delete('/api/admin/shipments/:id', (req, res) => {
  const id = req.params.id.trim().toUpperCase();
  const exists = shipments.some((s) => s.tracking_no.toUpperCase() === id);
  if (!exists) {
    res.status(404).json({ ok: false, error: 'Shipment not found' });
    return;
  }
  shipments = shipments.filter((s) => s.tracking_no.toUpperCase() !== id);
  broadcastSSE('shipment_deleted', { trackingNo: id });
  res.json({ ok: true, deleted: id });
});

app.post('/api/admin/alerts', (req, res) => {
  const { trackingNo, type, title, message } = req.body ?? {};
  if (!title || !message) {
    res.status(400).json({ ok: false, error: 'Alert title and message are required' });
    return;
  }
  const shortTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const target = shipments.find((s) => s.tracking_no === trackingNo) || shipments[0];
  const alert: PushAlert = {
    id: `al-bc-${Date.now()}`,
    trackingNo: String(trackingNo || target?.tracking_no || 'FLEET-ALL'),
    type: type || 'route_update',
    title: String(title),
    message: String(message),
    timestamp: `Today, ${shortTime}`,
    read: false,
    lat: target?.current.lat ?? 51.5072,
    lng: target?.current.lng ?? -0.1276,
  };
  alerts = [alert, ...alerts].slice(0, 50);
  broadcastSSE('alert', { alert });
  res.status(201).json({ ok: true, alert });
});

app.patch('/api/admin/alerts/read-all', (_req, res) => {
  alerts = alerts.map((a) => ({ ...a, read: true }));
  res.json({ ok: true, alerts });
});

app.get('/api/admin/contact', (_req, res) => {
  res.json({ ok: true, contactMessages });
});

app.patch('/api/admin/contact/:id', (req, res) => {
  const idx = contactMessages.findIndex((m) => m.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ ok: false, error: 'Message not found' });
    return;
  }
  const { status, adminNote } = req.body ?? {};
  contactMessages[idx] = {
    ...contactMessages[idx],
    status: status === 'resolved' ? 'resolved' : 'open',
    adminNote: adminNote !== undefined ? String(adminNote) : contactMessages[idx].adminNote,
  };
  res.json({ ok: true, entry: contactMessages[idx] });
});

app.get('/api/admin/returns', (_req, res) => {
  res.json({ ok: true, returnRequests });
});

app.post('/api/admin/returns', (req, res) => {
  const { code, retailer, dropPoint } = req.body ?? {};
  if (!code) {
    res.status(400).json({ ok: false, error: 'Return code is required' });
    return;
  }
  const entry: ReturnRequest = {
    id: `ret-${Date.now()}`,
    code: String(code).trim().toUpperCase(),
    retailer: String(retailer || 'Partner Retailer'),
    dropPoint: String(dropPoint || 'Any Metro Parcel Service 24/7 Drop Point'),
    status: 'Issued',
    createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
  };
  returnRequests = [entry, ...returnRequests];
  res.status(201).json({ ok: true, entry });
});

app.patch('/api/admin/returns/:id', (req, res) => {
  const idx = returnRequests.findIndex((r) => r.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ ok: false, error: 'Return not found' });
    return;
  }
  const { status } = req.body ?? {};
  if (status) {
    returnRequests[idx] = { ...returnRequests[idx], status };
  }
  res.json({ ok: true, entry: returnRequests[idx] });
});

app.post('/api/admin/reset', (_req, res) => {
  shipments = structuredClone(SEED_SHIPMENTS);
  alerts = structuredClone(SEED_ALERTS);
  siteSettings = structuredClone(DEFAULT_SITE_SETTINGS);
  supportTickets = structuredClone(SEED_SUPPORT_TICKETS);
  broadcastSSE('reset', { shipments, alerts, settings: siteSettings, tickets: supportTickets });
  res.json({ ok: true, shipments, alerts, settings: siteSettings, tickets: supportTickets });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });

    app.get('/@vite/client', async (_req, res, next) => {
      try {
        const result = await vite.transformRequest('/@vite/client');
        if (!result) {
          next();
          return;
        }
        const safeCode = result.code.replace(
          /const transport = normalizeModuleRunnerTransport\(\(\(\) => \{[\s\S]*?\}\)\(\)\);/,
          'const transport = normalizeModuleRunnerTransport({ async connect() {}, async disconnect() {}, send() {} });'
        );
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.send(safeCode);
      } catch (err) {
        next(err);
      }
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Metro Parcel Service server listening on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
export { app };
