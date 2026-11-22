import React, { useEffect, useMemo, useState } from 'react';
import {
  Download,
  FastForward,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { Search } from 'lucide-react';
import { ANALYTICS_DAILY_VOLUME } from '../data/seedData';
import type { Shipment } from '../types';
import { MapViewport } from '../components/MapViewport';

interface AnalyticsPageProps {
  shipments: Shipment[];
  selectedTrackingNo: string;
  onSelectTracking: (trackingNo: string) => void;
  isOnline: boolean;
  quotaExceeded: boolean;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  shipments,
  selectedTrackingNo,
  onSelectTracking,
  isOnline,
  quotaExceeded,
}) => {
  const [lookupInput, setLookupInput] = useState(selectedTrackingNo);
  const normalizedQuery = selectedTrackingNo.trim().toUpperCase();
  const shipment = normalizedQuery
    ? shipments.find(
        (s) =>
          s.tracking_no.toUpperCase() === normalizedQuery ||
          s.receipt_no.toUpperCase() === normalizedQuery
      ) || null
    : null;

  const [playbackIdx, setPlaybackIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 2 | 5 | 10>(2);

  const waypoints = shipment?.routeWaypoints ?? [];

  useEffect(() => {
    setLookupInput(selectedTrackingNo);
  }, [selectedTrackingNo]);

  useEffect(() => {
    setPlaybackIdx(0);
    setIsPlaying(false);
  }, [shipment?.tracking_no]);

  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = Math.max(200, Math.round(1400 / speedMultiplier));
    const timer = setInterval(() => {
      setPlaybackIdx((prev) => {
        if (prev >= waypoints.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, speedMultiplier, waypoints.length]);

  const activeWaypoint = waypoints[Math.min(playbackIdx, waypoints.length - 1)] || {
    lat: shipment?.current.lat ?? 51.5072,
    lng: shipment?.current.lng ?? -0.1276,
    speedKmh: shipment?.current.speedKmh ?? 0,
    headingDeg: shipment?.current.headingDeg ?? 0,
    timestamp: shipment?.updated_at ?? '',
    label: shipment?.current.location ?? '',
  };

  const avgRouteSpeed = useMemo(() => {
    const moving = waypoints.filter((w) => w.speedKmh > 0);
    if (moving.length === 0) return 0;
    return Math.round(moving.reduce((acc, w) => acc + w.speedKmh, 0) / moving.length);
  }, [waypoints]);

  const maxSpeed = useMemo(() => {
    return waypoints.length > 0 ? Math.max(100, ...waypoints.map((w) => w.speedKmh)) : 100;
  }, [waypoints]);

  const handleExportCsv = () => {
    if (!shipment) return;
    const header = 'TrackingNo,Timestamp,Latitude,Longitude,SpeedKmh,HeadingDeg,Sector\n';
    const rows = waypoints
      .map(
        (w) =>
          `${shipment.tracking_no},"${w.timestamp}",${w.lat},${w.lng},${w.speedKmh},${w.headingDeg},"${w.label || ''}"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${shipment.tracking_no}_route_analytics.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24 lg:pb-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#1B6CFF]">
            Fleet Intelligence
          </span>
          <h1 className="font-display text-3xl text-[#1d1d1f] mt-1">
            Historical Route Playback & Analytics
          </h1>
          <p className="text-sm text-[#6b6b70] mt-1">
            Replay recorded GPS breadcrumbs, inspect corridor velocity, and monitor geofence SLA compliance.
          </p>
        </div>

        {shipment && (
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1d1d1f] text-[#FFCC00] text-xs font-bold hover:bg-black transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Route CSV</span>
          </button>
        )}
      </div>

      {/* Top Performance KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'On-Time SLA', value: '99.4%', sub: '+0.6% vs last 30d' },
          {
            label: 'Avg Corridor Speed',
            value: shipment ? `${avgRouteSpeed} km/h` : '68 km/h',
            sub: shipment ? `Route ${shipment.tracking_no}` : 'Fleet corridor average',
          },
          { label: 'Geofence Compliance', value: '98.6%', sub: '10 deviations across 2,602 trips' },
          { label: 'EV Fleet CO2 Saved', value: '40.2%', sub: 'Consolidated urban hubs' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white border border-neutral-200 p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6b6b70]">{kpi.label}</span>
            <div className="font-display text-2xl sm:text-3xl text-[#1d1d1f] mt-1.5 tabular-nums">
              {kpi.value}
            </div>
            <p className="text-xs text-[#6b6b70] mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Historical Route Playback Studio */}
      <div className="bg-white border border-neutral-200 p-5 sm:p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
          <div>
            <h2 className="font-extrabold text-lg text-[#1d1d1f]">Historical Route Playback</h2>
            <p className="text-xs text-[#6b6b70]">
              Enter your tracking code to scrub through GPS waypoints with synchronized speed & heading telemetry.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSelectTracking(lookupInput.trim().toUpperCase());
            }}
            className="flex gap-2 w-full md:w-auto md:min-w-[340px]"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#6b6b70] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={lookupInput}
                onChange={(e) => setLookupInput(e.target.value)}
                placeholder="Enter tracking code"
                className="w-full border border-neutral-300 pl-9 pr-3 py-2 text-xs font-mono-tabular focus:outline-none focus:border-[#1d1d1f]"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1d1d1f] text-[#FFCC00] text-xs font-bold cursor-pointer whitespace-nowrap"
            >
              Load Route
            </button>
          </form>
        </div>

        {!shipment ? (
          <div className="p-8 bg-[#f2f2f2] border border-neutral-200 text-center text-xs text-[#6b6b70]">
            {normalizedQuery ? (
              <>
                No parcel matched tracking code <strong className="font-mono-tabular text-[#1d1d1f]">{normalizedQuery}</strong>.
              </>
            ) : (
              'Enter your tracking code above (or launch Route Playback from your tracked parcel) to view its historical GPS breadcrumbs.'
            )}
          </div>
        ) : (
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-4">
            <MapViewport
              shipment={shipment}
              activePosition={activeWaypoint}
              playbackIndex={playbackIdx}
              isOnline={isOnline}
              quotaExceeded={quotaExceeded}
              showGeofences={true}
              heightClass="h-[320px] sm:h-[400px]"
            />

            {/* Playback Transport & Timeline Scrubber */}
            <div className="bg-[#1d1d1f] text-white p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPlaying(false);
                      setPlaybackIdx(0);
                    }}
                    aria-label="Reset playback"
                    className="w-9 h-9 bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlaybackIdx((i) => Math.max(0, i - 1))}
                    aria-label="Previous waypoint"
                    className="w-9 h-9 bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (playbackIdx >= waypoints.length - 1) setPlaybackIdx(0);
                      setIsPlaying((p) => !p);
                    }}
                    className="px-4 h-9 bg-[#FFCC00] text-[#1d1d1f] font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{isPlaying ? 'Pause' : 'Play Route'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlaybackIdx((i) => Math.min(waypoints.length - 1, i + 1))}
                    aria-label="Next waypoint"
                    className="w-9 h-9 bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>

                {/* Speed Multiplier */}
                <div className="flex items-center gap-1.5 text-xs">
                  <FastForward className="w-3.5 h-3.5 text-[#FFCC00]" />
                  {([1, 2, 5, 10] as const).map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => setSpeedMultiplier(sp)}
                      className={`px-2.5 py-1 font-mono-tabular font-bold cursor-pointer ${
                        speedMultiplier === sp
                          ? 'bg-[#FFCC00] text-[#1d1d1f]'
                          : 'bg-white/10 text-neutral-300 hover:bg-white/20'
                      }`}
                    >
                      {sp}x
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, waypoints.length - 1)}
                  value={playbackIdx}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setPlaybackIdx(Number(e.target.value));
                  }}
                  aria-label="Route playback timeline scrubber"
                  className="w-full accent-[#FFCC00]"
                />
                <div className="flex justify-between text-[11px] font-mono-tabular text-neutral-400 mt-1">
                  <span>
                    Waypoint {playbackIdx + 1} / {waypoints.length} · {activeWaypoint.label || 'Sector'}
                  </span>
                  <span>
                    {activeWaypoint.timestamp} · {activeWaypoint.speedKmh} km/h · {activeWaypoint.headingDeg}°
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Breadcrumb Waypoint Log */}
          <div className="lg:col-span-4 border border-neutral-200 divide-y divide-neutral-200 max-h-[505px] overflow-y-auto">
            <div className="px-4 py-3 bg-[#f2f2f2] text-xs font-extrabold uppercase tracking-wider text-[#1d1d1f]">
              Recorded GPS Breadcrumbs
            </div>
            {waypoints.map((wp, idx) => (
              <button
                key={`${wp.lat}-${wp.lng}-${idx}`}
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setPlaybackIdx(idx);
                }}
                className={`w-full text-left px-4 py-3 text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                  idx === playbackIdx ? 'bg-[#FFF6CC] font-bold' : 'hover:bg-neutral-50'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-[#1d1d1f] truncate">{wp.label || `Checkpoint ${idx + 1}`}</p>
                  <p className="text-[11px] font-mono-tabular text-[#6b6b70] mt-0.5">
                    {wp.timestamp} · {wp.lat.toFixed(3)}, {wp.lng.toFixed(3)}
                  </p>
                </div>
                <span className="font-mono-tabular text-xs font-bold text-[#1B6CFF] shrink-0">
                  {wp.speedKmh} km/h
                </span>
              </button>
            ))}
          </div>
        </div>
        )}
      </div>

      {/* Analytics Charts Row */}
      <div className={`grid ${shipment ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-6`}>
        {/* Daily Volume & SLA Chart */}
        <div className="bg-white border border-neutral-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-extrabold text-base text-[#1d1d1f]">Weekly Delivery Volume & SLA</h3>
              <p className="text-xs text-[#6b6b70]">Parcels dispatched per day with geofence exception counts</p>
            </div>
            <span className="font-mono-tabular text-xs font-bold text-[#00C853]">Avg 99.4%</span>
          </div>

          <div className="h-56 flex items-end justify-between gap-3 pt-4 border-b border-neutral-200 pb-2">
            {ANALYTICS_DAILY_VOLUME.map((d) => {
              const heightPct = Math.round((d.parcels / 560) * 100);
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center h-full justify-end group">
                  <span className="text-[11px] font-mono-tabular font-bold text-[#1d1d1f] mb-1">
                    {d.parcels}
                  </span>
                  <div
                    className="w-full max-w-[44px] bg-[#1d1d1f] group-hover:bg-[#FFCC00] transition-colors"
                    style={{ height: `${heightPct}%` }}
                    title={`${d.day}: ${d.parcels} parcels · ${d.onTimePct}% on-time · ${d.deviations} deviations`}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between gap-3 pt-2 text-xs font-bold text-[#6b6b70]">
            {ANALYTICS_DAILY_VOLUME.map((d) => (
              <div key={d.day} className="flex-1 text-center">
                <span>{d.day}</span>
                <span className="block text-[10px] font-mono-tabular text-neutral-400">{d.onTimePct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Route Velocity Profile Chart (Only shown when a valid tracking code is loaded) */}
        {shipment && (
          <div className="bg-white border border-neutral-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-extrabold text-base text-[#1d1d1f]">
                  Velocity Profile · {shipment.tracking_no}
                </h3>
                <p className="text-xs text-[#6b6b70]">Speed (km/h) recorded across corridor waypoints</p>
              </div>
              <span className="font-mono-tabular text-xs font-bold text-[#1B6CFF]">
                Peak {Math.max(0, ...waypoints.map((w) => w.speedKmh))} km/h
              </span>
            </div>

            <svg viewBox="0 0 500 180" className="w-full h-48 overflow-visible" role="img" aria-label="Route velocity profile">
              {[0, 0.5, 1].map((f) => (
                <line
                  key={f}
                  x1="0"
                  y1={160 - f * 140}
                  x2="500"
                  y2={160 - f * 140}
                  stroke="#e5e7eb"
                  strokeDasharray="4 4"
                />
              ))}
              {waypoints.length >= 2 && (
                <>
                  <polyline
                    fill="none"
                    stroke="#1B6CFF"
                    strokeWidth="3"
                    points={waypoints
                      .map((w, idx) => {
                        const x = (idx / Math.max(1, waypoints.length - 1)) * 480 + 10;
                        const y = 160 - (w.speedKmh / maxSpeed) * 140;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                  />
                  {waypoints.map((w, idx) => {
                    const x = (idx / Math.max(1, waypoints.length - 1)) * 480 + 10;
                    const y = 160 - (w.speedKmh / maxSpeed) * 140;
                    const active = idx === playbackIdx;
                    return (
                      <circle
                        key={idx}
                        cx={x}
                        cy={y}
                        r={active ? 6 : 3.5}
                        fill={active ? '#FFCC00' : '#1d1d1f'}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    );
                  })}
                </>
              )}
            </svg>
            <div className="flex justify-between text-[11px] font-mono-tabular text-[#6b6b70] mt-2">
              <span>{shipment.origin.city}</span>
              <span>Midpoint</span>
              <span>{shipment.dest.city}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
