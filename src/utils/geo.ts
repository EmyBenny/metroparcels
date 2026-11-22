import type { LatLngPoint, QuoteCalculation } from '../types';

const EARTH_RADIUS_METERS = 6371000;

export function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Haversine distance between two coordinates in meters */
export function distanceMeters(a: LatLngPoint, b: LatLngPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Shortest perpendicular distance (meters) from point P to polyline route */
export function distanceToPolylineMeters(
  point: LatLngPoint,
  polyline: LatLngPoint[]
): number {
  if (polyline.length === 0) return 0;
  if (polyline.length === 1) return distanceMeters(point, polyline[0]);

  let minDist = Infinity;
  const cosLat = Math.cos(toRad(point.lat));

  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i];
    const b = polyline[i + 1];
    // Local equirectangular projection in meters relative to point
    const ax = (a.lng - point.lng) * cosLat * 111320;
    const ay = (a.lat - point.lat) * 110540;
    const bx = (b.lng - point.lng) * cosLat * 111320;
    const by = (b.lat - point.lat) * 110540;

    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    let t = 0;
    if (lenSq > 0) {
      t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lenSq));
    }
    const projX = ax + t * dx;
    const projY = ay + t * dy;
    const dist = Math.sqrt(projX * projX + projY * projY);
    if (dist < minDist) {
      minDist = dist;
    }
  }
  return minDist;
}

export function bearingDegrees(from: LatLngPoint, to: LatLngPoint): number {
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Metro Parcel Service tariff calculator */
export function calculateQuote(params: {
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  service: 'Economy' | 'Standard' | 'Express' | 'Same Day';
  international: boolean;
}): QuoteCalculation {
  const rates: Record<'Economy' | 'Standard' | 'Express' | 'Same Day', [number, number]> = {
    Economy: [3.99, 1.1],
    Standard: [5.99, 1.6],
    Express: [9.99, 2.4],
    'Same Day': [19.99, 3.5],
  };
  const days: Record<'Economy' | 'Standard' | 'Express' | 'Same Day', string> = {
    Economy: '3–5 days',
    Standard: '2–3 days',
    Express: 'Next day',
    'Same Day': 'Today',
  };

  const w = Math.max(0, params.weightKg || 0);
  const l = Math.max(0, params.lengthCm || 0);
  const wd = Math.max(0, params.widthCm || 0);
  const h = Math.max(0, params.heightCm || 0);

  const volumetricKg = (l * wd * h) / 5000;
  const chargeableKg = Math.max(w, volumetricKg, 0.5);
  const [base, perKg] = rates[params.service];
  let price = base + chargeableKg * perKg;
  if (params.international) {
    price = price * 2.8 + 12;
  }
  const vat = price * 0.2;
  return {
    volumetricKg,
    chargeableKg,
    basePrice: price,
    vat,
    total: price + vat,
    etaLabel: params.international ? '4–7 days' : days[params.service],
  };
}
