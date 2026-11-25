import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BellRing,
  Camera,
  Copy,
  Mail,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  Receipt,
  RotateCcw,
  Search,
  ShieldAlert,
  Truck,
  X,
} from 'lucide-react';
import type { PushAlert, Shipment, SiteSettings } from '../types';
import { distanceMeters, distanceToPolylineMeters, formatDistance } from '../utils/geo';
import { MapViewport } from '../components/MapViewport';
import { StampedReceiptCard } from '../components/StampedReceiptCard';

type ParcelDetailTab = 'overview' | 'dispatch' | 'receipt' | 'return';

interface TrackPageProps {
  shipments: Shipment[];
  selectedTrackingNo: string;
  onSelectTracking: (trackingNo: string) => void;
  onLookupShipment?: (code: string) => Promise<Shipment | null>;
  onOpenPlayback: (trackingNo: string) => void;
  alerts: PushAlert[];
  isOnline: boolean;
  quotaExceeded: boolean;
  supportEmail?: string;
  contactSettings?: SiteSettings['contact'];
  isAdminAuthenticated?: boolean;
  onBackToAdmin?: () => void;
}

export const TrackPage: React.FC<TrackPageProps> = ({
  shipments,
  selectedTrackingNo,
  onSelectTracking,
  onLookupShipment,
  onOpenPlayback,
  alerts,
  isOnline,
  quotaExceeded,
  supportEmail = 'support@metroparcel.demo',
  contactSettings,
  isAdminAuthenticated = false,
  onBackToAdmin,
}) => {
  const [searchInput, setSearchInput] = useState(selectedTrackingNo);
  const [lookingUp, setLookingUp] = useState(false);
  const [showGeofences, setShowGeofences] = useState(true);
  const [detailTab, setDetailTab] = useState<ParcelDetailTab>('overview');
  const [copiedShare, setCopiedShare] = useState(false);
  const [courierChatOpen, setCourierChatOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatLog, setChatLog] = useState<
    Array<{ from: 'user' | 'courier'; text: string; time: string }>
  >([
    {
      from: 'courier',
      text: 'Live Metro Parcel Service telemetry active. Delivery window is on schedule.',
      time: '14:08',
    },
  ]);

  useEffect(() => {
    setSearchInput(selectedTrackingNo);
  }, [selectedTrackingNo]);

  useEffect(() => {
    const clean = selectedTrackingNo.trim().toUpperCase();
    if (!clean || !isOnline || !onLookupShipment) return;
    let cancelled = false;
    setLookingUp(true);
    onLookupShipment(clean).finally(() => {
      if (!cancelled) setLookingUp(false);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedTrackingNo, isOnline]);

  const normalizedQuery = selectedTrackingNo.trim().toUpperCase();
  const shipment = normalizedQuery
    ? shipments.find(
        (s) =>
          s.tracking_no.toUpperCase() === normalizedQuery ||
          s.receipt_no.toUpperCase() === normalizedQuery
      ) || null
    : null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchInput.trim().toUpperCase();
    onSelectTracking(q);
    setDetailTab('overview');
    if (q && isOnline && onLookupShipment) {
      setLookingUp(true);
      await onLookupShipment(q).finally(() => setLookingUp(false));
    }
  };

  const handleClearTracking = () => {
    setSearchInput('');
    onSelectTracking('');
    setDetailTab('overview');
  };

  const handleCopyShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 1800);
  };

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    setChatLog((prev) => [
      ...prev,
      { from: 'user', text: chatMessage.trim(), time: now },
      { from: 'courier', text: 'Copy that — received on my cab tablet. See you shortly.', time: now },
    ]);
    setChatMessage('');
  };

  const corridorDeviationMeters = shipment
    ? distanceToPolylineMeters(shipment.current, shipment.routeWaypoints)
    : 0;
  const distToDestMeters = shipment
    ? distanceMeters(shipment.current, shipment.dest)
    : 0;
  const shipmentAlerts = shipment
    ? alerts.filter((a) => a.trackingNo === shipment.tracking_no)
    : [];
  const parcelPhotos = shipment
    ? Array.from(
        new Set(
          [...(shipment.parcelImages || []), ...(shipment.proofImage ? [shipment.proofImage] : [])].filter(
            Boolean
          )
        )
      )
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24 lg:pb-12">
      {isAdminAuthenticated && onBackToAdmin && (
        <div className="mb-4 bg-[#3C2B02] text-[#F2E9D4] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs border-b-2 border-[#9D7110]">
          <span className="font-bold text-[#CD9E34]">
            Admin Session Active — Tracking live parcel telemetry
          </span>
          <button
            type="button"
            onClick={onBackToAdmin}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#9D7110] text-white font-extrabold hover:bg-[#CD9E34] hover:text-[#1E1501] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Admin Portal</span>
          </button>
        </div>
      )}

      {/* Tracking Code Search Bar (No other users' codes displayed) */}
      <div className="bg-white border border-neutral-200 p-4 sm:p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl text-[#1d1d1f]">
              Live Parcel Tracking
            </h1>
            <p className="text-xs sm:text-sm text-[#6b6b70] mt-1">
              Enter your Metro Parcel Service tracking code or receipt number to view live GPS telemetry, dispatch manifest, stamped receipt, and return details.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex flex-wrap sm:flex-nowrap gap-2 w-full lg:w-auto lg:min-w-[440px]">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-[#6b6b70] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Enter tracking code or receipt number"
                className="w-full border border-neutral-300 pl-10 pr-3 py-2.5 text-sm font-mono-tabular focus:outline-none focus:border-[#1d1d1f]"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#9D7110] text-white font-bold text-sm hover:bg-[#3C2B02] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {lookingUp ? 'Searching…' : 'Track now'}
            </button>
            {normalizedQuery && (
              <button
                type="button"
                onClick={handleClearTracking}
                className="px-3.5 py-2.5 border border-neutral-300 text-xs font-bold text-[#1d1d1f] hover:border-[#1d1d1f] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {normalizedQuery && !shipment && !lookingUp && (
          <div className="mt-4 p-3.5 bg-amber-50 border border-amber-300 text-xs text-amber-950">
            No parcel found for tracking code <strong className="font-mono-tabular">{normalizedQuery}</strong>. Please check your code and try again.
          </div>
        )}
      </div>

      {!shipment ? (
        <div className="bg-white border border-neutral-200 p-8 sm:p-12 text-center max-w-2xl mx-auto">
          <div className="w-14 h-14 mx-auto bg-[#9D7110] border border-[#3C2B02] flex items-center justify-center mb-4">
            <Package className="w-7 h-7 text-white" />
          </div>
          <h2 className="font-display text-2xl text-[#1d1d1f]">
            {lookingUp
              ? 'Locating Shipment Telemetry…'
              : normalizedQuery
                ? 'Tracking Code Not Found'
                : 'Enter Your Tracking Code'}
          </h2>
          <p className="text-sm text-[#6b6b70] mt-2 leading-relaxed">
            For customer privacy, Metro Parcel Service only displays telemetry, courier details, stamped receipts, and return options for the exact tracking or receipt code you provide above.
          </p>
        </div>
      ) : (
        <>
          {/* Main Split: Live Map + Geofence Read-Only View | Bundled Parcel Info, Timeline, Receipt & Return */}
          <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left 6 cols: Live Map & Read-only Telemetry */}
        <div className="lg:col-span-6 space-y-5">
          {/* Live Telemetry Status Strip */}
          <div className="bg-[#3C2B02] text-[#F2E9D4] px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#9D7110]">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00C853] animate-pulse shrink-0" />
              <span className="font-bold">LIVE</span>
              <span className="text-[#CD9E34]/60">·</span>
              <span className="font-medium">{shipment.current.location}</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono-tabular text-[#CD9E34]">
              <span>{shipment.progress}% complete</span>
              <span className="text-[#CD9E34]/50">|</span>
              <span>{formatDistance(distToDestMeters)} to dest</span>
            </div>
          </div>

          <MapViewport
            shipment={shipment}
            isOnline={isOnline}
            quotaExceeded={quotaExceeded}
            showGeofences={showGeofences}
            heightClass="h-[340px] sm:h-[440px]"
          />

          {/* Read-Only Corridor & Geofence Status Card */}
          <div className="bg-white border border-neutral-200 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-extrabold text-base text-[#1d1d1f]">
                  Corridor Telemetry & Armed Geofences
                </h2>
                <p className="text-xs text-[#6b6b70]">
                  Speed:{' '}
                  <span className="font-mono-tabular font-bold text-[#1d1d1f]">
                    {shipment.current.speedKmh} km/h
                  </span>{' '}
                  · Corridor offset:{' '}
                  <span className="font-mono-tabular font-bold text-[#1d1d1f]">
                    {formatDistance(corridorDeviationMeters)}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGeofences((v) => !v)}
                className={`px-3 py-1.5 text-xs font-bold border cursor-pointer ${
                  showGeofences
                    ? 'bg-[#3C2B02] text-[#CD9E34] border-[#3C2B02]'
                    : 'bg-white text-[#1d1d1f] border-neutral-300'
                }`}
              >
                {showGeofences ? 'Hide Geofences' : 'Show Geofences'}
              </button>
            </div>

            <div className="space-y-2">
              {shipment.geofences.map((gf) => (
                <div
                  key={gf.id}
                  className="flex items-center justify-between gap-2 p-2.5 bg-[#f2f2f2] text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin
                      className={`w-4 h-4 shrink-0 ${
                        gf.type === 'destination'
                          ? 'text-[#00C853]'
                          : gf.type === 'hub'
                          ? 'text-[#1B6CFF]'
                          : 'text-[#1d1d1f]'
                      }`}
                    />
                    <span className="font-bold text-[#1d1d1f] truncate">{gf.name}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono-tabular text-[11px] shrink-0">
                    <span className="text-[#6b6b70]">
                      {(gf.radiusMeters / 1000).toFixed(1)} km
                    </span>
                    <span
                      className={`px-2 py-0.5 font-bold ${
                        gf.triggered
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-white text-[#1d1d1f]'
                      }`}
                    >
                      {gf.triggered ? 'Triggered' : gf.active ? 'Armed' : 'Paused'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Courier Contact Card */}
          <div className="bg-white border border-neutral-200 p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-[#3C2B02] text-[#CD9E34] font-extrabold text-sm flex items-center justify-center shrink-0">
                {shipment.courier.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </div>
              <div>
                <p className="text-sm font-extrabold text-[#1d1d1f]">{shipment.courier.name}</p>
                <p className="text-xs text-[#6b6b70]">{shipment.courier.vehicle}</p>
                <p className="text-[11px] font-mono-tabular text-[#6b6b70] mt-0.5">
                  {shipment.courier.phone}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`tel:${shipment.courier.phone}`}
                aria-label={`Call ${shipment.courier.name}`}
                className="w-10 h-10 bg-[#f2f2f2] hover:bg-[#9D7110] hover:text-white flex items-center justify-center text-[#1d1d1f] transition-colors"
              >
                <Phone className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => setCourierChatOpen(true)}
                aria-label="Chat with courier"
                className="w-10 h-10 bg-[#3C2B02] text-[#CD9E34] hover:bg-[#9D7110] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right 6 cols: Shipment Summary + Parcel Tabs (Timeline, Dispatch/Send, Stamped Receipt, Return Info) */}
        <div className="lg:col-span-6 space-y-5">
          {/* Shipment Header Summary Card */}
          <div className="bg-white border border-neutral-200 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono-tabular text-xs text-[#6b6b70]">#{shipment.tracking_no}</p>
                <h2 className="font-extrabold text-xl text-[#1d1d1f] mt-0.5">
                  {shipment.package}
                </h2>
                <p className="text-xs text-[#6b6b70] mt-1">
                  {shipment.service} · {shipment.weight} kg · {shipment.pieces} pc ·{' '}
                  {shipment.distance_km} km
                </p>
              </div>
              <span
                className={`px-3 py-1 text-xs font-extrabold shrink-0 ${
                  shipment.status === 'Route Deviation'
                    ? 'bg-[#FF5A1F] text-white'
                    : shipment.status === 'Delivered'
                    ? 'bg-[#00C853] text-white'
                    : 'bg-[#9D7110] text-white'
                }`}
              >
                {shipment.status}
              </span>
            </div>

            <div className="mt-5">
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span>{shipment.origin.city}</span>
                <span>{shipment.dest.city}</span>
              </div>
              <div className="h-2.5 bg-neutral-200 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    shipment.status === 'Route Deviation' ? 'bg-[#FF5A1F]' : 'bg-[#1B6CFF]'
                  }`}
                  style={{ width: `${shipment.progress}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-[#6b6b70] mt-2 font-mono-tabular">
                <span>Picked up {shipment.pickup}</span>
                <span>Est. delivery {shipment.eta}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-neutral-100 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onOpenPlayback(shipment.tracking_no)}
                className="flex-1 px-3 py-2 bg-[#3C2B02] text-[#CD9E34] text-xs font-bold hover:bg-[#1E1501] transition-colors cursor-pointer whitespace-nowrap"
              >
                Route Playback
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('receipt')}
                className="flex-1 px-3 py-2 border border-[#3C2B02] text-[#3C2B02] text-xs font-bold hover:bg-[#9D7110] hover:text-white hover:border-[#9D7110] transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Parcel Receipt</span>
              </button>
              <button
                type="button"
                onClick={handleCopyShare}
                className="px-3 py-2 border border-neutral-300 text-xs font-bold hover:border-[#1d1d1f] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedShare ? 'Copied' : 'Share'}</span>
              </button>
            </div>
          </div>

          {/* Bundled Tracked Parcel Sub-Navigation (Timeline | Dispatch/Send | Stamped Receipt | Return Info) */}
          <div className="bg-white border border-neutral-200">
            <div className="grid grid-cols-4 border-b border-neutral-200 bg-[#f2f2f2]">
              {(
                [
                  ['overview', 'Timeline', Truck],
                  ['dispatch', 'Dispatch', Package],
                  ['receipt', 'Receipt', Receipt],
                  ['return', 'Return', RotateCcw],
                ] as const
              ).map(([tabKey, label, Icon]) => {
                const active = detailTab === tabKey;
                return (
                  <button
                    key={tabKey}
                    type="button"
                    onClick={() => setDetailTab(tabKey)}
                    className={`py-3 px-2 text-xs font-extrabold inline-flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                      active
                        ? 'bg-white border-[#1d1d1f] text-[#1d1d1f]'
                        : 'border-transparent text-[#6b6b70] hover:text-[#1d1d1f]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            <div className="p-5">
              {/* TAB 1: TIMELINE & ALERTS */}
              {detailTab === 'overview' && (
                <div className="space-y-5">
                  {shipmentAlerts.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#6b6b70] flex items-center gap-1.5">
                        <BellRing className="w-3.5 h-3.5 text-[#FF5A1F]" />
                        <span>Alerts ({shipmentAlerts.length})</span>
                      </h3>
                      {shipmentAlerts.slice(0, 3).map((al) => (
                        <div key={al.id} className="p-2.5 bg-[#f2f2f2] text-xs">
                          <div className="flex items-center justify-between gap-2 font-bold text-[#1d1d1f]">
                            <span className="flex items-center gap-1.5">
                              {al.type === 'deviation' && (
                                <ShieldAlert className="w-3.5 h-3.5 text-[#FF5A1F]" />
                              )}
                              {al.title}
                            </span>
                            <span className="font-mono-tabular text-[11px] text-[#6b6b70]">
                              {al.timestamp}
                            </span>
                          </div>
                          <p className="text-[#6b6b70] mt-1">{al.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <h3 className="font-extrabold text-sm text-[#1d1d1f] mb-4">
                      Shipment History
                    </h3>
                    <ol className="space-y-4">
                      {[...shipment.events].reverse().map((ev, idx) => (
                        <li key={`${ev.event_time}-${idx}`} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <span
                              className={`w-3 h-3 rounded-full mt-1 shrink-0 ${
                                idx === 0 ? 'bg-[#1B6CFF]' : 'bg-neutral-300'
                              }`}
                            />
                            {idx < shipment.events.length - 1 && (
                              <span className="w-0.5 flex-1 bg-neutral-200 mt-1" />
                            )}
                          </div>
                          <div className="pb-2">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-extrabold text-[#1d1d1f]">{ev.status}</span>
                              <span className="text-[#6b6b70]">·</span>
                              <span className="text-[#6b6b70]">{ev.location}</span>
                            </div>
                            <p className="text-xs text-[#6b6b70] mt-0.5">{ev.note}</p>
                            <p className="text-[11px] font-mono-tabular text-neutral-400 mt-0.5">
                              {ev.time_h}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {parcelPhotos.length > 0 && (
                    <div className="pt-3 border-t border-neutral-200">
                      <p className="text-xs font-bold text-[#6b6b70] mb-2 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-[#1d1d1f]" />
                        <span>
                          Parcel pictures &amp; label inspection ({parcelPhotos.length})
                        </span>
                      </p>
                      <div className="grid grid-cols-2 gap-2.5">
                        {parcelPhotos.map((imgSrc, idx) => (
                          <button
                            key={`${idx}-${imgSrc.slice(0, 24)}`}
                            type="button"
                            onClick={() => setLightboxImage(imgSrc)}
                            className="text-left border border-neutral-200 hover:border-[#1d1d1f] transition-colors cursor-pointer overflow-hidden bg-[#f2f2f2]"
                          >
                            <img
                              src={imgSrc}
                              alt={`Parcel photo ${idx + 1} for ${shipment.tracking_no}`}
                              referrerPolicy="no-referrer"
                              className="w-full h-36 object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: DISPATCH / SHIPPING DETAILS */}
              {detailTab === 'dispatch' && (
                <div className="space-y-4 text-xs">
                  <div className="grid sm:grid-cols-2 gap-4 p-4 bg-[#f2f2f2]">
                    <div className="space-y-1">
                      <span className="text-[#6b6b70] font-bold uppercase block">
                        Sender (Origin)
                      </span>
                      <p className="font-extrabold text-sm text-[#1d1d1f]">
                        {shipment.sender.name}
                      </p>
                      <p className="text-[#6b6b70]">{shipment.sender.address}</p>
                      <p className="text-[#6b6b70]">{shipment.sender.city}</p>
                      {shipment.sender.email && (
                        <a
                          href={`mailto:${shipment.sender.email}`}
                          className="inline-flex items-center gap-1.5 text-[#1B6CFF] hover:underline pt-1"
                        >
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          <span>{shipment.sender.email}</span>
                        </a>
                      )}
                      {shipment.sender.phone && (
                        <a
                          href={`tel:${shipment.sender.phone}`}
                          className="flex items-center gap-1.5 font-mono-tabular text-[#1d1d1f] hover:underline"
                        >
                          <Phone className="w-3.5 h-3.5 shrink-0 text-[#6b6b70]" />
                          <span>{shipment.sender.phone}</span>
                        </a>
                      )}
                    </div>
                    <div className="space-y-1">
                      <span className="text-[#6b6b70] font-bold uppercase block">
                        Receiver (Destination)
                      </span>
                      <p className="font-extrabold text-sm text-[#1d1d1f]">
                        {shipment.receiver.name}
                      </p>
                      <p className="text-[#6b6b70]">{shipment.receiver.address}</p>
                      <p className="text-[#6b6b70]">{shipment.receiver.city}</p>
                      {shipment.receiver.email && (
                        <a
                          href={`mailto:${shipment.receiver.email}`}
                          className="inline-flex items-center gap-1.5 text-[#1B6CFF] hover:underline pt-1"
                        >
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          <span>{shipment.receiver.email}</span>
                        </a>
                      )}
                      {shipment.receiver.phone && (
                        <a
                          href={`tel:${shipment.receiver.phone}`}
                          className="flex items-center gap-1.5 font-mono-tabular text-[#1d1d1f] hover:underline"
                        >
                          <Phone className="w-3.5 h-3.5 shrink-0 text-[#6b6b70]" />
                          <span>{shipment.receiver.phone}</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border border-neutral-200 p-4">
                    <div>
                      <span className="text-[#6b6b70] block">Service Tier</span>
                      <span className="font-bold text-[#1d1d1f]">{shipment.service}</span>
                    </div>
                    <div>
                      <span className="text-[#6b6b70] block">Weight</span>
                      <span className="font-mono-tabular font-bold">{shipment.weight} kg</span>
                    </div>
                    <div>
                      <span className="text-[#6b6b70] block">Dimensions</span>
                      <span className="font-mono-tabular font-bold">{shipment.dimensionsCm}</span>
                    </div>
                    <div>
                      <span className="text-[#6b6b70] block">Pieces</span>
                      <span className="font-mono-tabular font-bold">{shipment.pieces}</span>
                    </div>
                    <div>
                      <span className="text-[#6b6b70] block">Corridor Distance</span>
                      <span className="font-mono-tabular font-bold">{shipment.distance_km} km</span>
                    </div>
                    <div>
                      <span className="text-[#6b6b70] block">Dispatched By</span>
                      <span className="font-bold">{shipment.company}</span>
                    </div>
                  </div>

                  {parcelPhotos.length > 0 && (
                    <div className="border border-neutral-200 p-4 space-y-2.5">
                      <span className="font-extrabold text-[#1d1d1f] flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5" />
                        <span>Attached Parcel Pictures ({parcelPhotos.length})</span>
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {parcelPhotos.map((imgSrc, idx) => (
                          <button
                            key={`disp-${idx}-${imgSrc.slice(0, 20)}`}
                            type="button"
                            onClick={() => setLightboxImage(imgSrc)}
                            className="border border-neutral-200 hover:border-[#1d1d1f] cursor-pointer overflow-hidden"
                          >
                            <img
                              src={imgSrc}
                              alt={`Dispatch parcel ${idx + 1}`}
                              referrerPolicy="no-referrer"
                              className="w-full h-28 object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: STAMPED DIGITAL RECEIPT FOR THIS TRACKED PARCEL */}
              {detailTab === 'receipt' && (
                <StampedReceiptCard shipment={shipment} contactSettings={contactSettings} />
              )}

              {/* TAB 4: PARCEL RETURN DETAILS (READ-ONLY FOR TRACKED PARCEL) */}
              {detailTab === 'return' && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-[#F2E9D4] border border-[#9D7110] space-y-2">
                    <span className="font-extrabold text-sm text-[#1E1501] block">
                      Return Eligibility · #{shipment.tracking_no}
                    </span>
                    <p className="text-[#1E1501]/85 leading-relaxed">
                      Parcels handled by <strong>Metro Parcel Service</strong> can be returned within the sender’s approved 14–30 day return window at any of our 16,000+ 24/7 drop points.
                    </p>
                  </div>

                  <div className="border border-neutral-200 p-4 space-y-2.5">
                    <div className="flex justify-between">
                      <span className="text-[#6b6b70]">Origin Sender</span>
                      <span className="font-bold text-[#1d1d1f]">{shipment.sender.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6b6b70]">Return Drop Network</span>
                      <span className="font-bold text-[#1d1d1f]">Metro Parcel Service Smart Lockers</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6b6b70]">Return Label Authority</span>
                      <span className="font-bold text-[#008a39]">Issued by Operations Admin</span>
                    </div>
                  </div>

                  <p className="text-[#6b6b70] leading-relaxed">
                    Need a return authorization code for this delivery? Reach out via{' '}
                    <strong>{supportEmail}</strong> or contact the original merchant quoting tracking number{' '}
                    <strong className="font-mono-tabular text-[#1d1d1f]">
                      {shipment.tracking_no}
                    </strong>
                    .
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Courier Chat Modal */}
      {courierChatOpen && shipment && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white border-2 border-[#1d1d1f] shadow-2xl flex flex-col max-h-[80vh]">
            <div className="px-4 py-3 bg-[#3C2B02] text-[#F2E9D4] flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">{shipment.courier.name}</p>
                <p className="text-[11px] text-[#CD9E34]">{shipment.courier.vehicle}</p>
              </div>
              <button
                type="button"
                onClick={() => setCourierChatOpen(false)}
                className="w-9 h-9 flex items-center justify-center hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 p-4 space-y-2.5 overflow-y-auto bg-[#f2f2f2]">
              {chatLog.map((m, idx) => (
                <div
                  key={idx}
                  className={`max-w-[82%] p-3 text-xs ${
                    m.from === 'user'
                      ? 'ml-auto bg-[#1d1d1f] text-white'
                      : 'bg-white border border-neutral-200 text-[#1d1d1f]'
                  }`}
                >
                  <p>{m.text}</p>
                  <span className="block text-[10px] opacity-60 mt-1 font-mono-tabular">{m.time}</span>
                </div>
              ))}
            </div>
            <form onSubmit={sendChat} className="p-3 bg-white border-t border-neutral-200 flex gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Message courier..."
                className="flex-1 border border-neutral-300 px-3 py-2 text-xs focus:outline-none focus:border-[#1d1d1f]"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#9D7110] hover:bg-[#3C2B02] text-white font-extrabold text-xs transition-colors cursor-pointer"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Lightbox for Parcel Photos */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-white border-2 border-[#1d1d1f] p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              aria-label="Close photo preview"
              className="absolute top-3 right-3 w-9 h-9 bg-[#3C2B02] text-[#CD9E34] flex items-center justify-center cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxImage}
              alt="Full-size parcel inspection"
              referrerPolicy="no-referrer"
              className="w-full max-h-[80vh] object-contain bg-[#111]"
            />
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
