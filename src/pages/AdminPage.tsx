import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  BellRing,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Globe,
  ImagePlus,
  Inbox,
  LayoutDashboard,
  LineChart,
  Lock,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  Navigation,
  Package,
  Pencil,
  Phone,
  Plus,
  QrCode,
  Radar,
  Receipt,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { ANALYTICS_DAILY_VOLUME, REVIEWS } from '../data/seedData';
import type {
  ContactMessage,
  FaqItem,
  GeofenceZone,
  LatLngPoint,
  OfflineQueuedAction,
  PageRoute,
  PushAlert,
  ReturnRequest,
  Shipment,
  SiteSettings,
  SupportTicket,
} from '../types';
import { MapViewport } from '../components/MapViewport';
import { StampedReceiptCard } from '../components/StampedReceiptCard';
import type { NotificationPermissionState } from '../utils/notifications';

type AdminTab =
  | 'overview'
  | 'shipments'
  | 'gps'
  | 'alerts'
  | 'receipts'
  | 'analytics'
  | 'inbox'
  | 'content'
  | 'system';

interface AdminPageProps {
  adminToken: string | null;
  adminEmail: string | null;
  onAdminAuthenticated: (token: string, email: string) => void;
  onAdminLogout: () => void;
  shipments: Shipment[];
  alerts: PushAlert[];
  selectedTrackingNo: string;
  onSelectTracking: (trackingNo: string) => void;
  onNavigate: (page: PageRoute) => void;
  isOnline: boolean;
  simulatedOffline: boolean;
  onToggleSimulatedOffline: () => void;
  offlineQueue: OfflineQueuedAction[];
  onSyncNow: () => void;
  quotaExceeded: boolean;
  notificationPermission: NotificationPermissionState;
  onRequestNotifications: () => void;
  onUpdatePosition: (
    trackingNo: string,
    coords: LatLngPoint & {
      location?: string;
      speedKmh?: number;
      headingDeg?: number;
      progress?: number;
    },
    deviationThresholdMeters: number
  ) => Promise<void>;
  onUpdateGeofences: (trackingNo: string, geofences: GeofenceZone[]) => Promise<void>;
  onMarkAllAlertsRead: () => void;
  onAdminShipmentsChange: React.Dispatch<React.SetStateAction<Shipment[]>>;
  onAdminAlertsChange: (nextAlerts: PushAlert[]) => void;
  onTriggerAlert: (alert: PushAlert) => void;
  siteSettings: SiteSettings;
  onUpdateSiteSettings: (
    nextSettings: SiteSettings
  ) => Promise<{ ok: boolean; queuedOffline?: boolean; error?: string }>;
  supportTickets: SupportTicket[];
  onTicketsSync: (nextTickets: SupportTicket[]) => void;
  onReplyTicket: (
    ticketIdOrCode: string,
    payload: { senderRole: 'visitor' | 'admin'; senderName: string; text: string }
  ) => Promise<{ ok: boolean; ticket?: SupportTicket; error?: string }>;
  onUpdateTicketStatus: (
    ticketId: string,
    status: SupportTicket['status']
  ) => Promise<{ ok: boolean; ticket?: SupportTicket }>;
  openTicketFocus?: { ticketId: string; nonce: number } | null;
}

const STATUS_OPTIONS = [
  'Pending',
  'Picked Up',
  'Customs Clearance',
  'In Transit',
  'Arrived at Hub',
  'Out for Delivery',
  'Delivered',
  'Route Deviation',
] as const;

const PAYMENT_STATES: Array<Shipment['payment']['state']> = [
  'Paid',
  'Partial',
  'Customs Cleared',
  'Refunded',
];

function parseCurrency(val: string): number {
  const num = Number(val.replace(/[^0-9.-]+/g, ''));
  return Number.isFinite(num) ? num : 0;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  adminToken,
  adminEmail,
  onAdminAuthenticated,
  onAdminLogout,
  shipments,
  alerts,
  selectedTrackingNo,
  onSelectTracking,
  onNavigate,
  isOnline,
  simulatedOffline,
  onToggleSimulatedOffline,
  offlineQueue,
  onSyncNow,
  quotaExceeded,
  notificationPermission,
  onRequestNotifications,
  onUpdatePosition,
  onUpdateGeofences,
  onMarkAllAlertsRead,
  onAdminShipmentsChange,
  onAdminAlertsChange,
  onTriggerAlert,
  siteSettings,
  onUpdateSiteSettings,
  supportTickets,
  onTicketsSync,
  onReplyTicket,
  onUpdateTicketStatus,
  openTicketFocus,
}) => {
  const [authStatusLoading, setAuthStatusLoading] = useState(!adminToken);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [bannerFeedback, setBannerFeedback] = useState<string | null>(null);

  // Admin Contact Inbox & Returns state loaded from server
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  // Real-time Support Ticket Desk state
  const [ticketFilter, setTicketFilter] = useState<'all' | SupportTicket['status']>('all');
  const [selectedTicketId, setSelectedTicketId] = useState<string>('');
  const [adminReplyText, setAdminReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const ticketChatEndRef = useRef<HTMLDivElement | null>(null);

  // Site Content & Contact Editor Draft state
  const [settingsDraft, setSettingsDraft] = useState<SiteSettings>(siteSettings);
  const [savingSettings, setSavingSettings] = useState(false);
  const [newFaq, setNewFaq] = useState<Omit<FaqItem, 'id'>>({
    category: 'Tracking & GPS',
    q: '',
    a: '',
  });
  const [newMilestone, setNewMilestone] = useState({ year: '2026', text: '' });

  const SAMPLE_PARCEL_PRESETS = [
    { label: 'Sealed Parcel Box', url: '/src/assets/images/golden_courier_parcels_1795375425863.jpg' },
    { label: 'Doorstep Handover', url: '/src/assets/images/golden_courier_driver_1795375426210.jpg' },
    { label: 'Boots Proof Photo', url: '/src/assets/images/parcel_proof_boots_1795252245449.jpg' },
  ];

  const compressImageFile = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        if (!result) {
          reject(new Error('Empty file'));
          return;
        }
        const img = new Image();
        img.onload = () => {
          const maxDim = 960;
          const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(result);
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.78));
        };
        img.onerror = () => resolve(result);
        img.src = result;
      };
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(file);
    });

  // Create Shipment Modal & Last Dispatched Card state
  const [createOpen, setCreateOpen] = useState(false);
  const [lastDispatchedShipment, setLastDispatchedShipment] = useState<Shipment | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [previewReceiptShipment, setPreviewReceiptShipment] = useState<Shipment | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [editImageUrlInput, setEditImageUrlInput] = useState('');
  const [newForm, setNewForm] = useState({
    trackingNo: '',
    originCity: 'London, UK',
    originLat: '51.5072',
    originLng: '-0.1276',
    destCity: 'Edinburgh, UK',
    destLat: '55.9533',
    destLng: '-3.1883',
    senderName: 'Metro Parcel Service Dispatch',
    senderAddress: '45 King William St, London EC4N 7DZ',
    senderEmail: 'dispatch@metroparcel.com',
    senderPhone: '+44 20 7946 0180',
    receiverName: 'Claire Thornton',
    receiverAddress: '18 Princes Street, Edinburgh EH2 2AN',
    receiverEmail: 'claire.thornton@example.com',
    receiverPhone: '+44 7700 900412',
    courierName: 'Richard Dheo',
    courierPhone: '+44 7700 900789',
    courierVehicle: 'EV Sprinter · TP-402',
    service: 'Express' as Shipment['service'],
    packageDesc: 'Electronics & calibration kit',
    weightKg: '3.2',
    dimensionsCm: '35x25x18 cm',
    totalFee: '34.50',
    eta: 'Tomorrow, 15:00',
    parcelImages: [] as string[],
  });

  // Edit Shipment & Scan Checkpoint Drawer
  const [editingTrackingNo, setEditingTrackingNo] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({
    status: 'In Transit',
    progress: 60,
    service: 'Express' as Shipment['service'],
    originCity: '',
    destCity: '',
    currentLocation: '',
    eta: '',
    senderName: '',
    senderAddress: '',
    senderEmail: '',
    senderPhone: '',
    receiverName: '',
    receiverAddress: '',
    receiverEmail: '',
    receiverPhone: '',
    packageDesc: '',
    weightKg: '2.5',
    dimensionsCm: '35x25x18 cm',
    totalFee: '29.99',
    courierName: '',
    courierPhone: '',
    courierVehicle: '',
    paymentState: 'Paid' as Shipment['payment']['state'],
    scanNote: '',
    parcelImages: [] as string[],
  });

  // Live GPS & Geofence Admin controls
  const activeShipment =
    shipments.find((s) => s.tracking_no === selectedTrackingNo) || shipments[0];
  const [gpsForm, setGpsForm] = useState({
    lat: String(activeShipment?.current.lat ?? 52.4862),
    lng: String(activeShipment?.current.lng ?? -1.8904),
    location: activeShipment?.current.location ?? 'Birmingham Hub, UK',
    speedKmh: String(activeShipment?.current.speedKmh ?? 78),
    headingDeg: String(activeShipment?.current.headingDeg ?? 335),
  });
  const [newGfForm, setNewGfForm] = useState({
    name: 'Checkpoint Geofence',
    lat: String(activeShipment?.current.lat ?? 52.4862),
    lng: String(activeShipment?.current.lng ?? -1.8904),
    radiusKm: '6',
    type: 'hub' as GeofenceZone['type'],
  });

  // Broadcast Alert Form
  const [broadcastForm, setBroadcastForm] = useState({
    trackingNo: activeShipment?.tracking_no || 'TP26AB100245',
    type: 'route_update' as PushAlert['type'],
    title: 'Priority Corridor Clearance',
    message: 'M6 express corridor cleared; updated ETA confirmed 18 minutes earlier.',
  });

  // Return Issuance Form
  const [newReturnForm, setNewReturnForm] = useState({
    code: '',
    retailer: 'Soho Footwear Ltd',
    dropPoint: 'Testford Lockers #14, London',
  });

  // Bulk CSV Importer
  const [csvText, setCsvText] = useState(
    'TP26CS880101,London UK,Bristol UK,Atelier Soho,Express,1.8,19.99\nTP26CS880102,Manchester UK,Leeds UK,North Hub Store,Standard,4.4,24.50'
  );

  const adminTokenRef = useRef<string | null>(adminToken);
  adminTokenRef.current = adminToken;

  const getAdminHeaders = (withJson = false, tokenOverride?: string | null): Record<string, string> => {
    const activeToken = tokenOverride !== undefined ? tokenOverride : adminTokenRef.current;
    return {
      ...(withJson ? { 'Content-Type': 'application/json' } : {}),
      ...(activeToken
        ? { Authorization: `Bearer ${activeToken}`, 'X-Admin-Token': activeToken }
        : {}),
    };
  };

  const handleSessionExpired = (failedToken?: string | null) => {
    if (failedToken && adminTokenRef.current && adminTokenRef.current !== failedToken) {
      return;
    }
    setAuthError('Your admin session expired. Please sign in again.');
    onAdminLogout();
  };

  useEffect(() => {
    if (!isOnline) {
      setAuthStatusLoading(false);
      return;
    }
    if (adminToken) {
      setAuthStatusLoading(false);
      return;
    }
    let cancelled = false;
    setAuthStatusLoading(true);
    fetch('/api/admin/auth/status', {
      cache: 'no-store',
      credentials: 'include',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.ok) return;
        setNeedsSetup(Boolean(data.needsSetup));
      })
      .catch(() => {
        // Keep login form state
      })
      .finally(() => {
        if (!cancelled) setAuthStatusLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [adminToken, isOnline]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) {
      setAuthError('You are currently offline. Reconnect to sign in to the Admin Portal.');
      return;
    }
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const endpoint = needsSetup ? '/api/admin/auth/setup' : '/api/admin/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        cache: 'no-store',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.needsSetup) {
        setNeedsSetup(true);
        setAuthError(data.error || 'Initial admin setup required before signing in.');
        return;
      }
      if (res.status === 409 && needsSetup) {
        setNeedsSetup(false);
        setAuthError('Admin account is already configured. Please sign in.');
        return;
      }
      if (!res.ok || !data.ok || !data.token) {
        setAuthError(data.error || 'Invalid email or password.');
        return;
      }
      setLoginPassword('');
      onAdminAuthenticated(data.token, data.email || loginEmail.trim());
    } catch {
      setAuthError('Unable to reach the authentication server. Please try again.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    if (isOnline && adminToken) {
      try {
        await fetch('/api/admin/auth/logout', {
          method: 'POST',
          cache: 'no-store',
          credentials: 'include',
          headers: getAdminHeaders(),
        });
      } catch {
        // Ignore network errors during logout
      }
    }
    setAuthError(null);
    onAdminLogout();
  };

  const showToast = (msg: string) => {
    setBannerFeedback(msg);
    setTimeout(() => {
      setBannerFeedback((curr) => (curr === msg ? null : curr));
    }, 4500);
  };

  const copyTrackingCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    showToast(`Copied tracking code ${code}`);
    setTimeout(() => {
      setCopiedCode((curr) => (curr === code ? null : curr));
    }, 2000);
  };

  const fetchAdminOverview = async () => {
    const reqToken = adminTokenRef.current;
    if (!isOnline || !reqToken) return;
    try {
      const res = await fetch('/api/admin/overview', {
        cache: 'no-store',
        credentials: 'include',
        headers: getAdminHeaders(false, reqToken),
      });
      if (res.status === 401) {
        handleSessionExpired(reqToken);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.contactMessages)) setContactMessages(data.contactMessages);
        if (Array.isArray(data.returnRequests)) setReturnRequests(data.returnRequests);
        if (Array.isArray(data.supportTickets)) onTicketsSync(data.supportTickets);
      }
    } catch {
      // Retain local state when offline
    }
  };

  useEffect(() => {
    if (adminToken) {
      fetchAdminOverview();
    }
  }, [isOnline, adminToken]);

  useEffect(() => {
    setSettingsDraft(siteSettings);
  }, [siteSettings]);

  const filteredTickets = useMemo(() => {
    const sorted = [...supportTickets].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    if (ticketFilter === 'all') return sorted;
    return sorted.filter((t) => t.status === ticketFilter);
  }, [supportTickets, ticketFilter]);

  const activeTicket = useMemo(() => {
    return (
      supportTickets.find((t) => t.id === selectedTicketId) ||
      filteredTickets[0] ||
      supportTickets[0] ||
      null
    );
  }, [supportTickets, filteredTickets, selectedTicketId]);

  useEffect(() => {
    if (!selectedTicketId && supportTickets[0]) {
      setSelectedTicketId(supportTickets[0].id);
    }
  }, [supportTickets, selectedTicketId]);

  useEffect(() => {
    if (openTicketFocus?.ticketId) {
      setActiveTab('inbox');
      setTicketFilter('all');
      setSelectedTicketId(openTicketFocus.ticketId);
    }
  }, [openTicketFocus?.ticketId, openTicketFocus?.nonce]);

  useEffect(() => {
    if (activeTab === 'inbox' && activeTicket?.replies.length) {
      ticketChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, activeTicket?.id, activeTicket?.replies.length]);

  useEffect(() => {
    if (!activeShipment) return;
    setGpsForm({
      lat: String(activeShipment.current.lat),
      lng: String(activeShipment.current.lng),
      location: activeShipment.current.location,
      speedKmh: String(activeShipment.current.speedKmh),
      headingDeg: String(activeShipment.current.headingDeg),
    });
    setNewGfForm((prev) => ({
      ...prev,
      lat: String(activeShipment.current.lat),
      lng: String(activeShipment.current.lng),
    }));
  }, [activeShipment?.tracking_no, activeShipment?.current.lat, activeShipment?.current.lng]);

  const openEditor = (s: Shipment) => {
    const existingImages = Array.from(
      new Set([
        ...(s.parcelImages || []),
        ...(s.proofImage ? [s.proofImage] : []),
      ].filter(Boolean))
    );
    const numericFee = parseCurrency(s.payment.total);
    setEditingTrackingNo(s.tracking_no);
    setEditImageUrlInput('');
    setEditDraft({
      status: s.status,
      progress: s.progress,
      service: s.service,
      originCity: s.origin.city,
      destCity: s.dest.city,
      currentLocation: s.current.location,
      eta: s.eta,
      senderName: s.sender.name,
      senderAddress: s.sender.address,
      senderEmail: s.sender.email || '',
      senderPhone: s.sender.phone || '',
      receiverName: s.receiver.name,
      receiverAddress: s.receiver.address,
      receiverEmail: s.receiver.email || '',
      receiverPhone: s.receiver.phone || '',
      packageDesc: s.package,
      weightKg: String(s.weight),
      dimensionsCm: s.dimensionsCm || '35x25x18 cm',
      totalFee: numericFee > 0 ? numericFee.toFixed(2) : '29.99',
      courierName: s.courier.name,
      courierPhone: s.courier.phone,
      courierVehicle: s.courier.vehicle,
      paymentState: s.payment.state,
      scanNote: '',
      parcelImages: existingImages,
    });
  };

  const handleUploadNewImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const chosen = Array.from(files).slice(0, Math.max(0, 6 - newForm.parcelImages.length));
    if (chosen.length === 0) {
      showToast('Maximum of 6 parcel pictures reached.');
      return;
    }
    try {
      const encoded = await Promise.all(chosen.map((f) => compressImageFile(f)));
      setNewForm((f) => ({
        ...f,
        parcelImages: [...f.parcelImages, ...encoded].slice(0, 6),
      }));
      showToast(`Attached ${encoded.length} parcel picture${encoded.length > 1 ? 's' : ''}`);
    } catch {
      showToast('Could not read selected image file.');
    }
  };

  const handleUploadEditImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const chosen = Array.from(files).slice(0, Math.max(0, 6 - editDraft.parcelImages.length));
    if (chosen.length === 0) {
      showToast('Maximum of 6 parcel pictures reached.');
      return;
    }
    try {
      const encoded = await Promise.all(chosen.map((f) => compressImageFile(f)));
      setEditDraft((d) => ({
        ...d,
        parcelImages: [...d.parcelImages, ...encoded].slice(0, 6),
      }));
      showToast(`Attached ${encoded.length} parcel picture${encoded.length > 1 ? 's' : ''}`);
    } catch {
      showToast('Could not read selected image file.');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrackingNo) return;
    const reqToken = adminToken;
    const parsedFee = Number(editDraft.totalFee);
    const parsedWeight = Number(editDraft.weightKg);
    const payload = {
      status: editDraft.status,
      progress: Number(editDraft.progress),
      service: editDraft.service,
      originCity: editDraft.originCity.trim(),
      destCity: editDraft.destCity.trim(),
      currentLocation: editDraft.currentLocation,
      eta: editDraft.eta,
      senderName: editDraft.senderName.trim(),
      senderAddress: editDraft.senderAddress.trim(),
      senderEmail: editDraft.senderEmail.trim(),
      senderPhone: editDraft.senderPhone.trim(),
      receiverName: editDraft.receiverName.trim(),
      receiverAddress: editDraft.receiverAddress.trim(),
      receiverEmail: editDraft.receiverEmail.trim(),
      receiverPhone: editDraft.receiverPhone.trim(),
      package: editDraft.packageDesc.trim(),
      weight: Number.isFinite(parsedWeight) && parsedWeight > 0 ? parsedWeight : undefined,
      dimensionsCm: editDraft.dimensionsCm.trim(),
      totalFee: Number.isFinite(parsedFee) && parsedFee > 0 ? parsedFee : undefined,
      courierName: editDraft.courierName,
      courierPhone: editDraft.courierPhone,
      courierVehicle: editDraft.courierVehicle,
      paymentState: editDraft.paymentState,
      eventNote: editDraft.scanNote.trim() || undefined,
      parcelImages: editDraft.parcelImages,
      proofImage: editDraft.parcelImages[0] || '',
    };

    if (isOnline && reqToken) {
      try {
        const res = await fetch(`/api/admin/shipments/${encodeURIComponent(editingTrackingNo)}`, {
          method: 'PATCH',
          cache: 'no-store',
          credentials: 'include',
          headers: getAdminHeaders(true),
          body: JSON.stringify(payload),
        });
        if (res.status === 401) {
          handleSessionExpired(reqToken);
          return;
        }
        if (res.ok) {
          const data = await res.json();
          onAdminShipmentsChange((prev) =>
            prev.map((s) => (s.tracking_no === editingTrackingNo ? data.shipment : s))
          );
          if (lastDispatchedShipment?.tracking_no === editingTrackingNo) {
            setLastDispatchedShipment(data.shipment);
          }
          setEditingTrackingNo(null);
          showToast(`Updated ${editingTrackingNo} (${editDraft.status})`);
          return;
        }
      } catch {
        // Fallback locally
      }
    }

    const nowIso = new Date().toISOString();
    const nowStr = nowIso.replace('T', ' ').slice(0, 19);
    const shortTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    let updatedLocal: Shipment | null = null;
    onAdminShipmentsChange((prev) =>
      prev.map((s) => {
        if (s.tracking_no !== editingTrackingNo) return s;
        const nextFee =
          Number.isFinite(parsedFee) && parsedFee > 0
            ? parsedFee
            : parseCurrency(s.payment.total);
        const nextPaymentState = editDraft.paymentState;
        const nextOrigin = editDraft.originCity.trim() || s.origin.city;
        const nextDest = editDraft.destCity.trim() || s.dest.city;
        const nextEvents =
          editDraft.scanNote.trim() || editDraft.status !== s.status
            ? [
                ...s.events,
                {
                  status: editDraft.status,
                  location: editDraft.currentLocation || s.current.location,
                  lat: s.current.lat,
                  lng: s.current.lng,
                  note: editDraft.scanNote.trim() || `Admin updated status to ${editDraft.status}`,
                  event_time: nowStr,
                  time_h: `Today, ${shortTime}`,
                },
              ]
            : s.events;

        updatedLocal = {
          ...s,
          status: editDraft.status,
          progress: Number(editDraft.progress),
          service: editDraft.service,
          eta: editDraft.eta,
          package: editDraft.packageDesc.trim() || s.package,
          weight: Number.isFinite(parsedWeight) && parsedWeight > 0 ? parsedWeight : s.weight,
          dimensionsCm: editDraft.dimensionsCm.trim() || s.dimensionsCm,
          updated_at: nowIso,
          origin: { ...s.origin, city: nextOrigin },
          dest: { ...s.dest, city: nextDest },
          current: { ...s.current, location: editDraft.currentLocation },
          sender: {
            ...s.sender,
            name: editDraft.senderName.trim() || s.sender.name,
            city: nextOrigin,
            address: editDraft.senderAddress.trim() || s.sender.address,
            email: editDraft.senderEmail.trim() || undefined,
            phone: editDraft.senderPhone.trim() || undefined,
          },
          receiver: {
            ...s.receiver,
            name: editDraft.receiverName.trim() || s.receiver.name,
            city: nextDest,
            address: editDraft.receiverAddress.trim() || s.receiver.address,
            email: editDraft.receiverEmail.trim() || undefined,
            phone: editDraft.receiverPhone.trim() || undefined,
          },
          courier: {
            ...s.courier,
            name: editDraft.courierName,
            phone: editDraft.courierPhone,
            vehicle: editDraft.courierVehicle,
          },
          proofImage: editDraft.parcelImages[0] || undefined,
          parcelImages: editDraft.parcelImages.length > 0 ? editDraft.parcelImages : undefined,
          payment: {
            ...s.payment,
            state: nextPaymentState,
            total: `£${nextFee.toFixed(2)}`,
            shippingFee: `£${(nextFee / 1.2).toFixed(2)}`,
            vatFee: `£${(nextFee - nextFee / 1.2).toFixed(2)}`,
            paid:
              nextPaymentState === 'Partial'
                ? `£${(nextFee * 0.5).toFixed(2)}`
                : `£${nextFee.toFixed(2)}`,
            balance:
              nextPaymentState === 'Partial' ? `£${(nextFee * 0.5).toFixed(2)}` : '£0.00',
          },
          events: nextEvents,
        };
        return updatedLocal;
      })
    );
    if (updatedLocal && lastDispatchedShipment?.tracking_no === editingTrackingNo) {
      setLastDispatchedShipment(updatedLocal);
    }
    setEditingTrackingNo(null);
    showToast(`Updated ${editingTrackingNo} locally`);
  };

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    const reqToken = adminToken;
    const payload = {
      trackingNo: newForm.trackingNo.trim() || undefined,
      originCity: newForm.originCity.trim(),
      originLat: Number(newForm.originLat) || 51.5072,
      originLng: Number(newForm.originLng) || -0.1276,
      destCity: newForm.destCity.trim(),
      destLat: Number(newForm.destLat) || 53.4808,
      destLng: Number(newForm.destLng) || -2.2426,
      senderName: newForm.senderName.trim(),
      senderAddress: newForm.senderAddress.trim() || undefined,
      senderEmail: newForm.senderEmail.trim() || undefined,
      senderPhone: newForm.senderPhone.trim() || undefined,
      receiverName: newForm.receiverName.trim(),
      receiverAddress: newForm.receiverAddress.trim() || undefined,
      receiverEmail: newForm.receiverEmail.trim() || undefined,
      receiverPhone: newForm.receiverPhone.trim() || undefined,
      courierName: newForm.courierName.trim(),
      courierPhone: newForm.courierPhone.trim() || '+44 7700 900789',
      courierVehicle: newForm.courierVehicle.trim(),
      service: newForm.service,
      packageDesc: newForm.packageDesc.trim(),
      weightKg: Number(newForm.weightKg) || 2.0,
      dimensionsCm: newForm.dimensionsCm.trim() || '35x25x18 cm',
      totalFee: Number(newForm.totalFee) || 24.99,
      eta: newForm.eta.trim(),
      parcelImages: newForm.parcelImages,
      proofImage: newForm.parcelImages[0] || undefined,
    };

    if (isOnline && reqToken) {
      try {
        const res = await fetch('/api/admin/shipments', {
          method: 'POST',
          cache: 'no-store',
          credentials: 'include',
          headers: getAdminHeaders(true),
          body: JSON.stringify(payload),
        });
        if (res.status === 401) {
          handleSessionExpired(reqToken);
          return;
        }
        const data = await res.json();
        if (res.ok && data.shipment) {
          onAdminShipmentsChange((prev) =>
            prev.some((s) => s.tracking_no === data.shipment.tracking_no)
              ? prev.map((s) => (s.tracking_no === data.shipment.tracking_no ? data.shipment : s))
              : [data.shipment, ...prev]
          );
          if (data.alert) onTriggerAlert(data.alert);
          onSelectTracking(data.shipment.tracking_no);
          setLastDispatchedShipment(data.shipment);
          setCreateOpen(false);
          setNewForm((f) => ({ ...f, trackingNo: '', parcelImages: [] }));
          setImageUrlInput('');
          showToast(`Dispatched shipment ${data.shipment.tracking_no}`);
          return;
        } else {
          showToast(data.error || 'Could not create shipment');
          return;
        }
      } catch {
        // Fallback below
      }
    }

    const rand = Math.floor(100000 + Math.random() * 899999);
    const trackingNo = (payload.trackingNo || `TP26AD${rand}`).toUpperCase();
    const localShipment: Shipment = {
      tracking_no: trackingNo,
      receipt_no: `RCP-OFFLINE-${String(rand).slice(0, 4)}`,
      company: 'Metro Parcel Service',
      status: 'Picked Up',
      service: payload.service,
      package: payload.packageDesc,
      weight: payload.weightKg,
      dimensionsCm: payload.dimensionsCm,
      pieces: 1,
      progress: 20,
      origin: { city: payload.originCity, lat: payload.originLat, lng: payload.originLng },
      dest: { city: payload.destCity, lat: payload.destLat, lng: payload.destLng },
      current: {
        lat: payload.originLat,
        lng: payload.originLng,
        location: `${payload.originCity} Hub`,
        speedKmh: 0,
        headingDeg: 0,
      },
      sender: {
        name: payload.senderName,
        city: payload.originCity,
        address: payload.senderAddress || payload.originCity,
        email: payload.senderEmail,
        phone: payload.senderPhone,
      },
      receiver: {
        name: payload.receiverName,
        city: payload.destCity,
        address: payload.receiverAddress || payload.destCity,
        email: payload.receiverEmail,
        phone: payload.receiverPhone,
      },
      courier: {
        name: payload.courierName,
        phone: payload.courierPhone,
        vehicle: payload.courierVehicle,
      },
      pickup: 'Today',
      eta: payload.eta,
      proofImage: payload.parcelImages[0] || undefined,
      parcelImages: payload.parcelImages.length > 0 ? payload.parcelImages : undefined,
      payment: {
        state: 'Paid',
        total: `£${payload.totalFee.toFixed(2)}`,
        paid: `£${payload.totalFee.toFixed(2)}`,
        balance: '£0.00',
        shippingFee: `£${(payload.totalFee / 1.2).toFixed(2)}`,
        insuranceFee: '£0.00',
        vatFee: `£${(payload.totalFee - payload.totalFee / 1.2).toFixed(2)}`,
        method: 'Admin Offline Dispatch',
        reference: `RCP-${rand}`,
        issuedAt: new Date().toLocaleString('en-GB'),
      },
      distance_km: 310,
      updated_at: new Date().toISOString(),
      events: [
        {
          status: 'Picked Up',
          location: payload.originCity,
          lat: payload.originLat,
          lng: payload.originLng,
          note: 'Created via Admin Portal (Offline)',
          event_time: new Date().toISOString(),
          time_h: 'Just now',
        },
      ],
      routeWaypoints: [
        { lat: payload.originLat, lng: payload.originLng, timestamp: 'Just now', speedKmh: 0, headingDeg: 0, label: payload.originCity },
        { lat: payload.destLat, lng: payload.destLng, timestamp: payload.eta, speedKmh: 0, headingDeg: 0, label: payload.destCity },
      ],
      geofences: [
        { id: `gf-o-${rand}`, name: `${payload.originCity} Origin`, lat: payload.originLat, lng: payload.originLng, radiusMeters: 5000, type: 'origin', active: true, triggered: true },
        { id: `gf-d-${rand}`, name: `${payload.destCity} Arrival Zone`, lat: payload.destLat, lng: payload.destLng, radiusMeters: 6500, type: 'destination', active: true, triggered: false },
      ],
    };
    onAdminShipmentsChange([localShipment, ...shipments]);
    onSelectTracking(trackingNo);
    setLastDispatchedShipment(localShipment);
    setCreateOpen(false);
    setNewForm((f) => ({ ...f, trackingNo: '', parcelImages: [] }));
    setImageUrlInput('');
    showToast(`Dispatched ${trackingNo} offline`);
  };

  const handleDeleteShipment = async (trackingNo: string) => {
    if (shipments.length <= 1) {
      showToast('Keep at least one active shipment in the fleet.');
      return;
    }
    const reqToken = adminToken;
    if (isOnline && reqToken) {
      try {
        const res = await fetch(`/api/admin/shipments/${encodeURIComponent(trackingNo)}`, {
          method: 'DELETE',
          cache: 'no-store',
          credentials: 'include',
          headers: getAdminHeaders(),
        });
        if (res.status === 401) {
          handleSessionExpired(reqToken);
          return;
        }
      } catch {
        // Proceed with local removal
      }
    }
    const remaining = shipments.filter((s) => s.tracking_no !== trackingNo);
    onAdminShipmentsChange(remaining);
    if (lastDispatchedShipment?.tracking_no === trackingNo) {
      setLastDispatchedShipment(null);
    }
    if (selectedTrackingNo === trackingNo && remaining[0]) {
      onSelectTracking(remaining[0].tracking_no);
    }
    showToast(`Deleted shipment ${trackingNo}`);
  };

  const handleQuickPaymentStamp = async (
    trackingNo: string,
    paymentState: Shipment['payment']['state']
  ) => {
    const reqToken = adminToken;
    if (isOnline && reqToken) {
      try {
        const res = await fetch(`/api/admin/shipments/${encodeURIComponent(trackingNo)}`, {
          method: 'PATCH',
          cache: 'no-store',
          credentials: 'include',
          headers: getAdminHeaders(true),
          body: JSON.stringify({ paymentState }),
        });
        if (res.status === 401) {
          handleSessionExpired(reqToken);
          return;
        }
        if (res.ok) {
          const data = await res.json();
          onAdminShipmentsChange(
            shipments.map((s) => (s.tracking_no === trackingNo ? data.shipment : s))
          );
          showToast(`${trackingNo} receipt stamped as ${paymentState.toUpperCase()}`);
          return;
        }
      } catch {
        // Fallback locally
      }
    }
    onAdminShipmentsChange(
      shipments.map((s) =>
        s.tracking_no === trackingNo
          ? {
              ...s,
              payment: {
                ...s.payment,
                state: paymentState,
                paid: paymentState === 'Paid' ? s.payment.total : s.payment.paid,
                balance: paymentState === 'Paid' || paymentState === 'Refunded' ? '£0.00' : s.payment.balance,
              },
            }
          : s
      )
    );
    showToast(`${trackingNo} stamped ${paymentState}`);
  };

  const handleBroadcastAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) return;
    const reqToken = adminToken;
    if (isOnline && reqToken) {
      try {
        const res = await fetch('/api/admin/alerts', {
          method: 'POST',
          cache: 'no-store',
          credentials: 'include',
          headers: getAdminHeaders(true),
          body: JSON.stringify(broadcastForm),
        });
        if (res.status === 401) {
          handleSessionExpired(reqToken);
          return;
        }
        if (res.ok) {
          const data = await res.json();
          if (data.alert) onTriggerAlert(data.alert);
          showToast(`Broadcast sent: ${broadcastForm.title}`);
          return;
        }
      } catch {
        // Fallback locally
      }
    }
    onTriggerAlert({
      id: `al-adm-loc-${Date.now()}`,
      trackingNo: broadcastForm.trackingNo,
      type: broadcastForm.type,
      title: broadcastForm.title,
      message: broadcastForm.message,
      timestamp: 'Just now',
      read: false,
      lat: activeShipment?.current.lat ?? 51.5072,
      lng: activeShipment?.current.lng ?? -0.1276,
    });
    showToast(`Local push alert dispatched`);
  };

  const handleToggleContactStatus = async (msg: ContactMessage) => {
    const nextStatus = msg.status === 'resolved' ? 'open' : 'resolved';
    const note = noteDrafts[msg.id] ?? msg.adminNote ?? '';
    const reqToken = adminToken;
    if (isOnline && reqToken) {
      try {
        const res = await fetch(`/api/admin/contact/${encodeURIComponent(msg.id)}`, {
          method: 'PATCH',
          cache: 'no-store',
          credentials: 'include',
          headers: getAdminHeaders(true),
          body: JSON.stringify({ status: nextStatus, adminNote: note }),
        });
        if (res.status === 401) {
          handleSessionExpired(reqToken);
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setContactMessages((prev) => prev.map((m) => (m.id === msg.id ? data.entry : m)));
          showToast(`Message marked ${nextStatus}`);
          return;
        }
      } catch {
        // Fallback locally
      }
    }
    setContactMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, status: nextStatus, adminNote: note } : m))
    );
  };

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !adminReplyText.trim()) return;
    setReplySending(true);
    const result = await onReplyTicket(activeTicket.id, {
      senderRole: 'admin',
      senderName: 'Metro Parcel Service Support',
      text: adminReplyText.trim(),
    });
    setReplySending(false);
    if (result.ok) {
      setAdminReplyText('');
      showToast(`Reply delivered in real time to ${activeTicket.email} (${activeTicket.ticketCode})`);
    } else {
      showToast(result.error || 'Could not send reply. Please try again.');
    }
  };

  const handleChangeTicketStatus = async (
    ticketId: string,
    status: SupportTicket['status']
  ) => {
    const res = await onUpdateTicketStatus(ticketId, status);
    if (res.ok) {
      showToast(
        `Ticket status set to ${
          status === 'in_progress' ? 'In Progress' : status === 'resolved' ? 'Resolved' : 'Open'
        }`
      );
    }
  };

  const handleSaveSiteSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingSettings(true);
    const result = await onUpdateSiteSettings(settingsDraft);
    setSavingSettings(false);
    if (result.ok) {
      showToast(
        result.queuedOffline
          ? 'Site settings saved locally & queued for server sync'
          : 'Site contact, About & Help content published live across Metro Parcel Service'
      );
    } else {
      showToast('Failed to save site settings. Please check URLs and required fields.');
    }
  };

  const handleAddFaq = () => {
    if (!newFaq.q.trim() || !newFaq.a.trim()) return;
    setSettingsDraft((prev) => ({
      ...prev,
      help: {
        ...prev.help,
        faqs: [
          ...prev.help.faqs,
          {
            id: `faq-${Date.now()}`,
            category: newFaq.category.trim() || 'General',
            q: newFaq.q.trim(),
            a: newFaq.a.trim(),
          },
        ],
      },
    }));
    setNewFaq((f) => ({ ...f, q: '', a: '' }));
  };

  const handleAddMilestone = () => {
    if (!newMilestone.year.trim() || !newMilestone.text.trim()) return;
    setSettingsDraft((prev) => ({
      ...prev,
      about: {
        ...prev.about,
        milestones: [
          ...prev.about.milestones,
          { year: newMilestone.year.trim(), text: newMilestone.text.trim() },
        ],
      },
    }));
    setNewMilestone({ year: '2026', text: '' });
  };

  const handleIssueReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    const reqToken = adminToken;
    const code =
      newReturnForm.code.trim().toUpperCase() ||
      `RET-UK-${Math.floor(1000 + Math.random() * 8999)}`;
    if (isOnline && reqToken) {
      try {
        const res = await fetch('/api/admin/returns', {
          method: 'POST',
          cache: 'no-store',
          credentials: 'include',
          headers: getAdminHeaders(true),
          body: JSON.stringify({
            code,
            retailer: newReturnForm.retailer,
            dropPoint: newReturnForm.dropPoint,
          }),
        });
        if (res.status === 401) {
          handleSessionExpired(reqToken);
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setReturnRequests((prev) => [data.entry, ...prev]);
          setNewReturnForm((r) => ({ ...r, code: '' }));
          showToast(`Return QR pass ${code} issued`);
          return;
        }
      } catch {
        // Fallback locally
      }
    }
    setReturnRequests((prev) => [
      {
        id: `ret-${Date.now()}`,
        code,
        retailer: newReturnForm.retailer,
        dropPoint: newReturnForm.dropPoint,
        status: 'Issued',
        createdAt: 'Just now',
      },
      ...prev,
    ]);
    setNewReturnForm((r) => ({ ...r, code: '' }));
  };

  const handleCycleReturnStatus = async (ret: ReturnRequest) => {
    const order: Array<ReturnRequest['status']> = ['Issued', 'Scanned', 'In Transit', 'Refunded'];
    const next = order[(order.indexOf(ret.status) + 1) % order.length];
    const reqToken = adminToken;
    if (isOnline && reqToken) {
      try {
        const res = await fetch(`/api/admin/returns/${encodeURIComponent(ret.id)}`, {
          method: 'PATCH',
          cache: 'no-store',
          credentials: 'include',
          headers: getAdminHeaders(true),
          body: JSON.stringify({ status: next }),
        });
        if (res.status === 401) {
          handleSessionExpired(reqToken);
          return;
        }
      } catch {
        // Local update
      }
    }
    setReturnRequests((prev) => prev.map((r) => (r.id === ret.id ? { ...r, status: next } : r)));
  };

  const handleBulkCsvImport = async () => {
    const lines = csvText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    const reqToken = adminToken;
    let created = 0;
    const nextList = [...shipments];
    for (const line of lines) {
      const [trackingNo, originCity, destCity, receiverName, service, weightKg, totalFee] =
        line.split(',').map((s) => s.trim());
      if (!originCity || !destCity) continue;
      try {
        const res = await fetch('/api/admin/shipments', {
          method: 'POST',
          cache: 'no-store',
          credentials: 'include',
          headers: getAdminHeaders(true),
          body: JSON.stringify({
            trackingNo,
            originCity,
            destCity,
            receiverName: receiverName || 'Batch Recipient',
            service: service || 'Standard',
            weightKg: Number(weightKg) || 2.0,
            totalFee: Number(totalFee) || 19.99,
          }),
        });
        if (res.status === 401) {
          handleSessionExpired(reqToken);
          return;
        }
        if (res.ok) {
          const data = await res.json();
          nextList.unshift(data.shipment);
          created++;
        }
      } catch {
        // Skip failed row
      }
    }
    onAdminShipmentsChange(nextList);
    showToast(`Imported ${created} batch shipment(s) into live fleet`);
  };

  const handleResetDemo = async () => {
    const reqToken = adminToken;
    if (isOnline && reqToken) {
      try {
        const res = await fetch('/api/admin/reset', {
          method: 'POST',
          cache: 'no-store',
          credentials: 'include',
          headers: getAdminHeaders(),
        });
        if (res.status === 401) {
          handleSessionExpired(reqToken);
          return;
        }
        if (res.ok) {
          const data = await res.json();
          onAdminShipmentsChange(data.shipments);
          onAdminAlertsChange(data.alerts);
          onSelectTracking(data.shipments[0]?.tracking_no || 'TP26AB100245');
          showToast('Fleet & alerts restored to default demo seed data');
          return;
        }
      } catch {
        // Ignore
      }
    }
  };

  const handleExportFleetCsv = () => {
    const header = 'TrackingNo,ReceiptNo,Status,Service,Origin,Dest,Courier,Progress,Total,PaymentState\n';
    const rows = shipments
      .map(
        (s) =>
          `${s.tracking_no},${s.receipt_no},"${s.status}",${s.service},"${s.origin.city}","${s.dest.city}","${s.courier.name}",${s.progress}%,${s.payment.total},${s.payment.state}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metro_parcel_fleet_admin_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredShipments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return shipments.filter((s) => {
      const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
      const matchesQuery =
        !q ||
        s.tracking_no.toLowerCase().includes(q) ||
        s.receipt_no.toLowerCase().includes(q) ||
        s.origin.city.toLowerCase().includes(q) ||
        s.dest.city.toLowerCase().includes(q) ||
        s.receiver.name.toLowerCase().includes(q) ||
        s.courier.name.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [shipments, searchQuery, statusFilter]);

  const metrics = useMemo(() => {
    const totalRevenue = shipments.reduce((sum, s) => sum + parseCurrency(s.payment.paid), 0);
    const pendingBalance = shipments.reduce((sum, s) => sum + parseCurrency(s.payment.balance), 0);
    const inTransitCount = shipments.filter(
      (s) => s.status !== 'Delivered' && s.status !== 'Pending'
    ).length;
    const deliveredCount = shipments.filter((s) => s.status === 'Delivered').length;
    const deviationsCount = shipments.filter((s) => s.status === 'Route Deviation').length;
    const unreadAlerts = alerts.filter((a) => !a.read).length;
    const openTickets = supportTickets.filter((t) => t.status !== 'resolved').length;
    const openInbox = openTickets + contactMessages.filter((m) => m.status === 'open').length;
    return {
      totalRevenue,
      pendingBalance,
      inTransitCount,
      deliveredCount,
      deviationsCount,
      unreadAlerts,
      openTickets,
      openInbox,
    };
  }, [shipments, alerts, contactMessages, supportTickets]);

  const NAV_ITEMS: Array<{ id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'shipments', label: 'Shipments & Dispatch', icon: Package, badge: shipments.length },
    { id: 'gps', label: 'Live GPS & Geofences', icon: Radar },
    { id: 'alerts', label: 'Push Alerts', icon: BellRing, badge: metrics.unreadAlerts },
    { id: 'receipts', label: 'Payments & Receipts', icon: Receipt },
    { id: 'analytics', label: 'Fleet Analytics', icon: LineChart },
    { id: 'inbox', label: 'Email & Support Inbox', icon: Inbox, badge: metrics.openInbox },
    { id: 'content', label: 'Site Content & Contact', icon: Globe },
    { id: 'system', label: 'Business & Offline Sync', icon: Building2, badge: offlineQueue.length },
  ];

  if (!adminToken) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] flex flex-col">
        {/* Isolated Admin Portal Top Bar */}
        <header className="bg-[#3C2B02] text-[#F2E9D4] border-b border-[#6D500C] px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="inline-flex items-center gap-2.5 text-[#F2E9D4] font-extrabold text-lg sm:text-xl tracking-tight">
            <span className="w-8 h-8 rounded-lg bg-[#9D7110] text-white flex items-center justify-center font-display text-base">
              M
            </span>
            <span>Metro Parcel Service</span>
            <span className="px-2 py-0.5 bg-[#1E1501] text-[#CD9E34] border border-[#6D500C] text-[10px] font-extrabold uppercase tracking-wider">
              Admin Portal
            </span>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#1E1501] hover:bg-[#9D7110] hover:text-white text-[#CD9E34] text-xs font-extrabold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Public Site</span>
          </button>
        </header>

        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md bg-white border-2 border-[#3C2B02] shadow-[8px_8px_0_#9D7110] p-6 sm:p-8">
            <div className="flex items-center gap-3 pb-5 border-b border-neutral-200">
              <div className="w-11 h-11 bg-[#3C2B02] text-[#CD9E34] flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#6b6b70]">
                  /adminportal · Restricted Access
                </p>
                <h1 className="font-display text-xl sm:text-2xl text-[#1d1d1f]">
                  {needsSetup ? 'Initial Admin Setup' : 'Admin Operations Sign In'}
                </h1>
              </div>
            </div>

            {authStatusLoading ? (
              <div className="py-10 text-center text-xs font-bold text-[#6b6b70]">
                Checking Admin Portal security status…
              </div>
            ) : (
              <form onSubmit={handleAuthSubmit} className="mt-5 space-y-4">
                {needsSetup && (
                  <div className="bg-amber-50 border border-amber-300 text-amber-950 p-3 text-xs leading-relaxed">
                    <p className="font-extrabold">First-run setup required</p>
                    <p className="mt-1">
                      Claim your Admin Portal email and password (minimum 8 characters) to initialize operations access. For persistent deployments, also configure <code className="font-mono font-bold">ADMIN_EMAIL</code> and <code className="font-mono font-bold">ADMIN_PASSWORD</code> in environment variables.
                    </p>
                  </div>
                )}

                {authError && (
                  <div
                    role="alert"
                    className="bg-red-50 border border-red-300 text-red-900 p-3 text-xs font-bold flex items-start gap-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                    <span>{authError}</span>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="admin-login-email"
                    className="block text-xs font-extrabold uppercase tracking-wider text-[#1d1d1f] mb-1.5"
                  >
                    Admin Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#6b6b70] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="admin-login-email"
                      type="email"
                      required
                      autoComplete="username"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="Enter admin email"
                      className="w-full pl-9 pr-3 py-2.5 border border-neutral-300 focus:border-[#1d1d1f] focus:outline-none text-sm font-medium bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="admin-login-password"
                    className="block text-xs font-extrabold uppercase tracking-wider text-[#1d1d1f] mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#6b6b70] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="admin-login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={needsSetup ? 8 : 1}
                      autoComplete={needsSetup ? 'new-password' : 'current-password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder={needsSetup ? 'Create password (min 8 chars)' : 'Enter password'}
                      className="w-full pl-9 pr-10 py-2.5 border border-neutral-300 focus:border-[#1d1d1f] focus:outline-none text-sm font-medium bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#6b6b70] hover:text-[#1d1d1f] cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authSubmitting || !isOnline}
                  className="w-full py-3 bg-[#9D7110] text-white hover:bg-[#3C2B02] text-sm font-extrabold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {authSubmitting
                      ? 'Authenticating…'
                      : needsSetup
                        ? 'Claim & Enter Admin Portal'
                        : 'Sign In to Admin Portal'}
                  </span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 pb-24 lg:pb-12">
      {/* Top Breadcrumb & Primary Action Header (Dark Yellow-Brown) */}
      <div className="bg-[#3C2B02] text-[#F2E9D4] border border-[#6D500C] px-5 py-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#CD9E34]/80">
            <span>Metro Parcel Service Ops</span>
            <span>/</span>
            <span className="text-[#F2E9D4]">Admin Portal</span>
            <span>/</span>
            <span className="text-[#CD9E34]">
              {NAV_ITEMS.find((i) => i.id === activeTab)?.label}
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl text-white mt-1">
            Operations Control Center
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-[#1E1501] text-[#F2E9D4] border border-[#6D500C] text-xs font-bold hover:bg-[#6D500C] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Public Site</span>
          </button>

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#9D7110] text-white border border-[#CD9E34] text-xs font-extrabold hover:bg-[#CD9E34] hover:text-[#1E1501] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Dispatch</span>
          </button>

          <button
            type="button"
            onClick={handleExportFleetCsv}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1E1501] text-[#CD9E34] border border-[#6D500C] text-xs font-bold hover:bg-[#9D7110] hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Fleet CSV</span>
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-red-950/70 text-red-200 border border-red-700/60 text-xs font-extrabold hover:bg-red-700 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {bannerFeedback && (
        <div
          role="status"
          className="mb-6 bg-[#3C2B02] text-[#F2E9D4] border border-[#9D7110] px-4 py-3 text-xs font-bold flex items-center justify-between gap-3"
        >
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#CD9E34]" />
            {bannerFeedback}
          </span>
          <button type="button" onClick={() => setBannerFeedback(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {lastDispatchedShipment && (
        <div className="mb-6 bg-white border-2 border-[#3C2B02] shadow-[6px_6px_0_#9D7110] p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 bg-[#9D7110] text-white text-[10px] font-extrabold uppercase tracking-wider">
                Parcel Ready
              </span>
              <span className="text-xs font-bold text-[#6b6b70]">
                {lastDispatchedShipment.origin.city} → {lastDispatchedShipment.dest.city}
              </span>
              <span className="text-xs font-bold text-emerald-700">
                · {lastDispatchedShipment.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono-tabular font-extrabold text-lg sm:text-xl text-[#1d1d1f]">
                {lastDispatchedShipment.tracking_no}
              </span>
              <span className="text-xs font-mono-tabular text-[#6b6b70]">
                Receipt: {lastDispatchedShipment.receipt_no}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => copyTrackingCode(lastDispatchedShipment.tracking_no)}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-neutral-300 bg-[#f2f2f2] hover:border-[#3C2B02] text-xs font-bold text-[#1d1d1f] cursor-pointer"
            >
              {copiedCode === lastDispatchedShipment.tracking_no ? (
                <Check className="w-3.5 h-3.5 text-emerald-700" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>
                {copiedCode === lastDispatchedShipment.tracking_no ? 'Copied!' : 'Copy Code'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectTracking(lastDispatchedShipment.tracking_no);
                onNavigate('track');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#3C2B02] text-[#CD9E34] hover:bg-[#1E1501] text-xs font-extrabold cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Track Parcel</span>
            </button>
            <button
              type="button"
              onClick={() => openEditor(lastDispatchedShipment)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#9D7110] text-white border border-[#3C2B02] hover:bg-[#3C2B02] hover:text-[#CD9E34] text-xs font-extrabold cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Parcel</span>
            </button>
            <button
              type="button"
              onClick={() => setLastDispatchedShipment(null)}
              aria-label="Dismiss dispatched parcel banner"
              className="p-1.5 text-[#6b6b70] hover:text-[#1d1d1f] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Workspace Grid: Left Sidebar + Main Viewport */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left Navigation Sidebar (Darkest Yellow-Brown #3C2B02) */}
        <aside className="lg:col-span-3 bg-[#3C2B02] text-[#F2E9D4] border border-[#6D500C] p-3 space-y-1 lg:sticky lg:top-6">
          <div className="px-3 py-2.5 mb-2 bg-[#1E1501] text-[#F2E9D4] border border-[#6D500C] flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#CD9E34]">
                Signed in as Admin
              </p>
              <p className="text-xs font-bold truncate">Ops Lead · {adminEmail || 'Authenticated'}</p>
            </div>
            <ShieldCheck className="w-5 h-5 text-[#CD9E34] shrink-0" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-1 gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-xs font-bold transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#9D7110] text-white border-l-4 border-[#CD9E34]'
                      : 'text-[#F2E9D4] hover:bg-[#6D500C]/60'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-mono-tabular font-bold ${
                        active ? 'bg-[#1E1501] text-[#CD9E34]' : 'bg-[#1E1501]/70 text-[#F2E9D4]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* All App Pages Quick Switcher */}
          <div className="pt-4 mt-4 border-t border-[#6D500C] px-1">
            <p className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-[#CD9E34] mb-2">
              Jump to App Page
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  ['home', 'Home'],
                  ['track', 'Live Track'],
                  ['services', 'Services'],
                  ['business', 'Business'],
                  ['about', 'About'],
                  ['help', 'Help'],
                  ['contact', 'Contact'],
                  ['analytics', 'Playback'],
                ] as Array<[PageRoute, string]>
              ).map(([route, label]) => (
                <button
                  key={route}
                  type="button"
                  onClick={() => onNavigate(route)}
                  className="px-2.5 py-1.5 bg-[#1E1501] hover:bg-[#9D7110] hover:text-white text-[11px] font-bold text-[#F2E9D4] border border-[#6D500C]/60 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>{label}</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <div className="lg:col-span-9 space-y-6">
          {/* ================= OVERVIEW TAB ================= */}
          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-neutral-200 p-5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b6b70]">
                    Total Fleet Parcels
                  </span>
                  <div className="font-display text-3xl text-[#1d1d1f] mt-1 tabular-nums">
                    {shipments.length}
                  </div>
                  <p className="text-xs text-[#008a39] font-bold mt-1">
                    {metrics.inTransitCount} active · {metrics.deliveredCount} delivered
                  </p>
                </div>

                <div className="bg-white border border-neutral-200 p-5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b6b70]">
                    Collected Revenue
                  </span>
                  <div className="font-display text-3xl text-[#1d1d1f] mt-1 tabular-nums">
                    £{metrics.totalRevenue.toFixed(2)}
                  </div>
                  <p className="text-xs text-[#6b6b70] mt-1 tabular-nums">
                    £{metrics.pendingBalance.toFixed(2)} balance outstanding
                  </p>
                </div>

                <div className="bg-white border border-neutral-200 p-5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b6b70]">
                    Unread Push Alerts
                  </span>
                  <div className="font-display text-3xl text-[#FF5A1F] mt-1 tabular-nums">
                    {metrics.unreadAlerts}
                  </div>
                  <p className="text-xs text-[#6b6b70] mt-1">
                    {metrics.deviationsCount} corridor deviation(s)
                  </p>
                </div>

                <div className="bg-white border border-neutral-200 p-5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b6b70]">
                    Support & Sync
                  </span>
                  <div className="font-display text-3xl text-[#1B6CFF] mt-1 tabular-nums">
                    {metrics.openInbox + returnRequests.length}
                  </div>
                  <p className="text-xs text-[#6b6b70] mt-1">
                    {metrics.openInbox} open msgs · {offlineQueue.length} offline queued
                  </p>
                </div>
              </div>

              {/* Live Fleet Snapshot Map + Quick Dispatch Actions */}
              {activeShipment && (
                <div className="bg-white border border-neutral-200 p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="font-extrabold text-base text-[#1d1d1f]">
                        Active Fleet Telemetry · {activeShipment.tracking_no}
                      </h2>
                      <p className="text-xs text-[#6b6b70]">
                        {activeShipment.origin.city} → {activeShipment.dest.city} · Courier{' '}
                        {activeShipment.courier.name}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {shipments.slice(0, 4).map((s) => (
                        <button
                          key={s.tracking_no}
                          type="button"
                          onClick={() => onSelectTracking(s.tracking_no)}
                          className={`px-2.5 py-1 text-xs font-mono-tabular font-bold border cursor-pointer ${
                            s.tracking_no === activeShipment.tracking_no
                              ? 'bg-[#9D7110] text-white border-[#3C2B02]'
                              : 'bg-[#f2f2f2] border-neutral-200'
                          }`}
                        >
                          {s.tracking_no}
                        </button>
                      ))}
                    </div>
                  </div>

                  <MapViewport
                    shipment={activeShipment}
                    isOnline={isOnline}
                    quotaExceeded={quotaExceeded}
                    showGeofences={true}
                    heightClass="h-[290px]"
                  />
                </div>
              )}

              {/* Compact Fleet Overview Grid */}
              <div className="bg-white border border-neutral-200 overflow-x-auto">
                <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
                  <h2 className="font-extrabold text-base text-[#1d1d1f]">Recent Fleet Shipments</h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('shipments')}
                    className="text-xs font-extrabold text-[#1B6CFF] hover:underline cursor-pointer"
                  >
                    Manage all shipments →
                  </button>
                </div>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#f2f2f2] text-[#6b6b70] border-b border-neutral-200">
                      <th className="py-2.5 px-4">Tracking No</th>
                      <th className="py-2.5 px-4">Route</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Progress</th>
                      <th className="py-2.5 px-4 text-right">Total</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {shipments.slice(0, 6).map((s) => (
                      <tr key={s.tracking_no} className="hover:bg-[#F2E9D4]/50">
                        <td className="py-2.5 px-4 font-mono-tabular font-bold">
                          <div className="inline-flex items-center gap-1.5">
                            <span>{s.tracking_no}</span>
                            <button
                              type="button"
                              onClick={() => copyTrackingCode(s.tracking_no)}
                              title={`Copy ${s.tracking_no}`}
                              aria-label={`Copy ${s.tracking_no}`}
                              className="p-1 text-[#6b6b70] hover:text-[#1d1d1f] cursor-pointer"
                            >
                              {copiedCode === s.tracking_no ? (
                                <Check className="w-3 h-3 text-emerald-700" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          {s.origin.city.split(',')[0]} → {s.dest.city.split(',')[0]}
                        </td>
                        <td className="py-2.5 px-4 font-bold">{s.status}</td>
                        <td className="py-2.5 px-4 text-right font-mono-tabular">{s.progress}%</td>
                        <td className="py-2.5 px-4 text-right font-mono-tabular">{s.payment.total}</td>
                        <td className="py-2.5 px-4 text-right space-x-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openEditor(s)}
                            className="font-bold text-[#1B6CFF] hover:underline cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onSelectTracking(s.tracking_no);
                              onNavigate('track');
                            }}
                            className="font-bold text-[#1d1d1f] hover:underline cursor-pointer"
                          >
                            Track
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ================= SHIPMENTS CRUD TAB ================= */}
          {activeTab === 'shipments' && (
            <div className="bg-white border border-neutral-200 p-5 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 flex-1 max-w-xl">
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="w-4 h-4 text-[#6b6b70] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Enter or search tracking code, receipt, city, courier..."
                      className="w-full border border-neutral-300 pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-[#1d1d1f]"
                    />
                  </div>
                  {searchQuery.trim() && filteredShipments.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectTracking(filteredShipments[0].tracking_no);
                          onNavigate('track');
                        }}
                        className="px-2.5 py-2 bg-[#3C2B02] text-[#CD9E34] text-[11px] font-bold hover:bg-[#1E1501] cursor-pointer whitespace-nowrap"
                      >
                        Track {filteredShipments[0].tracking_no}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditor(filteredShipments[0])}
                        className="px-2.5 py-2 bg-[#9D7110] text-white border border-[#3C2B02] text-[11px] font-bold cursor-pointer whitespace-nowrap"
                      >
                        Edit Match
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['All', 'Picked Up', 'In Transit', 'Arrived at Hub', 'Delivered', 'Route Deviation'].map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatusFilter(st)}
                        className={`px-2.5 py-1.5 text-[11px] font-bold border cursor-pointer ${
                          statusFilter === st
                            ? 'bg-[#3C2B02] text-[#CD9E34] border-[#3C2B02]'
                            : 'bg-[#f2f2f2] text-[#1d1d1f] border-neutral-200'
                        }`}
                      >
                        {st}
                      </button>
                    )
                  )}
                </div>
              </div>

              {filteredShipments.length === 0 ? (
                <div className="p-10 text-center border border-dashed border-neutral-300 space-y-3">
                  <p className="text-sm font-bold text-[#1d1d1f]">No shipments match your filter.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('All');
                    }}
                    className="px-4 py-2 bg-[#9D7110] text-white text-xs font-extrabold cursor-pointer"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#f2f2f2] text-[#6b6b70] border-b border-neutral-200">
                        <th className="py-2.5 px-3">Tracking / Receipt</th>
                        <th className="py-2.5 px-3">Corridor</th>
                        <th className="py-2.5 px-3">Courier</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Progress</th>
                        <th className="py-2.5 px-3 text-right">Payment</th>
                        <th className="py-2.5 px-3 text-right">Controls</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {filteredShipments.map((s) => (
                        <tr key={s.tracking_no} className="hover:bg-[#F2E9D4]/50">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono-tabular font-bold text-[#1d1d1f]">
                                {s.tracking_no}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyTrackingCode(s.tracking_no)}
                                title={`Copy ${s.tracking_no}`}
                                aria-label={`Copy ${s.tracking_no}`}
                                className="p-1 text-[#6b6b70] hover:text-[#1d1d1f] cursor-pointer"
                              >
                                {copiedCode === s.tracking_no ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            <span className="font-mono-tabular text-[10px] text-[#6b6b70] block">
                              {s.receipt_no}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold block">
                              {s.origin.city.split(',')[0]} → {s.dest.city.split(',')[0]}
                            </span>
                            <span className="text-[11px] text-[#6b6b70] block">{s.receiver.name}</span>
                            {(s.receiver.phone || s.receiver.email) && (
                              <span className="text-[10px] font-mono-tabular text-neutral-500 block">
                                {[s.receiver.phone, s.receiver.email].filter(Boolean).join(' · ')}
                              </span>
                            )}
                            {(s.parcelImages?.length || s.proofImage) && (
                              <span className="text-[10px] font-bold text-[#1B6CFF] inline-flex items-center gap-1 mt-0.5">
                                <Camera className="w-3 h-3" />
                                <span>
                                  {Math.max(s.parcelImages?.length ?? 0, s.proofImage ? 1 : 0)} parcel photo
                                  {Math.max(s.parcelImages?.length ?? 0, s.proofImage ? 1 : 0) > 1 ? 's' : ''}
                                </span>
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="block font-medium">{s.courier.name}</span>
                            <span className="text-[10px] text-[#6b6b70] block">{s.courier.vehicle}</span>
                            <span className="text-[10px] font-mono-tabular text-neutral-500">{s.courier.phone}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-block px-2 py-0.5 text-[11px] font-bold ${
                                s.status === 'Delivered'
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : s.status === 'Route Deviation'
                                  ? 'bg-red-100 text-red-900'
                                  : 'bg-[#F2E9D4] text-[#3C2B02]'
                              }`}
                            >
                              {s.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-tabular font-bold">
                            {s.progress}%
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-tabular">
                            <span className="font-bold block">{s.payment.total}</span>
                            <span className="text-[10px] text-[#6b6b70]">{s.payment.state}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap space-x-1.5">
                            <button
                              type="button"
                              onClick={() => openEditor(s)}
                              aria-label={`Edit ${s.tracking_no}`}
                              className="px-2 py-1.5 bg-[#f2f2f2] hover:bg-[#9D7110] hover:text-white inline-flex items-center gap-1 font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onSelectTracking(s.tracking_no);
                                onNavigate('track');
                              }}
                              aria-label={`Live Track ${s.tracking_no}`}
                              className="px-2 py-1.5 bg-[#3C2B02] text-[#CD9E34] hover:bg-[#9D7110] hover:text-white inline-flex items-center gap-1 font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              <Navigation className="w-3 h-3" />
                              <span>Track</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onSelectTracking(s.tracking_no);
                                setPreviewReceiptShipment(s);
                              }}
                              aria-label={`Receipt ${s.tracking_no}`}
                              className="p-1.5 bg-[#f2f2f2] hover:bg-[#3C2B02] hover:text-[#CD9E34] inline-flex transition-colors cursor-pointer"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteShipment(s.tracking_no)}
                              aria-label={`Delete ${s.tracking_no}`}
                              className="p-1.5 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white inline-flex cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ================= LIVE GPS & GEOFENCES TAB ================= */}
          {activeTab === 'gps' && activeShipment && (
            <div className="space-y-6">
              <div className="bg-white border border-neutral-200 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-extrabold text-base text-[#1d1d1f]">
                    GPS Telemetry & Geofence Dispatcher
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {shipments.map((s) => (
                      <button
                        key={s.tracking_no}
                        type="button"
                        onClick={() => onSelectTracking(s.tracking_no)}
                        className={`px-2.5 py-1 text-xs font-mono-tabular font-bold border cursor-pointer ${
                          s.tracking_no === activeShipment.tracking_no
                            ? 'bg-[#9D7110] text-white border-[#3C2B02]'
                            : 'bg-[#f2f2f2] border-neutral-200'
                        }`}
                      >
                        {s.tracking_no}
                      </button>
                    ))}
                  </div>
                </div>

                <MapViewport
                  shipment={activeShipment}
                  isOnline={isOnline}
                  quotaExceeded={quotaExceeded}
                  showGeofences={true}
                  heightClass="h-[340px]"
                />

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await onUpdatePosition(
                      activeShipment.tracking_no,
                      {
                        lat: Number(gpsForm.lat),
                        lng: Number(gpsForm.lng),
                        location: gpsForm.location,
                        speedKmh: Number(gpsForm.speedKmh) || 0,
                        headingDeg: Number(gpsForm.headingDeg) || 0,
                      },
                      12000
                    );
                    showToast(`GPS ping pushed for ${activeShipment.tracking_no}`);
                  }}
                  className="grid sm:grid-cols-6 gap-3 pt-2 items-end"
                >
                  <div>
                    <label className="block text-[11px] font-bold mb-1">Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={gpsForm.lat}
                      onChange={(e) => setGpsForm((f) => ({ ...f, lat: e.target.value }))}
                      className="w-full border border-neutral-300 px-2.5 py-2 text-xs font-mono-tabular"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold mb-1">Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={gpsForm.lng}
                      onChange={(e) => setGpsForm((f) => ({ ...f, lng: e.target.value }))}
                      className="w-full border border-neutral-300 px-2.5 py-2 text-xs font-mono-tabular"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold mb-1">Location Sector</label>
                    <input
                      type="text"
                      value={gpsForm.location}
                      onChange={(e) => setGpsForm((f) => ({ ...f, location: e.target.value }))}
                      className="w-full border border-neutral-300 px-2.5 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold mb-1">Speed (km/h)</label>
                    <input
                      type="number"
                      value={gpsForm.speedKmh}
                      onChange={(e) => setGpsForm((f) => ({ ...f, speedKmh: e.target.value }))}
                      className="w-full border border-neutral-300 px-2.5 py-2 text-xs font-mono-tabular"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#3C2B02] text-[#CD9E34] text-xs font-extrabold hover:bg-[#9D7110] hover:text-white transition-colors cursor-pointer"
                  >
                    Push GPS Ping
                  </button>
                </form>
              </div>

              {/* Geofence Zones Manager */}
              <div className="bg-white border border-neutral-200 p-5 space-y-4">
                <h3 className="font-extrabold text-sm text-[#1d1d1f]">
                  Armed Geofences ({activeShipment.geofences.length})
                </h3>

                <div className="divide-y divide-neutral-200 border border-neutral-200">
                  {activeShipment.geofences.map((gf) => (
                    <div
                      key={gf.id}
                      className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <span className="font-bold text-[#1d1d1f]">{gf.name}</span>
                        <span className="block font-mono-tabular text-[11px] text-[#6b6b70]">
                          {gf.lat.toFixed(4)}, {gf.lng.toFixed(4)} · Radius{' '}
                          {(gf.radiusMeters / 1000).toFixed(1)} km · Type: {gf.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const next = activeShipment.geofences.map((g) =>
                              g.id === gf.id ? { ...g, active: !g.active } : g
                            );
                            onUpdateGeofences(activeShipment.tracking_no, next);
                          }}
                          className={`px-2.5 py-1 font-bold cursor-pointer ${
                            gf.active
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-neutral-200 text-neutral-700'
                          }`}
                        >
                          {gf.active ? 'Armed' : 'Paused'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const next = activeShipment.geofences.map((g) =>
                              g.id === gf.id ? { ...g, triggered: false } : g
                            );
                            onUpdateGeofences(activeShipment.tracking_no, next);
                          }}
                          className="px-2.5 py-1 bg-[#f2f2f2] font-bold cursor-pointer"
                        >
                          Reset Trigger
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const next = activeShipment.geofences.filter((g) => g.id !== gf.id);
                            onUpdateGeofences(activeShipment.tracking_no, next);
                          }}
                          className="p-1.5 text-red-700 hover:bg-red-50 cursor-pointer"
                          aria-label={`Remove geofence ${gf.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const zone: GeofenceZone = {
                      id: `gf-adm-${Date.now()}`,
                      name: newGfForm.name.trim() || 'Custom Zone',
                      lat: Number(newGfForm.lat) || activeShipment.current.lat,
                      lng: Number(newGfForm.lng) || activeShipment.current.lng,
                      radiusMeters: Math.max(500, (Number(newGfForm.radiusKm) || 5) * 1000),
                      type: newGfForm.type,
                      active: true,
                      triggered: false,
                    };
                    await onUpdateGeofences(activeShipment.tracking_no, [
                      ...activeShipment.geofences,
                      zone,
                    ]);
                    showToast(`Geofence "${zone.name}" added`);
                  }}
                  className="grid sm:grid-cols-6 gap-3 pt-2 items-end"
                >
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold mb-1">Zone Name</label>
                    <input
                      type="text"
                      value={newGfForm.name}
                      onChange={(e) => setNewGfForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full border border-neutral-300 px-2.5 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold mb-1">Lat</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={newGfForm.lat}
                      onChange={(e) => setNewGfForm((f) => ({ ...f, lat: e.target.value }))}
                      className="w-full border border-neutral-300 px-2.5 py-2 text-xs font-mono-tabular"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold mb-1">Lng</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={newGfForm.lng}
                      onChange={(e) => setNewGfForm((f) => ({ ...f, lng: e.target.value }))}
                      className="w-full border border-neutral-300 px-2.5 py-2 text-xs font-mono-tabular"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold mb-1">Radius (km)</label>
                    <input
                      type="number"
                      min="1"
                      value={newGfForm.radiusKm}
                      onChange={(e) => setNewGfForm((f) => ({ ...f, radiusKm: e.target.value }))}
                      className="w-full border border-neutral-300 px-2.5 py-2 text-xs font-mono-tabular"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#9D7110] hover:bg-[#3C2B02] border border-[#3C2B02] text-white text-xs font-extrabold transition-colors cursor-pointer"
                  >
                    + Add Zone
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ================= PUSH ALERTS & BROADCASTS TAB ================= */}
          {activeTab === 'alerts' && (
            <div className="grid lg:grid-cols-12 gap-6 items-start">
              <form
                onSubmit={handleBroadcastAlert}
                className="lg:col-span-5 bg-white border border-neutral-200 p-5 space-y-4"
              >
                <h2 className="font-extrabold text-base text-[#1d1d1f]">
                  Dispatch Push Notification
                </h2>
                <div>
                  <label className="block text-xs font-bold mb-1">Target Shipment</label>
                  <select
                    value={broadcastForm.trackingNo}
                    onChange={(e) =>
                      setBroadcastForm((f) => ({ ...f, trackingNo: e.target.value }))
                    }
                    className="w-full border border-neutral-300 px-3 py-2 text-xs font-mono-tabular"
                  >
                    {shipments.map((s) => (
                      <option key={s.tracking_no} value={s.tracking_no}>
                        {s.tracking_no} ({s.origin.city.split(',')[0]} → {s.dest.city.split(',')[0]})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Alert Category</label>
                  <select
                    value={broadcastForm.type}
                    onChange={(e) =>
                      setBroadcastForm((f) => ({
                        ...f,
                        type: e.target.value as PushAlert['type'],
                      }))
                    }
                    className="w-full border border-neutral-300 px-3 py-2 text-xs"
                  >
                    <option value="route_update">Route Update</option>
                    <option value="arrival">Driver Arrival</option>
                    <option value="geofence_enter">Geofence Entry</option>
                    <option value="deviation">Route Deviation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Notification Title</label>
                  <input
                    type="text"
                    required
                    value={broadcastForm.title}
                    onChange={(e) => setBroadcastForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full border border-neutral-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Message</label>
                  <textarea
                    rows={3}
                    required
                    value={broadcastForm.message}
                    onChange={(e) => setBroadcastForm((f) => ({ ...f, message: e.target.value }))}
                    className="w-full border border-neutral-300 px-3 py-2 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#9D7110] hover:bg-[#3C2B02] text-white text-xs font-extrabold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Broadcast Push Alert</span>
                </button>
              </form>

              <div className="lg:col-span-7 bg-white border border-neutral-200 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-extrabold text-base text-[#1d1d1f]">
                    Fleet Alert History ({alerts.length})
                  </h2>
                  <button
                    type="button"
                    onClick={onMarkAllAlertsRead}
                    className="text-xs font-bold text-[#1B6CFF] hover:underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                </div>

                <div className="divide-y divide-neutral-200 border border-neutral-200 max-h-[460px] overflow-y-auto">
                  {alerts.map((al) => (
                    <div key={al.id} className="p-3.5 flex items-start justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono-tabular font-bold text-[#1B6CFF]">
                            {al.trackingNo}
                          </span>
                          <span className="font-bold text-[#1d1d1f]">{al.title}</span>
                          {!al.read && (
                            <span className="px-1.5 py-0.5 bg-[#FF5A1F] text-white text-[10px] font-bold">
                              NEW
                            </span>
                          )}
                        </div>
                        <p className="text-[#6b6b70] mt-1">{al.message}</p>
                        <span className="text-[10px] font-mono-tabular text-neutral-400">
                          {al.timestamp}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectTracking(al.trackingNo);
                          onNavigate('track');
                        }}
                        className="text-[11px] font-bold underline shrink-0 cursor-pointer"
                      >
                        Inspect
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= RECEIPTS & PAYMENTS TAB ================= */}
          {activeTab === 'receipts' && (
            <div className="bg-white border border-neutral-200 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-extrabold text-base text-[#1d1d1f]">
                    Stamped Digital Receipts & Payments Ledger
                  </h2>
                  <p className="text-xs text-[#6b6b70]">
                    Update payment stamps in real time or open printable QR receipts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="px-4 py-2 bg-[#9D7110] hover:bg-[#3C2B02] text-white border border-[#3C2B02] text-xs font-extrabold transition-colors cursor-pointer"
                >
                  + New Dispatch Shipment
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#f2f2f2] text-[#6b6b70] border-b border-neutral-200">
                      <th className="py-2.5 px-3">Receipt Ref</th>
                      <th className="py-2.5 px-3">Tracking</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                      <th className="py-2.5 px-3 text-right">Paid</th>
                      <th className="py-2.5 px-3 text-right">Balance</th>
                      <th className="py-2.5 px-3">Stamp State</th>
                      <th className="py-2.5 px-3 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {shipments.map((s) => (
                      <tr key={s.tracking_no} className="hover:bg-[#F2E9D4]/50">
                        <td className="py-2.5 px-3 font-mono-tabular font-bold">{s.receipt_no}</td>
                        <td className="py-2.5 px-3 font-mono-tabular">{s.tracking_no}</td>
                        <td className="py-2.5 px-3 text-[#6b6b70]">{s.payment.method}</td>
                        <td className="py-2.5 px-3 text-right font-mono-tabular font-bold">
                          {s.payment.total}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-tabular text-[#008a39]">
                          {s.payment.paid}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-tabular text-[#FF5A1F]">
                          {s.payment.balance}
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            aria-label={`Payment state for ${s.tracking_no}`}
                            value={s.payment.state}
                            onChange={(e) =>
                              handleQuickPaymentStamp(
                                s.tracking_no,
                                e.target.value as Shipment['payment']['state']
                              )
                            }
                            className="border border-neutral-300 px-2 py-1 text-[11px] font-bold bg-white"
                          >
                            {PAYMENT_STATES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectTracking(s.tracking_no);
                              setPreviewReceiptShipment(s);
                            }}
                            className="px-2.5 py-1 bg-[#3C2B02] text-[#CD9E34] hover:bg-[#9D7110] hover:text-white text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            View QR
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= ANALYTICS & ROUTE PLAYBACK TAB ================= */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="bg-white border border-neutral-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-extrabold text-base text-[#1d1d1f]">
                    Fleet SLA & Historical Route Playback
                  </h2>
                  <p className="text-xs text-[#6b6b70]">
                    Monitor daily parcel dispatch volume, geofence compliance, or launch the full waypoint scrubber.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('analytics')}
                  className="px-4 py-2.5 bg-[#3C2B02] text-[#CD9E34] hover:bg-[#9D7110] hover:text-white text-xs font-extrabold shrink-0 transition-colors cursor-pointer"
                >
                  Open Full Playback Studio →
                </button>
              </div>

              <div className="bg-white border border-neutral-200 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-extrabold text-sm text-[#1d1d1f]">
                    Weekly Parcel Volume & On-Time SLA
                  </h3>
                  <span className="font-mono-tabular text-xs font-bold text-[#008a39]">
                    Avg 99.4% SLA
                  </span>
                </div>
                <div className="h-48 flex items-end justify-between gap-3 border-b border-neutral-200 pb-2">
                  {ANALYTICS_DAILY_VOLUME.map((d) => {
                    const heightPct = Math.round((d.parcels / 560) * 100);
                    return (
                      <div key={d.day} className="flex-1 flex flex-col items-center h-full justify-end">
                        <span className="text-[11px] font-mono-tabular font-bold mb-1">
                          {d.parcels}
                        </span>
                        <div
                          className="w-full max-w-[44px] bg-[#3C2B02] hover:bg-[#9D7110] transition-colors"
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between gap-3 pt-2 text-xs font-bold text-[#6b6b70]">
                  {ANALYTICS_DAILY_VOLUME.map((d) => (
                    <div key={d.day} className="flex-1 text-center">
                      <span>{d.day}</span>
                      <span className="block text-[10px] font-mono-tabular text-neutral-400">
                        {d.onTimePct}% · {d.deviations} dev
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= REAL-TIME SUPPORT TICKETS & RETURNS TAB ================= */}
          {activeTab === 'inbox' && (
            <div className="space-y-6">
              {/* Real-Time Support Tickets & Live Reply Desk */}
              <div className="bg-white border border-neutral-200 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="font-extrabold text-base text-[#1d1d1f] flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#9D7110]" />
                      <span>
                        Email &amp; Live Support Inbox ({siteSettings.contact.email}) ·{' '}
                        {supportTickets.length}
                      </span>
                    </h2>
                    <p className="text-xs text-[#6b6b70]">
                      Messages sent to <strong>{siteSettings.contact.email}</strong> arrive here immediately. Reply below to deliver back to the user in real time.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ['all', 'All'],
                        ['open', 'Open'],
                        ['in_progress', 'In Progress'],
                        ['resolved', 'Resolved'],
                      ] as const
                    ).map(([statusKey, label]) => (
                      <button
                        key={statusKey}
                        type="button"
                        onClick={() => setTicketFilter(statusKey)}
                        className={`px-3 py-1 text-[11px] font-bold border cursor-pointer ${
                          ticketFilter === statusKey
                            ? 'bg-[#3C2B02] text-[#CD9E34] border-[#3C2B02]'
                            : 'bg-white text-[#1d1d1f] border-neutral-300 hover:bg-[#f2f2f2]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {supportTickets.length === 0 ? (
                  <p className="text-xs text-[#6b6b70] py-6 text-center border border-dashed border-neutral-300">
                    No support tickets submitted yet.
                  </p>
                ) : (
                  <div className="grid lg:grid-cols-12 border border-neutral-200 min-h-[420px]">
                    {/* Left Column: Ticket List */}
                    <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-neutral-200 divide-y divide-neutral-200 max-h-[520px] overflow-y-auto">
                      {filteredTickets.length === 0 ? (
                        <p className="p-4 text-xs text-[#6b6b70]">
                          No tickets match the selected filter.
                        </p>
                      ) : (
                        filteredTickets.map((ticket) => {
                          const selected = activeTicket?.id === ticket.id;
                          const lastMsg = ticket.replies[ticket.replies.length - 1];
                          const waitingOnAdmin = lastMsg?.senderRole === 'visitor' && ticket.status !== 'resolved';
                          return (
                            <button
                              key={ticket.id}
                              type="button"
                              onClick={() => setSelectedTicketId(ticket.id)}
                              className={`w-full text-left p-3.5 transition-colors cursor-pointer ${
                                selected
                                  ? 'bg-[#F2E9D4] border-l-4 border-l-[#9D7110]'
                                  : 'bg-white hover:bg-[#f2f2f2]'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="font-mono-tabular text-[11px] font-extrabold text-[#1d1d1f]">
                                  {ticket.ticketCode}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {waitingOnAdmin && (
                                    <span className="px-1.5 py-0.5 bg-[#FF5A1F] text-white text-[9px] font-extrabold uppercase">
                                      Needs Reply
                                    </span>
                                  )}
                                  <span
                                    className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                                      ticket.status === 'resolved'
                                        ? 'bg-emerald-100 text-emerald-900'
                                        : ticket.status === 'in_progress'
                                          ? 'bg-blue-100 text-blue-900'
                                          : 'bg-[#F2E9D4] text-[#3C2B02] border border-[#CD9E34]'
                                    }`}
                                  >
                                    {ticket.status === 'in_progress' ? 'Replied' : ticket.status}
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs font-extrabold text-[#1d1d1f] truncate">
                                {ticket.subject}
                              </p>
                              <p className="text-[11px] text-[#6b6b70] truncate mt-0.5">
                                {ticket.name} · {ticket.email}
                              </p>
                              <div className="flex items-center justify-between mt-1.5 text-[10px] text-[#6b6b70]">
                                <span>
                                  {ticket.category}
                                  {ticket.trackingNo ? ` · #${ticket.trackingNo}` : ''}
                                </span>
                                <span className="font-mono-tabular">
                                  {ticket.replies.length} msg{ticket.replies.length === 1 ? '' : 's'}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>

                    {/* Right Column: Live Ticket Conversation & Reply Box */}
                    <div className="lg:col-span-7 flex flex-col bg-[#f9f9fb]">
                      {activeTicket ? (
                        <>
                          <div className="p-4 bg-white border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono-tabular text-xs font-extrabold bg-[#3C2B02] text-[#CD9E34] px-2 py-0.5">
                                  {activeTicket.ticketCode}
                                </span>
                                <span className="text-xs font-extrabold text-[#1d1d1f] truncate">
                                  {activeTicket.subject}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#6b6b70] mt-1">
                                From: <strong>{activeTicket.name}</strong> ({activeTicket.email}) · To:{' '}
                                <strong>{siteSettings.contact.email}</strong>
                                {activeTicket.trackingNo ? (
                                  <>
                                    {' · Parcel '}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onSelectTracking(activeTicket.trackingNo!);
                                        onNavigate('track');
                                      }}
                                      className="font-mono-tabular font-bold text-[#1B6CFF] underline cursor-pointer"
                                    >
                                      #{activeTicket.trackingNo}
                                    </button>
                                  </>
                                ) : null}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {(['open', 'in_progress', 'resolved'] as const).map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => handleChangeTicketStatus(activeTicket.id, st)}
                                  className={`px-2.5 py-1 text-[10px] font-bold uppercase border cursor-pointer ${
                                    activeTicket.status === st
                                      ? 'bg-[#3C2B02] text-[#CD9E34] border-[#3C2B02]'
                                      : 'bg-white text-[#1d1d1f] border-neutral-300 hover:bg-[#f2f2f2]'
                                  }`}
                                >
                                  {st === 'in_progress' ? 'In Progress' : st}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Real-Time Chat Messages */}
                          <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[310px]">
                            {activeTicket.replies.map((rep) => {
                              const isAdminMsg = rep.senderRole === 'admin';
                              return (
                                <div
                                  key={rep.id}
                                  className={`flex flex-col ${isAdminMsg ? 'items-end' : 'items-start'}`}
                                >
                                  <div
                                    className={`max-w-[85%] px-3.5 py-2.5 text-xs border ${
                                      isAdminMsg
                                        ? 'bg-[#1d1d1f] text-white border-[#1d1d1f]'
                                        : 'bg-white text-[#1d1d1f] border-neutral-300'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-3 mb-1 text-[10px]">
                                      <span
                                        className={`font-extrabold ${
                                          isAdminMsg ? 'text-[#CD9E34]' : 'text-[#1B6CFF]'
                                        }`}
                                      >
                                        {rep.senderName}
                                      </span>
                                      <span
                                        className={isAdminMsg ? 'text-neutral-400' : 'text-[#6b6b70]'}
                                      >
                                        {new Date(rep.createdAt).toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                    </div>
                                    <p className="leading-relaxed whitespace-pre-wrap">{rep.text}</p>
                                  </div>
                                </div>
                              );
                            })}
                            <div ref={ticketChatEndRef} />
                          </div>

                          {/* Instant Admin Reply Form */}
                          <form
                            onSubmit={handleSendAdminReply}
                            className="p-3 bg-white border-t border-neutral-200 flex gap-2"
                          >
                            <input
                              type="text"
                              value={adminReplyText}
                              onChange={(e) => setAdminReplyText(e.target.value)}
                              placeholder={`Reply in real time to ${activeTicket.name}...`}
                              className="flex-1 border border-neutral-300 px-3 py-2 text-xs focus:outline-none focus:border-[#1d1d1f]"
                            />
                            <button
                              type="submit"
                              disabled={replySending || !adminReplyText.trim()}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#9D7110] border border-[#3C2B02] text-white text-xs font-extrabold hover:bg-[#3C2B02] hover:text-[#CD9E34] disabled:opacity-40 transition-colors cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>{replySending ? 'Sending...' : 'Send Reply'}</span>
                            </button>
                          </form>
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center p-6 text-xs text-[#6b6b70]">
                          Select a support ticket to view and reply in real time.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Legacy Contact Messages (if any offline queued) */}
              {contactMessages.length > 0 && (
                <div className="bg-white border border-neutral-200 p-5 space-y-3">
                  <h3 className="font-extrabold text-sm text-[#1d1d1f]">
                    Archived Contact Notes ({contactMessages.length})
                  </h3>
                  <div className="divide-y divide-neutral-200 border border-neutral-200">
                    {contactMessages.map((msg) => (
                      <div key={msg.id} className="p-3.5 space-y-2 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="font-extrabold text-[#1d1d1f]">{msg.subject}</span>
                            <span className="ml-2 text-[#6b6b70]">
                              {msg.name} ({msg.email})
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                              msg.status === 'resolved'
                                ? 'bg-emerald-100 text-emerald-900'
                                : 'bg-[#F2E9D4] text-[#3C2B02]'
                            }`}
                          >
                            {msg.status}
                          </span>
                        </div>
                        <p className="text-[#1d1d1f] bg-[#f2f2f2] p-2.5">{msg.message}</p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            placeholder="Add resolution note..."
                            value={noteDrafts[msg.id] ?? msg.adminNote ?? ''}
                            onChange={(e) =>
                              setNoteDrafts((d) => ({ ...d, [msg.id]: e.target.value }))
                            }
                            className="flex-1 border border-neutral-300 px-3 py-1.5 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleToggleContactStatus(msg)}
                            className="px-4 py-1.5 bg-[#3C2B02] text-[#CD9E34] font-bold cursor-pointer"
                          >
                            {msg.status === 'resolved' ? 'Reopen' : 'Mark Resolved'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Returns Queue */}
              <div className="bg-white border border-neutral-200 p-5 space-y-4">
                <h2 className="font-extrabold text-base text-[#1d1d1f]">
                  Drop-Point Returns Queue ({returnRequests.length})
                </h2>

                <form onSubmit={handleIssueReturn} className="grid sm:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="block text-[11px] font-bold mb-1">Return Code</label>
                    <input
                      type="text"
                      placeholder="Auto RET-UK-XXXX"
                      value={newReturnForm.code}
                      onChange={(e) => setNewReturnForm((r) => ({ ...r, code: e.target.value }))}
                      className="w-full border border-neutral-300 px-2.5 py-2 text-xs font-mono-tabular"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold mb-1">Retailer</label>
                    <input
                      type="text"
                      value={newReturnForm.retailer}
                      onChange={(e) =>
                        setNewReturnForm((r) => ({ ...r, retailer: e.target.value }))
                      }
                      className="w-full border border-neutral-300 px-2.5 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold mb-1">Drop Point</label>
                    <input
                      type="text"
                      value={newReturnForm.dropPoint}
                      onChange={(e) =>
                        setNewReturnForm((r) => ({ ...r, dropPoint: e.target.value }))
                      }
                      className="w-full border border-neutral-300 px-2.5 py-2 text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#9D7110] hover:bg-[#3C2B02] text-white border border-[#3C2B02] text-xs font-extrabold transition-colors cursor-pointer"
                  >
                    + Issue Return Pass
                  </button>
                </form>

                <div className="divide-y divide-neutral-200 border border-neutral-200">
                  {returnRequests.map((ret) => (
                    <div
                      key={ret.id}
                      className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <span className="font-mono-tabular font-bold text-[#1d1d1f]">
                          {ret.code}
                        </span>
                        <span className="ml-2 text-[#6b6b70]">
                          {ret.retailer} · {ret.dropPoint}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCycleReturnStatus(ret)}
                        className="px-3 py-1 bg-[#3C2B02] text-[#CD9E34] hover:bg-[#9D7110] hover:text-white font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        {ret.status} (Advance)
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Help FAQs & Reviews Summary */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white border border-neutral-200 p-5 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-extrabold text-sm">
                      Published Help FAQs ({siteSettings.help.faqs.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('content')}
                      className="text-xs font-bold text-[#1B6CFF] hover:underline cursor-pointer"
                    >
                      Edit FAQs &amp; Content →
                    </button>
                  </div>
                  {siteSettings.help.faqs.slice(0, 5).map((item, i) => (
                    <div key={`${item.q}-${i}`} className="text-xs py-1.5 border-b border-neutral-100">
                      <span className="font-bold block">{item.q}</span>
                      <span className="text-[#6b6b70]">{item.category}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-white border border-neutral-200 p-5 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-extrabold text-sm">Verified Reviews ({REVIEWS.length})</h3>
                    <button
                      type="button"
                      onClick={() => onNavigate('about')}
                      className="text-xs font-bold text-[#1B6CFF] hover:underline cursor-pointer"
                    >
                      View About Page
                    </button>
                  </div>
                  {REVIEWS.map((r) => (
                    <div key={r.name} className="text-xs py-1.5 border-b border-neutral-100">
                      <span className="font-bold">
                        {r.name} ({r.city})
                      </span>
                      <p className="text-[#6b6b70] truncate">{r.quote}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= SITE CONTENT, CONTACT, ABOUT & HELP EDITOR TAB ================= */}
          {activeTab === 'content' && (
            <form onSubmit={handleSaveSiteSettings} className="space-y-6">
              {/* Top Save Action Bar */}
              <div className="bg-white border-2 border-[#1d1d1f] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-extrabold text-base text-[#1d1d1f]">
                    Live Site Content, Contact Info, About &amp; Help Editor
                  </h2>
                  <p className="text-xs text-[#6b6b70]">
                    Changes saved here update the Footer, Contact page, About page, Help Centre, and Digital Receipts in real time.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#9D7110] text-white border border-[#3C2B02] text-xs font-extrabold hover:bg-[#3C2B02] hover:text-[#CD9E34] transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingSettings ? 'Publishing...' : 'Publish All Changes Live'}</span>
                </button>
              </div>

              {/* 1. Company Address, Email, Phone & Hours */}
              <div className="bg-white border border-neutral-200 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-[#1d1d1f] flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#1B6CFF]" />
                    <span>Company Address, Email, Phone, WhatsApp &amp; Hours</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => onNavigate('contact')}
                    className="text-xs font-bold text-[#1B6CFF] hover:underline cursor-pointer"
                  >
                    Preview Contact Page →
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block font-bold mb-1">Head Office Address</label>
                    <input
                      type="text"
                      required
                      value={settingsDraft.contact.address}
                      onChange={(e) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          contact: { ...prev.contact, address: e.target.value },
                        }))
                      }
                      className="w-full border border-neutral-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Support Email</label>
                    <input
                      type="email"
                      required
                      value={settingsDraft.contact.email}
                      onChange={(e) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          contact: { ...prev.contact, email: e.target.value },
                        }))
                      }
                      className="w-full border border-neutral-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Support Phone Number</label>
                    <input
                      type="text"
                      required
                      value={settingsDraft.contact.phone}
                      onChange={(e) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          contact: { ...prev.contact, phone: e.target.value },
                        }))
                      }
                      className="w-full border border-neutral-300 px-3 py-2"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold mb-1">WhatsApp Live Chat Number</label>
                    <input
                      type="text"
                      value={settingsDraft.contact.whatsapp ?? '+447447484073'}
                      onChange={(e) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          contact: { ...prev.contact, whatsapp: e.target.value },
                        }))
                      }
                      placeholder="+447447484073"
                      className="w-full border border-neutral-300 px-3 py-2 font-mono-tabular"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#6b6b70]" />
                      <span>Support Line Hours</span>
                    </label>
                    <input
                      type="text"
                      value={settingsDraft.contact.supportHours}
                      onChange={(e) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          contact: { ...prev.contact, supportHours: e.target.value },
                        }))
                      }
                      className="w-full border border-neutral-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Commercial / Fleet Hours</label>
                    <input
                      type="text"
                      value={settingsDraft.contact.salesHours}
                      onChange={(e) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          contact: { ...prev.contact, salesHours: e.target.value },
                        }))
                      }
                      className="w-full border border-neutral-300 px-3 py-2"
                    />
                  </div>
                </div>
              </div>

              {/* 2. About Page Content Editor */}
              <div className="bg-white border border-neutral-200 p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-[#1d1d1f]">
                    About Metro Parcel Service Page Content
                  </h3>
                  <button
                    type="button"
                    onClick={() => onNavigate('about')}
                    className="text-xs font-bold text-[#1B6CFF] hover:underline cursor-pointer"
                  >
                    Preview About Page →
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold mb-1">Eyebrow Label</label>
                    <input
                      type="text"
                      value={settingsDraft.about.eyebrow}
                      onChange={(e) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          about: { ...prev.about, eyebrow: e.target.value },
                        }))
                      }
                      className="w-full border border-neutral-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Hero Headline</label>
                    <input
                      type="text"
                      value={settingsDraft.about.headline}
                      onChange={(e) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          about: { ...prev.about, headline: e.target.value },
                        }))
                      }
                      className="w-full border border-neutral-300 px-3 py-2"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold mb-1">About Introduction Paragraph</label>
                    <textarea
                      rows={3}
                      value={settingsDraft.about.intro}
                      onChange={(e) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          about: { ...prev.about, intro: e.target.value },
                        }))
                      }
                      className="w-full border border-neutral-300 px-3 py-2"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <label className="block font-bold">Hero Image URL</label>
                    <input
                      type="text"
                      value={settingsDraft.about.heroImage}
                      onChange={(e) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          about: { ...prev.about, heroImage: e.target.value },
                        }))
                      }
                      className="w-full border border-neutral-300 px-3 py-2 font-mono-tabular"
                    />
                    <div className="flex flex-wrap gap-2">
                      {[
                        {
                          label: 'Team Operations',
                          url: '/src/assets/images/golden_courier_team_1795375425251.jpg',
                        },
                        {
                          label: 'EV Courier Van',
                          url: '/src/assets/images/about_fleet_team_1795252246049.jpg',
                        },
                        {
                          label: 'Doorstep Delivery',
                          url: '/src/assets/images/golden_courier_driver_1795375426210.jpg',
                        },
                      ].map((preset) => (
                        <button
                          key={preset.url}
                          type="button"
                          onClick={() =>
                            setSettingsDraft((prev) => ({
                              ...prev,
                              about: { ...prev.about, heroImage: preset.url },
                            }))
                          }
                          className="px-2.5 py-1 bg-[#f2f2f2] border border-neutral-300 hover:border-[#1d1d1f] text-[11px] font-bold cursor-pointer"
                        >
                          Use {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Core Values (3 columns) */}
                <div className="space-y-2 pt-2 border-t border-neutral-200">
                  <span className="text-xs font-extrabold text-[#1d1d1f] block">
                    Core Values ({settingsDraft.about.values.length})
                  </span>
                  <div className="grid md:grid-cols-3 gap-3 text-xs">
                    {settingsDraft.about.values.map((val, idx) => (
                      <div key={idx} className="p-3 bg-[#f2f2f2] border border-neutral-200 space-y-2">
                        <input
                          type="text"
                          value={val.title}
                          onChange={(e) =>
                            setSettingsDraft((prev) => ({
                              ...prev,
                              about: {
                                ...prev.about,
                                values: prev.about.values.map((v, i) =>
                                  i === idx ? { ...v, title: e.target.value } : v
                                ),
                              },
                            }))
                          }
                          className="w-full border border-neutral-300 px-2.5 py-1.5 bg-white font-bold"
                        />
                        <textarea
                          rows={3}
                          value={val.desc}
                          onChange={(e) =>
                            setSettingsDraft((prev) => ({
                              ...prev,
                              about: {
                                ...prev.about,
                                values: prev.about.values.map((v, i) =>
                                  i === idx ? { ...v, desc: e.target.value } : v
                                ),
                              },
                            }))
                          }
                          className="w-full border border-neutral-300 px-2.5 py-1.5 bg-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Milestones */}
                <div className="space-y-3 pt-2 border-t border-neutral-200 text-xs">
                  <span className="font-extrabold text-[#1d1d1f] block">
                    Company Milestones ({settingsDraft.about.milestones.length})
                  </span>
                  <div className="space-y-2">
                    {settingsDraft.about.milestones.map((m, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                        <input
                          type="text"
                          value={m.year}
                          onChange={(e) =>
                            setSettingsDraft((prev) => ({
                              ...prev,
                              about: {
                                ...prev.about,
                                milestones: prev.about.milestones.map((item, i) =>
                                  i === idx ? { ...item, year: e.target.value } : item
                                ),
                              },
                            }))
                          }
                          className="w-full sm:w-24 border border-neutral-300 px-2.5 py-1.5 font-mono-tabular font-bold"
                        />
                        <input
                          type="text"
                          value={m.text}
                          onChange={(e) =>
                            setSettingsDraft((prev) => ({
                              ...prev,
                              about: {
                                ...prev.about,
                                milestones: prev.about.milestones.map((item, i) =>
                                  i === idx ? { ...item, text: e.target.value } : item
                                ),
                              },
                            }))
                          }
                          className="flex-1 border border-neutral-300 px-2.5 py-1.5"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setSettingsDraft((prev) => ({
                              ...prev,
                              about: {
                                ...prev.about,
                                milestones: prev.about.milestones.filter((_, i) => i !== idx),
                              },
                            }))
                          }
                          className="px-2.5 py-1.5 border border-red-200 text-red-700 hover:bg-red-600 hover:text-white font-bold cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Year"
                      value={newMilestone.year}
                      onChange={(e) => setNewMilestone((m) => ({ ...m, year: e.target.value }))}
                      className="w-full sm:w-24 border border-neutral-300 px-2.5 py-1.5 font-mono-tabular"
                    />
                    <input
                      type="text"
                      placeholder="Add new company milestone..."
                      value={newMilestone.text}
                      onChange={(e) => setNewMilestone((m) => ({ ...m, text: e.target.value }))}
                      className="flex-1 border border-neutral-300 px-2.5 py-1.5"
                    />
                    <button
                      type="button"
                      onClick={handleAddMilestone}
                      className="px-4 py-1.5 bg-[#3C2B02] text-[#CD9E34] hover:bg-[#9D7110] hover:text-white font-bold transition-colors cursor-pointer"
                    >
                      + Add Milestone
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Help Centre & FAQs Editor */}
              <div className="bg-white border border-neutral-200 p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-[#1d1d1f]">
                    Help Centre &amp; Published FAQs ({settingsDraft.help.faqs.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => onNavigate('help')}
                    className="text-xs font-bold text-[#1B6CFF] hover:underline cursor-pointer"
                  >
                    Preview Help Page →
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold mb-1">Help Eyebrow Label</label>
                    <input
                      type="text"
                      value={settingsDraft.help.eyebrow}
                      onChange={(e) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          help: { ...prev.help, eyebrow: e.target.value },
                        }))
                      }
                      className="w-full border border-neutral-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Help Page Headline</label>
                    <input
                      type="text"
                      value={settingsDraft.help.headline}
                      onChange={(e) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          help: { ...prev.help, headline: e.target.value },
                        }))
                      }
                      className="w-full border border-neutral-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Search Placeholder</label>
                    <input
                      type="text"
                      value={settingsDraft.help.searchPlaceholder}
                      onChange={(e) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          help: { ...prev.help, searchPlaceholder: e.target.value },
                        }))
                      }
                      className="w-full border border-neutral-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">CTA Box Title</label>
                    <input
                      type="text"
                      value={settingsDraft.help.stillStuckTitle}
                      onChange={(e) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          help: { ...prev.help, stillStuckTitle: e.target.value },
                        }))
                      }
                      className="w-full border border-neutral-300 px-3 py-2"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold mb-1">CTA Box Subtitle</label>
                    <input
                      type="text"
                      value={settingsDraft.help.stillStuckSubtitle}
                      onChange={(e) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          help: { ...prev.help, stillStuckSubtitle: e.target.value },
                        }))
                      }
                      className="w-full border border-neutral-300 px-3 py-2"
                    />
                  </div>
                </div>

                {/* FAQ List Editor */}
                <div className="space-y-3 pt-2 border-t border-neutral-200 text-xs">
                  <span className="font-extrabold text-[#1d1d1f] block">
                    Manage Help Articles &amp; FAQs
                  </span>
                  <div className="space-y-3">
                    {settingsDraft.help.faqs.map((faq, idx) => (
                      <div key={idx} className="p-3.5 bg-[#f2f2f2] border border-neutral-200 space-y-2">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={faq.category}
                            placeholder="Category"
                            onChange={(e) =>
                              setSettingsDraft((prev) => ({
                                ...prev,
                                help: {
                                  ...prev.help,
                                  faqs: prev.help.faqs.map((item, i) =>
                                    i === idx ? { ...item, category: e.target.value } : item
                                  ),
                                },
                              }))
                            }
                            className="sm:w-48 border border-neutral-300 px-2.5 py-1.5 bg-white font-bold"
                          />
                          <input
                            type="text"
                            value={faq.q}
                            placeholder="Question"
                            onChange={(e) =>
                              setSettingsDraft((prev) => ({
                                ...prev,
                                help: {
                                  ...prev.help,
                                  faqs: prev.help.faqs.map((item, i) =>
                                    i === idx ? { ...item, q: e.target.value } : item
                                  ),
                                },
                              }))
                            }
                            className="flex-1 border border-neutral-300 px-2.5 py-1.5 bg-white font-bold"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setSettingsDraft((prev) => ({
                                ...prev,
                                help: {
                                  ...prev.help,
                                  faqs: prev.help.faqs.filter((_, i) => i !== idx),
                                },
                              }))
                            }
                            className="px-2.5 py-1.5 border border-red-200 text-red-700 hover:bg-red-600 hover:text-white font-bold cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                        <textarea
                          rows={2}
                          value={faq.a}
                          placeholder="Answer"
                          onChange={(e) =>
                            setSettingsDraft((prev) => ({
                              ...prev,
                              help: {
                                ...prev.help,
                                faqs: prev.help.faqs.map((item, i) =>
                                  i === idx ? { ...item, a: e.target.value } : item
                                ),
                              },
                            }))
                          }
                          className="w-full border border-neutral-300 px-2.5 py-1.5 bg-white"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Add New FAQ */}
                  <div className="p-4 border-2 border-dashed border-neutral-300 space-y-2.5 bg-white">
                    <span className="font-extrabold text-[#1d1d1f] block">+ Add New FAQ Entry</span>
                    <div className="grid sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Category (e.g. Tracking & GPS)"
                        value={newFaq.category}
                        onChange={(e) => setNewFaq((f) => ({ ...f, category: e.target.value }))}
                        className="border border-neutral-300 px-2.5 py-1.5"
                      />
                      <input
                        type="text"
                        placeholder="Question..."
                        value={newFaq.q}
                        onChange={(e) => setNewFaq((f) => ({ ...f, q: e.target.value }))}
                        className="sm:col-span-2 border border-neutral-300 px-2.5 py-1.5"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Detailed answer shown on Help & Home pages..."
                        value={newFaq.a}
                        onChange={(e) => setNewFaq((f) => ({ ...f, a: e.target.value }))}
                        className="flex-1 border border-neutral-300 px-2.5 py-1.5"
                      />
                      <button
                        type="button"
                        onClick={handleAddFaq}
                        className="px-4 py-1.5 bg-[#3C2B02] text-[#CD9E34] hover:bg-[#9D7110] hover:text-white font-bold transition-colors cursor-pointer"
                      >
                        + Add FAQ
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-neutral-200">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#9D7110] text-white border border-[#3C2B02] text-xs font-extrabold hover:bg-[#3C2B02] hover:text-[#CD9E34] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingSettings ? 'Publishing...' : 'Save & Publish All Site Content'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ================= BUSINESS BULK CSV & OFFLINE SYNC TAB ================= */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              {/* Bulk CSV Importer */}
              <div className="bg-white border border-neutral-200 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-extrabold text-base text-[#1d1d1f] flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Business Bulk CSV Label Importer</span>
                    </h2>
                    <p className="text-xs text-[#6b6b70]">
                      Format: TrackingNo, OriginCity, DestCity, ReceiverName, Service, WeightKg, TotalGBP
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('business')}
                    className="text-xs font-bold text-[#1B6CFF] hover:underline cursor-pointer"
                  >
                    View Business Portal
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  className="w-full border border-neutral-300 p-3 font-mono-tabular text-xs"
                />
                <button
                  type="button"
                  onClick={handleBulkCsvImport}
                  className="px-5 py-2.5 bg-[#9D7110] hover:bg-[#3C2B02] border border-[#3C2B02] text-white text-xs font-extrabold transition-colors cursor-pointer"
                >
                  Import CSV Batch into Live Fleet
                </button>
              </div>

              {/* Offline Mode, Sync Queue, Push Permissions & Demo Reset */}
              <div className="bg-white border border-neutral-200 p-5 space-y-4">
                <h2 className="font-extrabold text-base text-[#1d1d1f]">
                  PWA Offline Mode, Push Permissions & System Controls
                </h2>

                <div className="grid sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 bg-[#f2f2f2] border border-neutral-200 space-y-2">
                    <div className="flex items-center gap-2 font-bold">
                      {isOnline ? (
                        <Wifi className="w-4 h-4 text-[#008a39]" />
                      ) : (
                        <WifiOff className="w-4 h-4 text-[#FF5A1F]" />
                      )}
                      <span>{isOnline ? 'Network Online' : 'Offline Mode Active'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={onToggleSimulatedOffline}
                      className="w-full py-2 bg-[#3C2B02] text-[#CD9E34] hover:bg-[#1E1501] font-bold transition-colors cursor-pointer"
                    >
                      {simulatedOffline ? 'Disable Offline Test' : 'Test Offline Mode'}
                    </button>
                  </div>

                  <div className="p-4 bg-[#f2f2f2] border border-neutral-200 space-y-2">
                    <div className="flex items-center gap-2 font-bold">
                      <RefreshCw className="w-4 h-4 text-[#1B6CFF]" />
                      <span>Offline Queue ({offlineQueue.length})</span>
                    </div>
                    <button
                      type="button"
                      onClick={onSyncNow}
                      disabled={!isOnline || offlineQueue.length === 0}
                      className="w-full py-2 bg-[#1B6CFF] text-white font-bold disabled:opacity-40 cursor-pointer"
                    >
                      Force Sync Queue
                    </button>
                  </div>

                  <div className="p-4 bg-[#f2f2f2] border border-neutral-200 space-y-2">
                    <div className="flex items-center gap-2 font-bold">
                      <BellRing className="w-4 h-4 text-[#1d1d1f]" />
                      <span>Browser Push: {notificationPermission}</span>
                    </div>
                    <button
                      type="button"
                      onClick={onRequestNotifications}
                      className="w-full py-2 bg-[#9D7110] hover:bg-[#3C2B02] text-white border border-[#3C2B02] font-bold transition-colors cursor-pointer"
                    >
                      Enable Push Alerts
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-[#6b6b70]">
                    Reset server fleet & alert state back to the initial Metro Parcel Service seed data.
                  </span>
                  <button
                    type="button"
                    onClick={handleResetDemo}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 hover:bg-red-600 hover:text-white text-xs font-bold cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Demo Fleet</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= CREATE SHIPMENT MODAL ================= */}
      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateShipment}
            className="bg-white border-2 border-[#1d1d1f] shadow-[8px_8px_0_#1d1d1f] w-full max-w-3xl max-h-[92vh] overflow-y-auto p-6 space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div>
                <h2 className="font-display text-xl text-[#1d1d1f]">Dispatch New Shipment</h2>
                <p className="text-xs text-[#6b6b70] mt-0.5">
                  Add route, sender &amp; receiver emails, phone numbers, and parcel inspection pictures.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="p-1 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold">Tracking Code (optional)</label>
                  <button
                    type="button"
                    onClick={() => {
                      const code = `MP${new Date().getFullYear().toString().slice(-2)}${Math.floor(
                        100000 + Math.random() * 899999
                      )}`;
                      setNewForm((f) => ({ ...f, trackingNo: code }));
                    }}
                    className="text-[11px] font-extrabold text-[#1B6CFF] hover:underline cursor-pointer"
                  >
                    Generate Code
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Auto e.g. TP26AD102938"
                  value={newForm.trackingNo}
                  onChange={(e) =>
                    setNewForm((f) => ({ ...f, trackingNo: e.target.value.toUpperCase() }))
                  }
                  className="w-full border border-neutral-300 px-3 py-2 font-mono-tabular uppercase"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Service Tier</label>
                <select
                  value={newForm.service}
                  onChange={(e) =>
                    setNewForm((f) => ({ ...f, service: e.target.value as Shipment['service'] }))
                  }
                  className="w-full border border-neutral-300 px-3 py-2"
                >
                  <option value="Economy">Economy</option>
                  <option value="Standard">Standard</option>
                  <option value="Express">Express</option>
                  <option value="Same Day">Same Day</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Origin City *</label>
                <input
                  type="text"
                  required
                  value={newForm.originCity}
                  onChange={(e) => setNewForm((f) => ({ ...f, originCity: e.target.value }))}
                  className="w-full border border-neutral-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Destination City *</label>
                <input
                  type="text"
                  required
                  value={newForm.destCity}
                  onChange={(e) => setNewForm((f) => ({ ...f, destCity: e.target.value }))}
                  className="w-full border border-neutral-300 px-3 py-2"
                />
              </div>

              {/* Sender Contact Block */}
              <div className="sm:col-span-2 pt-2 border-t border-neutral-200">
                <p className="font-extrabold uppercase tracking-wider text-[11px] text-[#6b6b70]">
                  Sender Contact Details
                </p>
              </div>
              <div className="sm:col-span-2 grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">Sender Name</label>
                  <input
                    type="text"
                    value={newForm.senderName}
                    onChange={(e) => setNewForm((f) => ({ ...f, senderName: e.target.value }))}
                    className="w-full border border-neutral-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Sender Email</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-[#6b6b70] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="sender@domain.com"
                      value={newForm.senderEmail}
                      onChange={(e) => setNewForm((f) => ({ ...f, senderEmail: e.target.value }))}
                      className="w-full border border-neutral-300 pl-8 pr-3 py-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold mb-1">Sender Phone</label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-[#6b6b70] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      placeholder="+44 7700 900123"
                      value={newForm.senderPhone}
                      onChange={(e) => setNewForm((f) => ({ ...f, senderPhone: e.target.value }))}
                      className="w-full border border-neutral-300 pl-8 pr-3 py-2 font-mono-tabular"
                    />
                  </div>
                </div>
                <div className="sm:col-span-3">
                  <label className="block font-bold mb-1">Sender Pickup Address</label>
                  <input
                    type="text"
                    value={newForm.senderAddress}
                    onChange={(e) => setNewForm((f) => ({ ...f, senderAddress: e.target.value }))}
                    className="w-full border border-neutral-300 px-3 py-2"
                  />
                </div>
              </div>

              {/* Receiver Contact Block */}
              <div className="sm:col-span-2 pt-2 border-t border-neutral-200">
                <p className="font-extrabold uppercase tracking-wider text-[11px] text-[#6b6b70]">
                  Receiver Contact Details
                </p>
              </div>
              <div className="sm:col-span-2 grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">Receiver Name</label>
                  <input
                    type="text"
                    value={newForm.receiverName}
                    onChange={(e) => setNewForm((f) => ({ ...f, receiverName: e.target.value }))}
                    className="w-full border border-neutral-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Receiver Email</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-[#6b6b70] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="recipient@domain.com"
                      value={newForm.receiverEmail}
                      onChange={(e) => setNewForm((f) => ({ ...f, receiverEmail: e.target.value }))}
                      className="w-full border border-neutral-300 pl-8 pr-3 py-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold mb-1">Receiver Phone</label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-[#6b6b70] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      placeholder="+44 7700 900456"
                      value={newForm.receiverPhone}
                      onChange={(e) => setNewForm((f) => ({ ...f, receiverPhone: e.target.value }))}
                      className="w-full border border-neutral-300 pl-8 pr-3 py-2 font-mono-tabular"
                    />
                  </div>
                </div>
                <div className="sm:col-span-3">
                  <label className="block font-bold mb-1">Receiver Delivery Address</label>
                  <input
                    type="text"
                    value={newForm.receiverAddress}
                    onChange={(e) => setNewForm((f) => ({ ...f, receiverAddress: e.target.value }))}
                    className="w-full border border-neutral-300 px-3 py-2"
                  />
                </div>
              </div>

              {/* Courier & Package Block */}
              <div className="sm:col-span-2 pt-2 border-t border-neutral-200">
                <p className="font-extrabold uppercase tracking-wider text-[11px] text-[#6b6b70]">
                  Courier &amp; Parcel Details
                </p>
              </div>
              <div>
                <label className="block font-bold mb-1">Courier Name</label>
                <input
                  type="text"
                  value={newForm.courierName}
                  onChange={(e) => setNewForm((f) => ({ ...f, courierName: e.target.value }))}
                  className="w-full border border-neutral-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Courier Phone</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-[#6b6b70] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="+44 7700 900789"
                    value={newForm.courierPhone}
                    onChange={(e) => setNewForm((f) => ({ ...f, courierPhone: e.target.value }))}
                    className="w-full border border-neutral-300 pl-8 pr-3 py-2 font-mono-tabular"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">Vehicle ID</label>
                <input
                  type="text"
                  value={newForm.courierVehicle}
                  onChange={(e) => setNewForm((f) => ({ ...f, courierVehicle: e.target.value }))}
                  className="w-full border border-neutral-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Package Contents</label>
                <input
                  type="text"
                  value={newForm.packageDesc}
                  onChange={(e) => setNewForm((f) => ({ ...f, packageDesc: e.target.value }))}
                  className="w-full border border-neutral-300 px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newForm.weightKg}
                    onChange={(e) => setNewForm((f) => ({ ...f, weightKg: e.target.value }))}
                    className="w-full border border-neutral-300 px-3 py-2 font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Dimensions</label>
                  <input
                    type="text"
                    value={newForm.dimensionsCm}
                    onChange={(e) => setNewForm((f) => ({ ...f, dimensionsCm: e.target.value }))}
                    className="w-full border border-neutral-300 px-3 py-2 font-mono-tabular"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Total Fee (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newForm.totalFee}
                    onChange={(e) => setNewForm((f) => ({ ...f, totalFee: e.target.value }))}
                    className="w-full border border-neutral-300 px-3 py-2 font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">ETA Window</label>
                  <input
                    type="text"
                    value={newForm.eta}
                    onChange={(e) => setNewForm((f) => ({ ...f, eta: e.target.value }))}
                    className="w-full border border-neutral-300 px-3 py-2"
                  />
                </div>
              </div>

              {/* Parcel Pictures Upload Block */}
              <div className="sm:col-span-2 pt-2 border-t border-neutral-200 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="font-extrabold uppercase tracking-wider text-[11px] text-[#1d1d1f] flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Parcel Pictures &amp; Inspection Media ({newForm.parcelImages.length}/6)</span>
                  </label>
                  <span className="text-[11px] text-[#6b6b70]">
                    Visible only to visitors tracking this parcel code
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#9D7110] border border-[#3C2B02] text-white font-extrabold cursor-pointer hover:bg-[#3C2B02] hover:text-[#CD9E34] transition-colors">
                    <ImagePlus className="w-4 h-4" />
                    <span>Upload Parcel Pictures</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        handleUploadNewImages(e.target.files);
                        e.target.value = '';
                      }}
                      className="sr-only"
                    />
                  </label>

                  {SAMPLE_PARCEL_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() =>
                        setNewForm((f) =>
                          f.parcelImages.includes(preset.url) || f.parcelImages.length >= 6
                            ? f
                            : { ...f, parcelImages: [...f.parcelImages, preset.url] }
                        )
                      }
                      className="px-3 py-2 border border-neutral-300 bg-[#f2f2f2] hover:border-[#3C2B02] text-[11px] font-bold cursor-pointer"
                    >
                      + {preset.label}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="Or paste an image URL (https://... or /src/assets/...)"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    className="flex-1 border border-neutral-300 px-3 py-2 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = imageUrlInput.trim();
                      if (!trimmed || newForm.parcelImages.length >= 6) return;
                      setNewForm((f) => ({
                        ...f,
                        parcelImages: [...f.parcelImages, trimmed],
                      }));
                      setImageUrlInput('');
                    }}
                    className="px-3.5 py-2 bg-[#3C2B02] text-[#CD9E34] hover:bg-[#9D7110] hover:text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    Attach URL
                  </button>
                </div>

                {newForm.parcelImages.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 pt-1">
                    {newForm.parcelImages.map((imgSrc, idx) => (
                      <div key={`${idx}-${imgSrc.slice(0, 24)}`} className="relative border border-neutral-300 bg-[#f2f2f2] group">
                        <img
                          src={imgSrc}
                          alt={`Attached parcel ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-24 object-cover"
                        />
                        {idx === 0 && (
                          <span className="absolute left-1 bottom-1 px-1.5 py-0.5 bg-[#3C2B02] text-[#CD9E34] text-[10px] font-bold">
                            Primary
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setNewForm((f) => ({
                              ...f,
                              parcelImages: f.parcelImages.filter((_, i) => i !== idx),
                            }))
                          }
                          aria-label={`Remove parcel picture ${idx + 1}`}
                          className="absolute top-1 right-1 w-6 h-6 bg-[#1E1501] text-white flex items-center justify-center hover:bg-red-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2.5 border border-neutral-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#9D7110] hover:bg-[#3C2B02] text-white text-xs font-extrabold transition-colors cursor-pointer"
              >
                Create &amp; Arm Geofences
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= EDIT SHIPMENT MODAL ================= */}
      {editingTrackingNo && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEdit}
            className="bg-white border-2 border-[#1d1d1f] shadow-[8px_8px_0_#1d1d1f] w-full max-w-3xl max-h-[92vh] overflow-y-auto p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 gap-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="font-display text-xl text-[#1d1d1f]">
                  Edit Shipment · <span className="font-mono-tabular">{editingTrackingNo}</span>
                </h2>
                <button
                  type="button"
                  onClick={() => copyTrackingCode(editingTrackingNo)}
                  className="inline-flex items-center gap-1 px-2 py-1 border border-neutral-300 bg-[#f2f2f2] text-[11px] font-bold hover:border-[#1d1d1f] cursor-pointer"
                >
                  {copiedCode === editingTrackingNo ? (
                    <Check className="w-3 h-3 text-emerald-700" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedCode === editingTrackingNo ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setEditingTrackingNo(null)}
                className="p-1 cursor-pointer"
                aria-label="Close edit modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Shipment Status</label>
                <select
                  value={editDraft.status}
                  onChange={(e) => setEditDraft((d) => ({ ...d, status: e.target.value }))}
                  className="w-full border border-neutral-300 px-3 py-2 font-bold"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Progress ({editDraft.progress}%)</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={editDraft.progress}
                  onChange={(e) =>
                    setEditDraft((d) => ({ ...d, progress: Number(e.target.value) }))
                  }
                  className="w-full accent-[#9D7110] mt-2"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Origin City</label>
                <input
                  type="text"
                  value={editDraft.originCity}
                  onChange={(e) => setEditDraft((d) => ({ ...d, originCity: e.target.value }))}
                  className="w-full border border-neutral-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Destination City</label>
                <input
                  type="text"
                  value={editDraft.destCity}
                  onChange={(e) => setEditDraft((d) => ({ ...d, destCity: e.target.value }))}
                  className="w-full border border-neutral-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Current Location</label>
                <input
                  type="text"
                  value={editDraft.currentLocation}
                  onChange={(e) =>
                    setEditDraft((d) => ({ ...d, currentLocation: e.target.value }))
                  }
                  className="w-full border border-neutral-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">ETA</label>
                <input
                  type="text"
                  value={editDraft.eta}
                  onChange={(e) => setEditDraft((d) => ({ ...d, eta: e.target.value }))}
                  className="w-full border border-neutral-300 px-3 py-2"
                />
              </div>

              {/* Parcel Specs & Billing */}
              <div className="sm:col-span-2 pt-2 border-t border-neutral-200">
                <p className="font-extrabold uppercase tracking-wider text-[11px] text-[#6b6b70]">
                  Parcel Specs &amp; Billing
                </p>
              </div>
              <div>
                <label className="block font-bold mb-1">Service Tier</label>
                <select
                  value={editDraft.service}
                  onChange={(e) =>
                    setEditDraft((d) => ({
                      ...d,
                      service: e.target.value as Shipment['service'],
                    }))
                  }
                  className="w-full border border-neutral-300 px-3 py-2 font-bold"
                >
                  <option value="Economy">Economy</option>
                  <option value="Standard">Standard</option>
                  <option value="Express">Express</option>
                  <option value="Same Day">Same Day</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Package Contents</label>
                <input
                  type="text"
                  value={editDraft.packageDesc}
                  onChange={(e) => setEditDraft((d) => ({ ...d, packageDesc: e.target.value }))}
                  className="w-full border border-neutral-300 px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editDraft.weightKg}
                    onChange={(e) => setEditDraft((d) => ({ ...d, weightKg: e.target.value }))}
                    className="w-full border border-neutral-300 px-3 py-2 font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Dimensions</label>
                  <input
                    type="text"
                    value={editDraft.dimensionsCm}
                    onChange={(e) => setEditDraft((d) => ({ ...d, dimensionsCm: e.target.value }))}
                    className="w-full border border-neutral-300 px-3 py-2 font-mono-tabular"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Total Fee (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editDraft.totalFee}
                    onChange={(e) => setEditDraft((d) => ({ ...d, totalFee: e.target.value }))}
                    className="w-full border border-neutral-300 px-3 py-2 font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Payment Stamp</label>
                  <select
                    value={editDraft.paymentState}
                    onChange={(e) =>
                      setEditDraft((d) => ({
                        ...d,
                        paymentState: e.target.value as Shipment['payment']['state'],
                      }))
                    }
                    className="w-full border border-neutral-300 px-3 py-2 font-bold"
                  >
                    {PAYMENT_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sender & Receiver Details */}
              <div className="sm:col-span-2 pt-2 border-t border-neutral-200">
                <p className="font-extrabold uppercase tracking-wider text-[11px] text-[#6b6b70]">
                  Sender &amp; Receiver Details
                </p>
              </div>
              <div>
                <label className="block font-bold mb-1">Sender Name</label>
                <input
                  type="text"
                  value={editDraft.senderName}
                  onChange={(e) => setEditDraft((d) => ({ ...d, senderName: e.target.value }))}
                  className="w-full border border-neutral-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Sender Address</label>
                <input
                  type="text"
                  value={editDraft.senderAddress}
                  onChange={(e) => setEditDraft((d) => ({ ...d, senderAddress: e.target.value }))}
                  className="w-full border border-neutral-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Sender Email</label>
                <input
                  type="email"
                  value={editDraft.senderEmail}
                  onChange={(e) => setEditDraft((d) => ({ ...d, senderEmail: e.target.value }))}
                  className="w-full border border-neutral-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Sender Phone</label>
                <input
                  type="tel"
                  value={editDraft.senderPhone}
                  onChange={(e) => setEditDraft((d) => ({ ...d, senderPhone: e.target.value }))}
                  className="w-full border border-neutral-300 px-3 py-2 font-mono-tabular"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Receiver Name</label>
                <input
                  type="text"
                  value={editDraft.receiverName}
                  onChange={(e) => setEditDraft((d) => ({ ...d, receiverName: e.target.value }))}
                  className="w-full border border-neutral-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Receiver Address</label>
                <input
                  type="text"
                  value={editDraft.receiverAddress}
                  onChange={(e) => setEditDraft((d) => ({ ...d, receiverAddress: e.target.value }))}
                  className="w-full border border-neutral-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Receiver Email</label>
                <input
                  type="email"
                  value={editDraft.receiverEmail}
                  onChange={(e) => setEditDraft((d) => ({ ...d, receiverEmail: e.target.value }))}
                  className="w-full border border-neutral-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Receiver Phone</label>
                <input
                  type="tel"
                  value={editDraft.receiverPhone}
                  onChange={(e) => setEditDraft((d) => ({ ...d, receiverPhone: e.target.value }))}
                  className="w-full border border-neutral-300 px-3 py-2 font-mono-tabular"
                />
              </div>

              {/* Courier & Checkpoint */}
              <div className="sm:col-span-2 pt-2 border-t border-neutral-200">
                <p className="font-extrabold uppercase tracking-wider text-[11px] text-[#6b6b70]">
                  Courier &amp; Checkpoint Scan
                </p>
              </div>
              <div>
                <label className="block font-bold mb-1">Courier Name</label>
                <input
                  type="text"
                  value={editDraft.courierName}
                  onChange={(e) => setEditDraft((d) => ({ ...d, courierName: e.target.value }))}
                  className="w-full border border-neutral-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Courier Phone</label>
                <input
                  type="tel"
                  value={editDraft.courierPhone}
                  onChange={(e) => setEditDraft((d) => ({ ...d, courierPhone: e.target.value }))}
                  className="w-full border border-neutral-300 px-3 py-2 font-mono-tabular"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold mb-1">Vehicle ID</label>
                <input
                  type="text"
                  value={editDraft.courierVehicle}
                  onChange={(e) => setEditDraft((d) => ({ ...d, courierVehicle: e.target.value }))}
                  className="w-full border border-neutral-300 px-3 py-2"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold mb-1">
                  Optional Timeline Checkpoint Scan Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cleared Birmingham regional sort belt"
                  value={editDraft.scanNote}
                  onChange={(e) => setEditDraft((d) => ({ ...d, scanNote: e.target.value }))}
                  className="w-full border border-neutral-300 px-3 py-2"
                />
              </div>

              {/* Edit Parcel Pictures */}
              <div className="sm:col-span-2 pt-2 border-t border-neutral-200 space-y-2">
                <label className="block font-bold">
                  Parcel Pictures ({editDraft.parcelImages.length}/6)
                </label>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#9D7110] text-white border border-[#3C2B02] font-bold cursor-pointer hover:bg-[#3C2B02] hover:text-[#CD9E34] transition-colors">
                    <ImagePlus className="w-3.5 h-3.5" />
                    <span>Upload Photos</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        handleUploadEditImages(e.target.files);
                        e.target.value = '';
                      }}
                      className="sr-only"
                    />
                  </label>
                  <input
                    type="url"
                    placeholder="Paste image URL..."
                    value={editImageUrlInput}
                    onChange={(e) => setEditImageUrlInput(e.target.value)}
                    className="flex-1 min-w-[160px] border border-neutral-300 px-2.5 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = editImageUrlInput.trim();
                      if (!trimmed || editDraft.parcelImages.length >= 6) return;
                      setEditDraft((d) => ({
                        ...d,
                        parcelImages: [...d.parcelImages, trimmed],
                      }));
                      setEditImageUrlInput('');
                    }}
                    className="px-3 py-1.5 bg-[#3C2B02] text-[#CD9E34] hover:bg-[#9D7110] hover:text-white font-bold transition-colors cursor-pointer"
                  >
                    Add
                  </button>
                </div>
                {editDraft.parcelImages.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                    {editDraft.parcelImages.map((imgSrc, idx) => (
                      <div key={`edit-${idx}-${imgSrc.slice(0, 20)}`} className="relative border border-neutral-300">
                        <img
                          src={imgSrc}
                          alt={`Parcel photo ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-20 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setEditDraft((d) => ({
                              ...d,
                              parcelImages: d.parcelImages.filter((_, i) => i !== idx),
                            }))
                          }
                          aria-label={`Remove edit photo ${idx + 1}`}
                          className="absolute top-1 right-1 w-5 h-5 bg-[#1E1501] text-white flex items-center justify-center hover:bg-red-600 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setEditingTrackingNo(null)}
                className="px-4 py-2.5 border border-neutral-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#9D7110] hover:bg-[#3C2B02] text-white text-xs font-extrabold transition-colors cursor-pointer"
              >
                Save Changes &amp; Broadcast
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= ADMIN RECEIPT PREVIEW MODAL ================= */}
      {previewReceiptShipment && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#f2f2f2] border-2 border-[#1d1d1f] shadow-[8px_8px_0_#1d1d1f] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between no-print">
              <div>
                <h2 className="font-display text-lg text-[#1d1d1f]">
                  Admin Receipt Verification · {previewReceiptShipment.receipt_no}
                </h2>
                <p className="text-xs text-[#6b6b70]">
                  Tracking {previewReceiptShipment.tracking_no} · {previewReceiptShipment.payment.state}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewReceiptShipment(null)}
                className="p-1.5 bg-white border border-neutral-300 cursor-pointer"
                aria-label="Close receipt preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <StampedReceiptCard
              shipment={previewReceiptShipment}
              contactSettings={siteSettings.contact}
            />
          </div>
        </div>
      )}
    </div>
  );
};
