export type PageRoute =
  | 'home'
  | 'track'
  | 'analytics'
  | 'services'
  | 'business'
  | 'about'
  | 'help'
  | 'contact'
  | 'admin';

export type ShipmentStatus =
  | 'Pending'
  | 'Picked Up'
  | 'Customs Clearance'
  | 'In Transit'
  | 'Arrived at Hub'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Route Deviation';

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface TrackingEvent {
  status: string;
  location: string;
  lat: number;
  lng: number;
  note: string;
  event_time: string;
  time_h: string;
}

export interface HistoricalWaypoint {
  lat: number;
  lng: number;
  timestamp: string;
  speedKmh: number;
  headingDeg: number;
  label?: string;
}

export interface GeofenceZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  type: 'origin' | 'hub' | 'destination' | 'custom';
  active: boolean;
  triggered?: boolean;
}

export interface Shipment {
  tracking_no: string;
  receipt_no: string;
  company: string;
  status: ShipmentStatus | string;
  service: 'Economy' | 'Standard' | 'Express' | 'Same Day';
  package: string;
  weight: number;
  dimensionsCm: string;
  pieces: number;
  progress: number;
  origin: {
    city: string;
    lat: number;
    lng: number;
  };
  dest: {
    city: string;
    lat: number;
    lng: number;
  };
  current: {
    lat: number;
    lng: number;
    location: string;
    speedKmh: number;
    headingDeg: number;
  };
  sender: {
    name: string;
    city: string;
    address: string;
    email?: string;
    phone?: string;
  };
  receiver: {
    name: string;
    city: string;
    address: string;
    email?: string;
    phone?: string;
  };
  courier: {
    name: string;
    phone: string;
    vehicle: string;
  };
  pickup: string;
  eta: string;
  payment: {
    state: 'Paid' | 'Partial' | 'Customs Cleared' | 'Refunded';
    total: string;
    paid: string;
    balance: string;
    shippingFee: string;
    insuranceFee: string;
    vatFee: string;
    method: string;
    reference: string;
    issuedAt: string;
  };
  distance_km: number;
  updated_at: string;
  events: TrackingEvent[];
  routeWaypoints: HistoricalWaypoint[];
  geofences: GeofenceZone[];
  proofImage?: string;
  parcelImages?: string[];
}

export interface PushAlert {
  id: string;
  trackingNo: string;
  type: 'arrival' | 'deviation' | 'route_update' | 'geofence_enter';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  lat: number;
  lng: number;
}

export interface OfflineQueuedAction {
  id: string;
  kind: 'contact' | 'gps_update' | 'geofence_update' | 'ticket_reply';
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface QuoteCalculation {
  volumetricKg: number;
  chargeableKg: number;
  basePrice: number;
  vat: number;
  total: number;
  etaLabel: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
  status: 'open' | 'resolved';
  adminNote?: string;
}

export interface SupportReply {
  id: string;
  senderRole: 'visitor' | 'admin';
  senderName: string;
  text: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketCode: string;
  name: string;
  email: string;
  trackingNo?: string;
  category: 'Tracking' | 'Delivery Issue' | 'Receipt & Billing' | 'Return' | 'General';
  priority: 'Normal' | 'Urgent';
  subject: string;
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
  updatedAt: string;
  replies: SupportReply[];
}

export interface FaqItem {
  id: string;
  category: string;
  q: string;
  a: string;
}

export interface AboutValue {
  title: string;
  desc: string;
}

export interface AboutMilestone {
  year: string;
  text: string;
}

export interface SiteSettings {
  contact: {
    address: string;
    email: string;
    phone: string;
    whatsapp?: string;
    supportHours: string;
    salesHours: string;
  };
  about: {
    eyebrow: string;
    headline: string;
    intro: string;
    heroImage: string;
    values: AboutValue[];
    milestones: AboutMilestone[];
  };
  help: {
    eyebrow: string;
    headline: string;
    searchPlaceholder: string;
    stillStuckTitle: string;
    stillStuckSubtitle: string;
    faqs: FaqItem[];
  };
}

export interface ReturnRequest {
  id: string;
  code: string;
  retailer: string;
  dropPoint: string;
  status: 'Issued' | 'Scanned' | 'In Transit' | 'Refunded';
  createdAt: string;
}
