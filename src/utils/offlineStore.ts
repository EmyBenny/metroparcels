import type { OfflineQueuedAction, PushAlert, Shipment, SiteSettings, SupportTicket } from '../types';
import { DEFAULT_SITE_SETTINGS, SEED_ALERTS, SEED_SHIPMENTS } from '../data/seedData';

const SHIPMENTS_KEY = 'metro_parcel_cached_shipments_v1';
const ALERTS_KEY = 'metro_parcel_cached_alerts_v1';
const QUEUE_KEY = 'metro_parcel_offline_queue_v1';
const LAST_SYNC_KEY = 'metro_parcel_last_sync_v1';
const SETTINGS_KEY = 'metro_parcel_site_settings_v1';
const MY_TICKET_CODES_KEY = 'metro_parcel_my_ticket_codes_v1';
const TICKETS_CACHE_KEY = 'metro_parcel_cached_tickets_v1';

export function loadCachedShipments(): Shipment[] {
  try {
    const raw = localStorage.getItem(SHIPMENTS_KEY);
    if (!raw) {
      localStorage.setItem(SHIPMENTS_KEY, JSON.stringify(SEED_SHIPMENTS));
      return SEED_SHIPMENTS;
    }
    const parsed = JSON.parse(raw) as Shipment[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_SHIPMENTS;
  } catch {
    return SEED_SHIPMENTS;
  }
}

export function saveCachedShipments(shipments: Shipment[]): void {
  try {
    localStorage.setItem(SHIPMENTS_KEY, JSON.stringify(shipments));
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  } catch {
    // Storage quota exceeded - ignore gracefully
  }
}

export function loadCachedAlerts(): PushAlert[] {
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    if (!raw) {
      localStorage.setItem(ALERTS_KEY, JSON.stringify(SEED_ALERTS));
      return SEED_ALERTS;
    }
    const parsed = JSON.parse(raw) as PushAlert[];
    return Array.isArray(parsed) ? parsed : SEED_ALERTS;
  } catch {
    return SEED_ALERTS;
  }
}

export function saveCachedAlerts(alerts: PushAlert[]): void {
  try {
    localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts.slice(0, 50)));
  } catch {
    // Ignore storage errors
  }
}

export function loadCachedSettings(): SiteSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SITE_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<SiteSettings>;
    return {
      contact: {
        ...DEFAULT_SITE_SETTINGS.contact,
        ...(parsed.contact || {}),
        whatsapp: parsed.contact?.whatsapp || DEFAULT_SITE_SETTINGS.contact.whatsapp,
      },
      about: {
        ...DEFAULT_SITE_SETTINGS.about,
        ...(parsed.about || {}),
        values: Array.isArray(parsed.about?.values)
          ? parsed.about.values
          : DEFAULT_SITE_SETTINGS.about.values,
        milestones: Array.isArray(parsed.about?.milestones)
          ? parsed.about.milestones
          : DEFAULT_SITE_SETTINGS.about.milestones,
      },
      help: {
        ...DEFAULT_SITE_SETTINGS.help,
        ...(parsed.help || {}),
        faqs: Array.isArray(parsed.help?.faqs)
          ? parsed.help.faqs
          : DEFAULT_SITE_SETTINGS.help.faqs,
      },
    };
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}

export function saveCachedSettings(settings: SiteSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

export function loadMyTicketCodes(): string[] {
  try {
    const raw = localStorage.getItem(MY_TICKET_CODES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function addMyTicketCode(ticketCode: string): string[] {
  const code = ticketCode.trim().toUpperCase();
  const current = loadMyTicketCodes();
  const next = current.includes(code) ? current : [code, ...current].slice(0, 30);
  try {
    localStorage.setItem(MY_TICKET_CODES_KEY, JSON.stringify(next));
  } catch {
    // Ignore
  }
  return next;
}

export function loadCachedTickets(): SupportTicket[] {
  try {
    const raw = localStorage.getItem(TICKETS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCachedTickets(tickets: SupportTicket[]): void {
  try {
    localStorage.setItem(TICKETS_CACHE_KEY, JSON.stringify(tickets.slice(0, 60)));
  } catch {
    // Ignore
  }
}

export function getOfflineQueue(): OfflineQueuedAction[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OfflineQueuedAction[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function enqueueOfflineAction(
  kind: OfflineQueuedAction['kind'],
  payload: Record<string, unknown>
): OfflineQueuedAction[] {
  const queue = getOfflineQueue();
  const item: OfflineQueuedAction = {
    id: `oq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind,
    payload,
    createdAt: new Date().toISOString(),
  };
  const next = [...queue, item];
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(next));
  } catch {
    // Ignore
  }
  return next;
}

export function saveOfflineQueue(queue: OfflineQueuedAction[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Ignore
  }
}

export function getLastSyncTime(): string | null {
  try {
    return localStorage.getItem(LAST_SYNC_KEY);
  } catch {
    return null;
  }
}
