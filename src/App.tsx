import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BellRing, MessageSquare, RefreshCw, WifiOff, X } from 'lucide-react';
import type {
  GeofenceZone,
  LatLngPoint,
  OfflineQueuedAction,
  PageRoute,
  PushAlert,
  Shipment,
  SiteSettings,
  SupportReply,
  SupportTicket,
} from './types';
import {
  addMyTicketCode,
  enqueueOfflineAction,
  getOfflineQueue,
  loadCachedAlerts,
  loadCachedSettings,
  loadCachedShipments,
  loadCachedTickets,
  loadMyTicketCodes,
  saveCachedAlerts,
  saveCachedSettings,
  saveCachedShipments,
  saveCachedTickets,
  saveOfflineQueue,
} from './utils/offlineStore';
import {
  dispatchSystemPushNotification,
  getNotificationPermission,
  requestNotificationPermission,
  type NotificationPermissionState,
} from './utils/notifications';
import { distanceMeters, distanceToPolylineMeters } from './utils/geo';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AlertsDrawer } from './components/AlertsDrawer';
import { WhatsAppLiveChatWidget } from './components/WhatsAppLiveChatWidget';
import { HomePage } from './pages/HomePage';
import { TrackPage } from './pages/TrackPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ServicesPage } from './pages/ServicesPage';
import { BusinessPage } from './pages/BusinessPage';
import { AboutPage } from './pages/AboutPage';
import { HelpPage } from './pages/HelpPage';
import { ContactPage } from './pages/ContactPage';
import { AdminPage } from './pages/AdminPage';

function isAdminPortalPath(pathname: string): boolean {
  const clean = pathname.replace(/\/+$/, '');
  return clean === '/adminportal';
}

const ADMIN_TOKEN_STORAGE_KEY = 'metro_admin_token_v1';
const ADMIN_EMAIL_STORAGE_KEY = 'metro_admin_email_v1';

function parseUtcUpdatedMs(ts?: string): number {
  if (!ts) return 0;
  const trimmed = ts.trim();
  const isoCandidate = trimmed.includes('T')
    ? trimmed
    : `${trimmed.replace(' ', 'T')}Z`;
  const ms = Date.parse(isoCandidate);
  return Number.isFinite(ms) ? ms : 0;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageRoute>(() =>
    isAdminPortalPath(window.location.pathname) ? 'admin' : 'home'
  );
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [adminEmail, setAdminEmail] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(ADMIN_EMAIL_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [shipments, setShipments] = useState<Shipment[]>(() => loadCachedShipments());
  const [selectedTrackingNo, setSelectedTrackingNo] = useState<string>('');
  const [alerts, setAlerts] = useState<PushAlert[]>(() => loadCachedAlerts());
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => loadCachedSettings());
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(() => loadCachedTickets());
  const [myTicketCodes, setMyTicketCodes] = useState<string[]>(() => loadMyTicketCodes());
  const [activeToast, setActiveToast] = useState<PushAlert | null>(null);
  const [supportToast, setSupportToast] = useState<{
    ticketCode: string;
    senderName: string;
    text: string;
  } | null>(null);
  const [adminEmailToast, setAdminEmailToast] = useState<{
    ticketId: string;
    ticketCode: string;
    senderName: string;
    senderEmail: string;
    subject: string;
    text: string;
  } | null>(null);
  const [adminTicketFocus, setAdminTicketFocus] = useState<{
    ticketId: string;
    nonce: number;
  } | null>(null);
  const [alertsDrawerOpen, setAlertsDrawerOpen] = useState(false);

  const [simulatedOffline, setSimulatedOffline] = useState(false);
  const isOnline = useOnlineStatus(simulatedOffline);
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueuedAction[]>(() => getOfflineQueue());
  const [syncing, setSyncing] = useState(false);

  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionState>(() =>
    getNotificationPermission()
  );

  const currentPageRef = React.useRef(currentPage);
  currentPageRef.current = currentPage;
  const adminTokenRef = React.useRef(adminToken);
  adminTokenRef.current = adminToken;
  const selectedTrackingNoRef = React.useRef(selectedTrackingNo);
  selectedTrackingNoRef.current = selectedTrackingNo;
  const myTicketCodesRef = React.useRef(myTicketCodes);
  myTicketCodesRef.current = myTicketCodes;

  const handleAdminAuthenticated = useCallback((token: string, email: string) => {
    try {
      sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
      sessionStorage.setItem(ADMIN_EMAIL_STORAGE_KEY, email);
    } catch {
      // Ignore storage restrictions
    }
    setAdminToken(token);
    setAdminEmail(email);
  }, []);

  const handleAdminLogout = useCallback(() => {
    try {
      sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(ADMIN_EMAIL_STORAGE_KEY);
    } catch {
      // Ignore storage restrictions
    }
    setAdminToken(null);
    setAdminEmail(null);
  }, []);

  // Listen for Google Maps Platform quota events (Tier 1 & 2 defense)
  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  // Persist shipments, alerts, site settings, and support tickets locally for offline mode
  useEffect(() => {
    saveCachedShipments(shipments);
  }, [shipments]);

  useEffect(() => {
    saveCachedAlerts(alerts);
  }, [alerts]);

  useEffect(() => {
    saveCachedSettings(siteSettings);
  }, [siteSettings]);

  useEffect(() => {
    saveCachedTickets(supportTickets);
  }, [supportTickets]);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPage((prev) => {
        if (isAdminPortalPath(window.location.pathname)) {
          return 'admin';
        }
        return prev === 'admin' ? 'home' : prev;
      });
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((page: PageRoute) => {
    const targetPath = page === 'admin' ? '/adminportal' : '/';
    const onAdminPath = isAdminPortalPath(window.location.pathname);
    if ((page === 'admin' && !onAdminPath) || (page !== 'admin' && onAdminPath)) {
      window.history.pushState({}, '', targetPath);
    }
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const upsertTicket = useCallback((incoming: SupportTicket) => {
    setSupportTickets((prev) => {
      const idx = prev.findIndex(
        (t) => t.id === incoming.id || t.ticketCode.toUpperCase() === incoming.ticketCode.toUpperCase()
      );
      if (idx === -1) {
        return [incoming, ...prev];
      }
      const existing = prev[idx];
      // Merge replies idempotently preserving any unique reply ids
      const seenReplyIds = new Set(incoming.replies.map((r) => r.id));
      const mergedReplies = [
        ...incoming.replies,
        ...existing.replies.filter((r) => !seenReplyIds.has(r.id)),
      ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

      const updated: SupportTicket = {
        ...incoming,
        replies: mergedReplies,
      };
      const next = [...prev];
      next[idx] = updated;
      return next;
    });
  }, []);

  const triggerAlerts = useCallback((newAlerts: PushAlert[]) => {
    if (newAlerts.length === 0) return;
    setAlerts((prev) => {
      const existingIds = new Set(prev.map((a) => a.id));
      const unique = newAlerts.filter((a) => !existingIds.has(a.id));
      return [...unique, ...prev].slice(0, 50);
    });
    const isAdminView = currentPageRef.current === 'admin' && Boolean(adminTokenRef.current);
    const trackedMatch = selectedTrackingNoRef.current.trim().toUpperCase();
    const visibleMatches = isAdminView
      ? newAlerts
      : trackedMatch
        ? newAlerts.filter((a) => a.trackingNo.toUpperCase() === trackedMatch)
        : [];
    if (visibleMatches.length === 0) return;
    const latest = visibleMatches[0];
    setActiveToast(latest);
    dispatchSystemPushNotification(latest.title, latest.message, latest.id);
    setTimeout(() => {
      setActiveToast((curr) => (curr?.id === latest.id ? null : curr));
    }, 6000);
  }, []);

  // Initial sync + real-time SSE stream when online (stays connected across route changes)
  useEffect(() => {
    if (!isOnline) return;

    let cancelled = false;

    fetch('/api/shipments')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.ok) return;
        if (Array.isArray(data.shipments) && data.shipments.length > 0) {
          setShipments((prev) => {
            const prevMap = new Map(prev.map((s) => [s.tracking_no.toUpperCase(), s]));
            const mergedServer = (data.shipments as Shipment[]).map((srv) => {
              const local = prevMap.get(srv.tracking_no.toUpperCase());
              if (local && parseUtcUpdatedMs(local.updated_at) > parseUtcUpdatedMs(srv.updated_at)) {
                return local;
              }
              return srv;
            });
            const serverIds = new Set(
              (data.shipments as Shipment[]).map((s) => s.tracking_no.toUpperCase())
            );
            const localOnly = prev.filter((s) => !serverIds.has(s.tracking_no.toUpperCase()));
            return [...localOnly, ...mergedServer];
          });
        }
      })
      .catch(() => {
        // Fallback silently to cached shipments
      });

    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.ok && data.settings) {
          setSiteSettings(data.settings as SiteSettings);
        }
      })
      .catch(() => {
        // Retain cached settings
      });

    // Hydrate visitor's own tickets by code
    const savedCodes = loadMyTicketCodes();
    savedCodes.forEach((code) => {
      fetch(`/api/tickets/${encodeURIComponent(code)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!cancelled && data?.ok && data.ticket) {
            upsertTicket(data.ticket as SupportTicket);
          }
        })
        .catch(() => {
          // Retain local copy
        });
    });

    const sse = new EventSource('/api/stream/tracking');
    sse.addEventListener('position', (ev) => {
      try {
        const parsed = JSON.parse((ev as MessageEvent).data) as {
          shipment: Shipment;
          newAlerts?: PushAlert[];
        };
        setShipments((prev) =>
          prev.map((s) => (s.tracking_no === parsed.shipment.tracking_no ? parsed.shipment : s))
        );
        if (parsed.newAlerts && parsed.newAlerts.length > 0) {
          triggerAlerts(parsed.newAlerts);
        }
      } catch {
        // Ignore malformed SSE payload
      }
    });

    sse.addEventListener('geofences', (ev) => {
      try {
        const parsed = JSON.parse((ev as MessageEvent).data) as {
          trackingNo: string;
          geofences: GeofenceZone[];
        };
        setShipments((prev) =>
          prev.map((s) =>
            s.tracking_no === parsed.trackingNo ? { ...s, geofences: parsed.geofences } : s
          )
        );
      } catch {
        // Ignore
      }
    });

    sse.addEventListener('shipment_created', (ev) => {
      try {
        const parsed = JSON.parse((ev as MessageEvent).data) as {
          shipment: Shipment;
          alert?: PushAlert;
        };
        setShipments((prev) =>
          prev.some((s) => s.tracking_no === parsed.shipment.tracking_no)
            ? prev
            : [parsed.shipment, ...prev]
        );
        if (parsed.alert) triggerAlerts([parsed.alert]);
      } catch {
        // Ignore
      }
    });

    sse.addEventListener('shipment_updated', (ev) => {
      try {
        const parsed = JSON.parse((ev as MessageEvent).data) as {
          shipment: Shipment;
          alert?: PushAlert;
        };
        setShipments((prev) =>
          prev.map((s) => (s.tracking_no === parsed.shipment.tracking_no ? parsed.shipment : s))
        );
        if (parsed.alert) triggerAlerts([parsed.alert]);
      } catch {
        // Ignore
      }
    });

    sse.addEventListener('shipment_deleted', (ev) => {
      try {
        const parsed = JSON.parse((ev as MessageEvent).data) as { trackingNo: string };
        setShipments((prev) => prev.filter((s) => s.tracking_no !== parsed.trackingNo));
      } catch {
        // Ignore
      }
    });

    sse.addEventListener('alert', (ev) => {
      try {
        const parsed = JSON.parse((ev as MessageEvent).data) as { alert: PushAlert };
        if (parsed.alert) triggerAlerts([parsed.alert]);
      } catch {
        // Ignore
      }
    });

    sse.addEventListener('settings_updated', (ev) => {
      try {
        const parsed = JSON.parse((ev as MessageEvent).data) as { settings: SiteSettings };
        if (parsed.settings) {
          setSiteSettings(parsed.settings);
        }
      } catch {
        // Ignore
      }
    });

    sse.addEventListener('ticket_created', (ev) => {
      try {
        const parsed = JSON.parse((ev as MessageEvent).data) as { ticket: SupportTicket };
        if (!parsed.ticket) return;
        const codeUpper = parsed.ticket.ticketCode.toUpperCase();
        const owned =
          myTicketCodesRef.current.includes(codeUpper) || loadMyTicketCodes().includes(codeUpper);
        const isAdminActive = currentPageRef.current === 'admin' && Boolean(adminTokenRef.current);
        if (isAdminActive || owned) {
          upsertTicket(parsed.ticket);
        }
        if (isAdminActive) {
          const firstReply = parsed.ticket.replies[0]?.text || parsed.ticket.subject;
          setAdminEmailToast({
            ticketId: parsed.ticket.id,
            ticketCode: parsed.ticket.ticketCode,
            senderName: parsed.ticket.name,
            senderEmail: parsed.ticket.email,
            subject: parsed.ticket.subject,
            text: firstReply,
          });
          dispatchSystemPushNotification(
            `New Email from ${parsed.ticket.name}`,
            `${parsed.ticket.subject}: ${firstReply}`,
            `adm-email-${parsed.ticket.id}`
          );
          setTimeout(() => {
            setAdminEmailToast((curr) => (curr?.ticketId === parsed.ticket.id ? null : curr));
          }, 8000);
        }
      } catch {
        // Ignore
      }
    });

    sse.addEventListener('ticket_reply', (ev) => {
      try {
        const parsed = JSON.parse((ev as MessageEvent).data) as {
          ticket: SupportTicket;
          reply: SupportReply;
        };
        if (!parsed.ticket) return;
        const codeUpper = parsed.ticket.ticketCode.toUpperCase();
        const owned =
          myTicketCodesRef.current.includes(codeUpper) || loadMyTicketCodes().includes(codeUpper);
        const isAdminActive = currentPageRef.current === 'admin' && Boolean(adminTokenRef.current);
        if (isAdminActive || owned) {
          upsertTicket(parsed.ticket);
        }
        if (isAdminActive && parsed.reply?.senderRole === 'visitor') {
          setAdminEmailToast({
            ticketId: parsed.ticket.id,
            ticketCode: parsed.ticket.ticketCode,
            senderName: parsed.reply.senderName || parsed.ticket.name,
            senderEmail: parsed.ticket.email,
            subject: parsed.ticket.subject,
            text: parsed.reply.text,
          });
          dispatchSystemPushNotification(
            `Reply from ${parsed.reply.senderName || parsed.ticket.name}`,
            parsed.reply.text,
            `adm-rep-${parsed.reply.id}`
          );
          setTimeout(() => {
            setAdminEmailToast((curr) =>
              curr?.ticketCode === parsed.ticket.ticketCode && curr?.text === parsed.reply.text
                ? null
                : curr
            );
          }, 8000);
        } else if (parsed.reply?.senderRole === 'admin' && owned && currentPageRef.current !== 'admin') {
          setSupportToast({
            ticketCode: parsed.ticket.ticketCode,
            senderName: parsed.reply.senderName,
            text: parsed.reply.text,
          });
          dispatchSystemPushNotification(
            `Reply from ${siteSettings.contact.email}`,
            parsed.reply.text,
            `vis-rep-${parsed.reply.id}`
          );
          setTimeout(() => {
            setSupportToast((curr) =>
              curr?.ticketCode === parsed.ticket.ticketCode && curr?.text === parsed.reply.text
                ? null
                : curr
            );
          }, 8000);
        }
      } catch {
        // Ignore
      }
    });

    sse.addEventListener('ticket_updated', (ev) => {
      try {
        const parsed = JSON.parse((ev as MessageEvent).data) as { ticket: SupportTicket };
        if (!parsed.ticket) return;
        const codeUpper = parsed.ticket.ticketCode.toUpperCase();
        const owned =
          myTicketCodesRef.current.includes(codeUpper) || loadMyTicketCodes().includes(codeUpper);
        if ((currentPageRef.current === 'admin' && Boolean(adminTokenRef.current)) || owned) {
          upsertTicket(parsed.ticket);
        }
      } catch {
        // Ignore
      }
    });

    sse.addEventListener('reset', (ev) => {
      try {
        const parsed = JSON.parse((ev as MessageEvent).data) as {
          shipments: Shipment[];
          alerts: PushAlert[];
          settings?: SiteSettings;
          tickets?: SupportTicket[];
        };
        if (Array.isArray(parsed.shipments)) setShipments(parsed.shipments);
        if (Array.isArray(parsed.alerts)) setAlerts(parsed.alerts);
        if (parsed.settings) setSiteSettings(parsed.settings);
        if (Array.isArray(parsed.tickets) && currentPageRef.current === 'admin' && Boolean(adminTokenRef.current)) {
          setSupportTickets(parsed.tickets);
        }
      } catch {
        // Ignore
      }
    });

    return () => {
      cancelled = true;
      sse.close();
    };
  }, [isOnline, siteSettings.contact.email, triggerAlerts, upsertTicket]);

  // Real-time 2-second sync safety net for active Contact or Admin Inbox sessions (complements 0ms SSE)
  useEffect(() => {
    if (!isOnline) return;
    const isAdminActive = currentPage === 'admin' && Boolean(adminToken);
    const isContactActive = currentPage === 'contact';
    if (!isAdminActive && !isContactActive) return;

    let cancelled = false;
    const syncActiveTickets = async () => {
      if (cancelled) return;
      if (isAdminActive && adminTokenRef.current) {
        const reqToken = adminTokenRef.current;
        try {
          const res = await fetch('/api/admin/tickets', {
            cache: 'no-store',
            credentials: 'include',
            headers: {
              Authorization: `Bearer ${reqToken}`,
              'X-Admin-Token': reqToken,
            },
          });
          if (!cancelled && res.ok) {
            const data = await res.json();
            if (Array.isArray(data.tickets)) {
              (data.tickets as SupportTicket[]).forEach((t) => upsertTicket(t));
            }
          }
        } catch {
          // Ignore transient polling failure
        }
      } else if (isContactActive) {
        const codes = Array.from(
          new Set([...myTicketCodesRef.current, ...loadMyTicketCodes()].map((c) => c.toUpperCase()))
        ).filter(Boolean);
        if (codes.length === 0) return;
        try {
          const res = await fetch(`/api/tickets/batch?codes=${encodeURIComponent(codes.join(','))}`);
          if (!cancelled && res.ok) {
            const data = await res.json();
            if (Array.isArray(data.tickets)) {
              (data.tickets as SupportTicket[]).forEach((t) => upsertTicket(t));
            }
          }
        } catch {
          // Ignore transient polling failure
        }
      }
    };

    syncActiveTickets();
    const timer = window.setInterval(syncActiveTickets, 2000);
    window.addEventListener('focus', syncActiveTickets);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', syncActiveTickets);
    };
  }, [adminToken, currentPage, isOnline, upsertTicket]);

  // Flush queued offline actions automatically when back online
  const syncOfflineQueue = useCallback(async () => {
    const queue = getOfflineQueue();
    if (!isOnline || queue.length === 0 || syncing) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken
            ? { Authorization: `Bearer ${adminToken}`, 'X-Admin-Token': adminToken }
            : {}),
        },
        body: JSON.stringify({ actions: queue }),
      });
      if (res.ok) {
        saveOfflineQueue([]);
        setOfflineQueue([]);
      }
    } catch {
      // Retain queue for next online window
    } finally {
      setSyncing(false);
    }
  }, [adminToken, isOnline, syncing]);

  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      syncOfflineQueue();
    }
  }, [isOnline, offlineQueue.length, syncOfflineQueue]);

  // Update GPS Position (evaluates locally immediately + syncs to server or offline queue)
  const handleUpdatePosition = useCallback(
    async (
      trackingNo: string,
      coords: LatLngPoint & {
        location?: string;
        speedKmh?: number;
        headingDeg?: number;
        progress?: number;
      },
      deviationThresholdMeters: number
    ) => {
      if (isOnline) {
        const reqToken = adminTokenRef.current;
        try {
          const res = await fetch(`/api/shipments/${encodeURIComponent(trackingNo)}/position`, {
            method: 'POST',
            cache: 'no-store',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              ...(reqToken
                ? { Authorization: `Bearer ${reqToken}`, 'X-Admin-Token': reqToken }
                : {}),
            },
            body: JSON.stringify({ ...coords, deviationThresholdMeters }),
          });
          if (res.status === 401) {
            if (!reqToken || reqToken === adminTokenRef.current) {
              handleAdminLogout();
            }
            return;
          }
          if (res.ok) {
            const data = await res.json();
            if (data.shipment) {
              setShipments((prev) =>
                prev.map((s) => (s.tracking_no === data.shipment.tracking_no ? data.shipment : s))
              );
            }
            if (Array.isArray(data.newAlerts) && data.newAlerts.length > 0) {
              triggerAlerts(data.newAlerts);
            }
            return;
          }
        } catch {
          // Fall through to offline local evaluation
        }
      }

      const shortTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const newAlerts: PushAlert[] = [];

      setShipments((prev) =>
        prev.map((s) => {
          if (s.tracking_no !== trackingNo) return s;

          const updatedGeofences = s.geofences.map((gf) => {
            if (!gf.active) return gf;
            const d = distanceMeters(coords, gf);
            if (d <= gf.radiusMeters && !gf.triggered) {
              newAlerts.push({
                id: `al-off-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                trackingNo: s.tracking_no,
                type: gf.type === 'destination' ? 'arrival' : 'geofence_enter',
                title:
                  gf.type === 'destination'
                    ? `Driver Arrived at ${gf.name}`
                    : `Entered ${gf.name} Geofence`,
                message: `${s.courier.name} entered ${(gf.radiusMeters / 1000).toFixed(1)} km zone (Offline cached).`,
                timestamp: `Today, ${shortTime}`,
                read: false,
                lat: coords.lat,
                lng: coords.lng,
              });
              return { ...gf, triggered: true };
            }
            return gf;
          });

          const corridorDist = distanceToPolylineMeters(coords, s.routeWaypoints);
          let nextStatus = s.status;
          if (corridorDist > deviationThresholdMeters && s.status !== 'Delivered') {
            nextStatus = 'Route Deviation';
            newAlerts.push({
              id: `al-dev-off-${Date.now()}`,
              trackingNo: s.tracking_no,
              type: 'deviation',
              title: `Route Deviation Alert · ${s.tracking_no}`,
              message: `Deviated ${(corridorDist / 1000).toFixed(1)} km from corridor (Offline cached).`,
              timestamp: `Today, ${shortTime}`,
              read: false,
              lat: coords.lat,
              lng: coords.lng,
            });
          } else if (updatedGeofences.some((g) => g.type === 'destination' && g.triggered)) {
            nextStatus = 'Delivered';
          }

          return {
            ...s,
            status: nextStatus,
            progress: coords.progress ?? s.progress,
            current: {
              lat: coords.lat,
              lng: coords.lng,
              location: coords.location || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`,
              speedKmh: coords.speedKmh ?? s.current.speedKmh,
              headingDeg: coords.headingDeg ?? s.current.headingDeg,
            },
            geofences: updatedGeofences,
            routeWaypoints: [
              ...s.routeWaypoints,
              {
                lat: coords.lat,
                lng: coords.lng,
                timestamp: `Offline ${shortTime}`,
                speedKmh: coords.speedKmh ?? 64,
                headingDeg: coords.headingDeg ?? 0,
                label: coords.location || 'Offline GPS Checkpoint',
              },
            ],
          };
        })
      );

      if (newAlerts.length > 0) triggerAlerts(newAlerts);
      setOfflineQueue(enqueueOfflineAction('gps_update', { trackingNo, coords }));
    },
    [adminToken, handleAdminLogout, isOnline, triggerAlerts]
  );

  const handleUpdateGeofences = useCallback(
    async (trackingNo: string, geofences: GeofenceZone[]) => {
      if (isOnline) {
        const reqToken = adminTokenRef.current;
        try {
          const res = await fetch(`/api/geofences/${encodeURIComponent(trackingNo)}`, {
            method: 'PUT',
            cache: 'no-store',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              ...(reqToken
                ? { Authorization: `Bearer ${reqToken}`, 'X-Admin-Token': reqToken }
                : {}),
            },
            body: JSON.stringify({ geofences }),
          });
          if (res.status === 401) {
            if (!reqToken || reqToken === adminTokenRef.current) {
              handleAdminLogout();
            }
            return;
          }
          setShipments((prev) =>
            prev.map((s) => (s.tracking_no === trackingNo ? { ...s, geofences } : s))
          );
          return;
        } catch {
          // Queue offline
        }
      }
      setShipments((prev) =>
        prev.map((s) => (s.tracking_no === trackingNo ? { ...s, geofences } : s))
      );
      setOfflineQueue(enqueueOfflineAction('geofence_update', { trackingNo, geofences }));
    },
    [adminToken, handleAdminLogout, isOnline]
  );

  const handleSubmitTicket = useCallback(
    async (payload: {
      name: string;
      email: string;
      subject: string;
      message: string;
      trackingNo?: string;
      category?: SupportTicket['category'];
      priority?: SupportTicket['priority'];
    }): Promise<{ queuedOffline: boolean; ticket: SupportTicket }> => {
      if (isOnline) {
        let res: Response | null = null;
        try {
          res = await fetch('/api/tickets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } catch {
          res = null;
        }
        if (res) {
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.ticket) {
            const t = data.ticket as SupportTicket;
            setMyTicketCodes(addMyTicketCode(t.ticketCode));
            upsertTicket(t);
            return { queuedOffline: false, ticket: t };
          }
          if (res.status >= 400 && res.status < 500) {
            throw new Error(data.error || 'Could not send email. Please check your details.');
          }
        }
      }

      const now = new Date().toISOString();
      const randCode = `TKT-${Math.floor(1000 + Math.random() * 8999)}`;
      const offlineTicket: SupportTicket = {
        id: `tkt-off-${Date.now()}`,
        ticketCode: randCode,
        name: payload.name,
        email: payload.email,
        trackingNo: payload.trackingNo?.trim().toUpperCase() || undefined,
        category: payload.category || 'General',
        priority: payload.priority || 'Normal',
        subject: payload.subject || 'Support Request',
        status: 'open',
        createdAt: now,
        updatedAt: now,
        replies: [
          {
            id: `rep-off-${Date.now()}`,
            senderRole: 'visitor',
            senderName: payload.name,
            text: payload.message,
            createdAt: now,
          },
        ],
      };
      setMyTicketCodes(addMyTicketCode(offlineTicket.ticketCode));
      upsertTicket(offlineTicket);
      setOfflineQueue(enqueueOfflineAction('contact', payload));
      return { queuedOffline: true, ticket: offlineTicket };
    },
    [isOnline, upsertTicket]
  );

  const handleReplyTicket = useCallback(
    async (
      ticketIdOrCode: string,
      payload: { senderRole: 'visitor' | 'admin'; senderName: string; text: string }
    ): Promise<{ ok: boolean; ticket?: SupportTicket; error?: string }> => {
      if (isOnline) {
        const reqToken = adminTokenRef.current;
        let res: Response | null = null;
        try {
          res = await fetch(`/api/tickets/${encodeURIComponent(ticketIdOrCode)}/replies`, {
            method: 'POST',
            cache: 'no-store',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              ...(payload.senderRole === 'admin' && reqToken
                ? { Authorization: `Bearer ${reqToken}`, 'X-Admin-Token': reqToken }
                : {}),
            },
            body: JSON.stringify(payload),
          });
        } catch {
          res = null;
        }
        if (res) {
          if (res.status === 401 && payload.senderRole === 'admin') {
            if (!reqToken || reqToken === adminTokenRef.current) {
              handleAdminLogout();
            }
            return { ok: false, error: 'Admin session expired. Please sign in again.' };
          }
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.ticket) {
            upsertTicket(data.ticket as SupportTicket);
            return { ok: true, ticket: data.ticket as SupportTicket };
          }
          return { ok: false, error: data.error || 'Could not deliver reply.' };
        }
      }

      const now = new Date().toISOString();
      const localReply: SupportReply = {
        id: `rep-loc-${Date.now()}`,
        senderRole: payload.senderRole,
        senderName: payload.senderName,
        text: payload.text,
        createdAt: now,
      };
      setSupportTickets((prev) =>
        prev.map((t) =>
          t.id === ticketIdOrCode || t.ticketCode.toUpperCase() === ticketIdOrCode.toUpperCase()
            ? {
                ...t,
                status:
                  payload.senderRole === 'admin' && t.status === 'open'
                    ? 'in_progress'
                    : payload.senderRole === 'visitor' && t.status === 'resolved'
                    ? 'open'
                    : t.status,
                updatedAt: now,
                replies: [...t.replies, localReply],
              }
            : t
        )
      );
      setOfflineQueue(
        enqueueOfflineAction('ticket_reply', {
          ticketId: ticketIdOrCode,
          ticketCode: ticketIdOrCode,
          ...payload,
        })
      );
      return { ok: true };
    },
    [adminToken, handleAdminLogout, isOnline, upsertTicket]
  );

  const handleLookupTicketByCode = useCallback(
    async (ticketCode: string): Promise<SupportTicket | null> => {
      const clean = ticketCode.trim().toUpperCase();
      if (!clean) return null;
      if (isOnline) {
        try {
          const res = await fetch(`/api/tickets/${encodeURIComponent(clean)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.ticket) {
              const found = data.ticket as SupportTicket;
              setMyTicketCodes(addMyTicketCode(found.ticketCode));
              upsertTicket(found);
              return found;
            }
          }
        } catch {
          // fallback below
        }
      }
      const localMatch =
        supportTickets.find((t) => t.ticketCode.toUpperCase() === clean) || null;
      if (localMatch) {
        setMyTicketCodes(addMyTicketCode(localMatch.ticketCode));
      }
      return localMatch;
    },
    [isOnline, supportTickets, upsertTicket]
  );

  const handleUpdateTicketStatus = useCallback(
    async (
      ticketId: string,
      status: SupportTicket['status']
    ): Promise<{ ok: boolean; ticket?: SupportTicket }> => {
      if (isOnline) {
        const reqToken = adminTokenRef.current;
        try {
          const res = await fetch(`/api/admin/tickets/${encodeURIComponent(ticketId)}`, {
            method: 'PATCH',
            cache: 'no-store',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              ...(reqToken
                ? { Authorization: `Bearer ${reqToken}`, 'X-Admin-Token': reqToken }
                : {}),
            },
            body: JSON.stringify({ status }),
          });
          if (res.status === 401) {
            if (!reqToken || reqToken === adminTokenRef.current) {
              handleAdminLogout();
            }
            return { ok: false };
          }
          if (res.ok) {
            const data = await res.json();
            if (data.ticket) {
              const updated = data.ticket as SupportTicket;
              upsertTicket(updated);
              return { ok: true, ticket: updated };
            }
          }
        } catch {
          // keep local status
        }
      }
      setSupportTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId ? { ...t, status, updatedAt: new Date().toISOString() } : t
        )
      );
      return { ok: true };
    },
    [adminToken, handleAdminLogout, isOnline, upsertTicket]
  );

  const handleUpdateSiteSettings = useCallback(
    async (nextSettings: SiteSettings): Promise<{ ok: boolean; error?: string }> => {
      if (isOnline) {
        const reqToken = adminTokenRef.current;
        try {
          const res = await fetch('/api/admin/settings', {
            method: 'PUT',
            cache: 'no-store',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              ...(reqToken
                ? { Authorization: `Bearer ${reqToken}`, 'X-Admin-Token': reqToken }
                : {}),
            },
            body: JSON.stringify(nextSettings),
          });
          if (res.status === 401) {
            if (!reqToken || reqToken === adminTokenRef.current) {
              handleAdminLogout();
            }
            return { ok: false, error: 'Admin session expired. Please sign in again.' };
          }
          const data = await res.json();
          if (res.ok && data.settings) {
            setSiteSettings(data.settings as SiteSettings);
            return { ok: true };
          }
          return { ok: false, error: data.error || 'Could not save settings' };
        } catch {
          // fall through to local save
        }
      }
      setSiteSettings(nextSettings);
      return { ok: true };
    },
    [adminToken, handleAdminLogout, isOnline]
  );

  const handleLookupShipment = useCallback(
    async (code: string): Promise<Shipment | null> => {
      const clean = code.trim().toUpperCase();
      if (!clean) return null;
      if (isOnline) {
        try {
          const res = await fetch(`/api/shipments/${encodeURIComponent(clean)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.shipment) {
              const found = data.shipment as Shipment;
              let resolved: Shipment = found;
              setShipments((prev) => {
                const idx = prev.findIndex(
                  (s) => s.tracking_no.toUpperCase() === found.tracking_no.toUpperCase()
                );
                if (idx === -1) return [found, ...prev];
                const existing = prev[idx];
                if (parseUtcUpdatedMs(existing.updated_at) > parseUtcUpdatedMs(found.updated_at)) {
                  resolved = existing;
                  return prev;
                }
                const next = [...prev];
                next[idx] = found;
                return next;
              });
              return resolved;
            }
          }
        } catch {
          // Fall back to cached shipments below
        }
      }
      return (
        shipments.find(
          (s) =>
            s.tracking_no.toUpperCase() === clean || s.receipt_no.toUpperCase() === clean
        ) || null
      );
    },
    [isOnline, shipments]
  );

  const handleRequestNotifications = async () => {
    const status = await requestNotificationPermission();
    setNotificationPermission(status);
    if (status === 'granted') {
      dispatchSystemPushNotification(
        'Metro Parcel Service Push Alerts Enabled',
        'You will now receive driver arrivals, route updates, and geofence deviation alerts.'
      );
    }
  };

  const visitorTickets = useMemo(() => {
    const codeSet = new Set(myTicketCodes.map((c) => c.toUpperCase()));
    return supportTickets.filter((t) => codeSet.has(t.ticketCode.toUpperCase()));
  }, [supportTickets, myTicketCodes]);

  const isAdminRoute = currentPage === 'admin';
  const isAdminView = isAdminRoute && Boolean(adminToken);
  const normalizedTracked = selectedTrackingNo.trim().toUpperCase();
  const unreadCount = (
    isAdminView
      ? alerts
      : normalizedTracked
        ? alerts.filter((a) => a.trackingNo.toUpperCase() === normalizedTracked)
        : []
  ).filter((a) => !a.read).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#f2f2f2] text-[#1d1d1f]">
      {/* Google Maps Platform Quota Banner (Demo Key Defense) */}
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm no-print">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account. (Offline vector maps remain active.)
          </span>
        </div>
      )}

      {/* Non-Intrusive Offline Mode Strip */}
      {!isOnline && (
        <div className="bg-[#3C2B02] text-[#CD9E34] px-4 py-2 text-xs font-bold flex items-center justify-center gap-3 no-print">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>
            Offline Mode Active — Cached routes, receipts & vector maps available.{' '}
            {offlineQueue.length > 0 ? `(${offlineQueue.length} queued for sync)` : ''}
          </span>
          {simulatedOffline && (
            <button
              type="button"
              onClick={() => setSimulatedOffline(false)}
              className="underline text-white hover:text-[#CD9E34] cursor-pointer"
            >
              Restore Online
            </button>
          )}
        </div>
      )}

      {/* Pending Offline Sync Banner when returning online */}
      {isOnline && offlineQueue.length > 0 && (
        <div className="bg-[#1B6CFF] text-white px-4 py-2 text-xs font-bold flex items-center justify-center gap-3 no-print">
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          <span>{offlineQueue.length} offline action(s) ready to sync</span>
          <button
            type="button"
            onClick={syncOfflineQueue}
            className="underline cursor-pointer"
          >
            Sync now
          </button>
        </div>
      )}

      {!isAdminRoute && (
        <Navbar
          currentPage={currentPage}
          onNavigate={navigate}
          unreadAlertsCount={unreadCount}
          onOpenAlerts={() => setAlertsDrawerOpen(true)}
          isOnline={isOnline}
          offlineQueueCount={offlineQueue.length}
        />
      )}

      <main className="flex-1">
        {currentPage === 'home' && (
          <HomePage
            shipments={shipments}
            faqs={siteSettings.help.faqs}
            onNavigate={navigate}
            onTrackShipment={(id) => {
              setSelectedTrackingNo(id);
              navigate('track');
            }}
          />
        )}

        {currentPage === 'track' && (
          <TrackPage
            shipments={shipments}
            selectedTrackingNo={selectedTrackingNo}
            onSelectTracking={setSelectedTrackingNo}
            onLookupShipment={handleLookupShipment}
            onOpenPlayback={(id) => {
              setSelectedTrackingNo(id);
              navigate('analytics');
            }}
            alerts={alerts}
            isOnline={isOnline}
            quotaExceeded={quotaExceeded}
            supportEmail={siteSettings.contact.email}
            contactSettings={siteSettings.contact}
            isAdminAuthenticated={Boolean(adminToken)}
            onBackToAdmin={() => navigate('admin')}
          />
        )}

        {currentPage === 'analytics' && (
          <AnalyticsPage
            shipments={shipments}
            selectedTrackingNo={selectedTrackingNo}
            onSelectTracking={setSelectedTrackingNo}
            isOnline={isOnline}
            quotaExceeded={quotaExceeded}
          />
        )}

        {currentPage === 'services' && <ServicesPage onNavigate={navigate} />}

        {currentPage === 'business' && <BusinessPage onNavigate={navigate} />}
        {currentPage === 'about' && (
          <AboutPage aboutSettings={siteSettings.about} onNavigate={navigate} />
        )}
        {currentPage === 'help' && (
          <HelpPage
            helpSettings={siteSettings.help}
            whatsappNumber={siteSettings.contact.whatsapp}
            onNavigate={navigate}
          />
        )}
        {currentPage === 'contact' && (
          <ContactPage
            contactSettings={siteSettings.contact}
            tickets={visitorTickets}
            isOnline={isOnline}
            onSubmitTicket={handleSubmitTicket}
            onReplyTicket={handleReplyTicket}
            onLookupTicket={handleLookupTicketByCode}
          />
        )}
        {currentPage === 'admin' && (
          <AdminPage
            adminToken={adminToken}
            adminEmail={adminEmail}
            onAdminAuthenticated={handleAdminAuthenticated}
            onAdminLogout={handleAdminLogout}
            shipments={shipments}
            alerts={alerts}
            selectedTrackingNo={selectedTrackingNo}
            onSelectTracking={setSelectedTrackingNo}
            onNavigate={navigate}
            isOnline={isOnline}
            simulatedOffline={simulatedOffline}
            onToggleSimulatedOffline={() => setSimulatedOffline((v) => !v)}
            offlineQueue={offlineQueue}
            onSyncNow={syncOfflineQueue}
            quotaExceeded={quotaExceeded}
            notificationPermission={notificationPermission}
            onRequestNotifications={handleRequestNotifications}
            onUpdatePosition={handleUpdatePosition}
            onUpdateGeofences={handleUpdateGeofences}
            onMarkAllAlertsRead={() => setAlerts((prev) => prev.map((a) => ({ ...a, read: true })))}
            onAdminShipmentsChange={setShipments}
            onAdminAlertsChange={setAlerts}
            onTriggerAlert={(al) => triggerAlerts([al])}
            siteSettings={siteSettings}
            onUpdateSiteSettings={handleUpdateSiteSettings}
            supportTickets={supportTickets}
            onTicketsSync={setSupportTickets}
            onReplyTicket={handleReplyTicket}
            onUpdateTicketStatus={handleUpdateTicketStatus}
            openTicketFocus={adminTicketFocus}
          />
        )}
      </main>

      {!isAdminRoute && <Footer contactSettings={siteSettings.contact} onNavigate={navigate} />}

      {!isAdminRoute && (
        <WhatsAppLiveChatWidget
          whatsappNumber={siteSettings.contact.whatsapp}
          selectedTrackingNo={selectedTrackingNo}
        />
      )}

      {/* Real-Time Incoming Email Toast for Admin Portal */}
      {isAdminView && adminEmailToast && (
        <div
          role="status"
          className="fixed bottom-6 left-4 right-4 sm:right-auto sm:w-[420px] z-50 bg-[#3C2B02] text-[#F2E9D4] border-2 border-[#CD9E34] shadow-[6px_6px_0_#1E1501] p-4 flex items-start gap-3 no-print"
        >
          <MessageSquare className="w-5 h-5 text-[#CD9E34] shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-extrabold text-[#CD9E34]">
              New Email to {siteSettings.contact.email} · {adminEmailToast.ticketCode}
            </p>
            <p className="text-xs font-bold text-white mt-0.5 truncate">
              From: {adminEmailToast.senderName} ({adminEmailToast.senderEmail})
            </p>
            <p className="text-xs text-[#F2E9D4]/90 mt-1 line-clamp-2">{adminEmailToast.text}</p>
            <button
              type="button"
              onClick={() => {
                setAdminTicketFocus({
                  ticketId: adminEmailToast.ticketId,
                  nonce: Date.now(),
                });
                setAdminEmailToast(null);
              }}
              className="mt-2 text-[11px] font-extrabold text-[#CD9E34] underline cursor-pointer"
            >
              Open Inbox &amp; Reply Now →
            </button>
          </div>
          <button
            type="button"
            onClick={() => setAdminEmailToast(null)}
            aria-label="Dismiss incoming email alert"
            className="text-neutral-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Real-Time Support Reply Notification Toast for Visitors */}
      {supportToast && (
        <div
          role="status"
          className="fixed bottom-16 lg:bottom-6 left-4 right-4 sm:right-auto sm:w-96 z-50 bg-white text-[#1d1d1f] border-2 border-[#3C2B02] shadow-[6px_6px_0_#9D7110] p-4 flex items-start gap-3 no-print"
        >
          <MessageSquare className="w-5 h-5 text-[#1B6CFF] shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-extrabold text-[#1d1d1f]">
              Reply from {siteSettings.contact.email} · {supportToast.ticketCode}
            </p>
            <p className="text-xs text-[#6b6b70] mt-1 line-clamp-2">
              {supportToast.senderName}: {supportToast.text}
            </p>
            <button
              type="button"
              onClick={() => {
                setSupportToast(null);
                navigate('contact');
              }}
              className="mt-2 text-[11px] font-extrabold text-[#1B6CFF] underline cursor-pointer"
            >
              Open Live Email Thread →
            </button>
          </div>
          <button
            type="button"
            onClick={() => setSupportToast(null)}
            aria-label="Dismiss support reply alert"
            className="text-neutral-500 hover:text-[#1d1d1f] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Live Push Notification In-App Toast */}
      {activeToast && (
        <div
          role="status"
          className="fixed bottom-32 lg:bottom-24 right-4 left-4 sm:left-auto sm:w-96 z-50 bg-[#3C2B02] text-white border-2 border-[#9D7110] p-4 shadow-2xl flex items-start gap-3 no-print"
        >
          <BellRing className="w-5 h-5 text-[#CD9E34] shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-extrabold text-[#CD9E34]">{activeToast.title}</p>
            <p className="text-xs text-[#F2E9D4] mt-1">{activeToast.message}</p>
            <button
              type="button"
              onClick={() => {
                setSelectedTrackingNo(activeToast.trackingNo);
                setActiveToast(null);
                navigate('track');
              }}
              className="mt-2 text-[11px] font-bold underline text-white hover:text-[#CD9E34] cursor-pointer"
            >
              View on Live Map
            </button>
          </div>
          <button
            type="button"
            onClick={() => setActiveToast(null)}
            aria-label="Dismiss notification"
            className="text-neutral-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Alerts & Offline Settings Slide-Over Drawer */}
      <AlertsDrawer
        open={alertsDrawerOpen}
        onClose={() => setAlertsDrawerOpen(false)}
        alerts={alerts}
        selectedTrackingNo={selectedTrackingNo}
        isAdmin={isAdminView}
        onMarkAllRead={() =>
          setAlerts((prev) =>
            prev.map((a) =>
              isAdminView || (normalizedTracked && a.trackingNo.toUpperCase() === normalizedTracked)
                ? { ...a, read: true }
                : a
            )
          )
        }
        onSelectShipment={(id) => {
          setSelectedTrackingNo(id);
          navigate('track');
        }}
        notificationPermission={notificationPermission}
        onRequestNotifications={handleRequestNotifications}
        isOnline={isOnline}
        simulatedOffline={simulatedOffline}
        onToggleSimulatedOffline={() => setSimulatedOffline((v) => !v)}
        offlineQueueCount={offlineQueue.length}
        onSyncNow={syncOfflineQueue}
      />
    </div>
  );
}
