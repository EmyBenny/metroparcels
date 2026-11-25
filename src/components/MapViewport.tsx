import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  APILoadingStatus,
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
  useMap,
} from '@vis.gl/react-google-maps';
import { Navigation, Plane, Truck, Home, Layers, WifiOff } from 'lucide-react';
import type { GeofenceZone, HistoricalWaypoint, LatLngPoint, Shipment } from '../types';

interface MapViewportProps {
  shipment: Shipment;
  activePosition?: LatLngPoint & { speedKmh?: number; label?: string; headingDeg?: number };
  playbackIndex?: number;
  isOnline: boolean;
  quotaExceeded: boolean;
  showGeofences?: boolean;
  onMapClickAddGeofence?: (coords: LatLngPoint) => void;
  heightClass?: string;
}

const MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || '';
const MAPS_MAP_ID = (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined)?.trim() || 'DEMO_MAP_ID';
const MAP_LIBRARIES: ('marker')[] = ['marker'];

const ApiLoadingGuard: React.FC<{
  onFailure: () => void;
  fallback: React.ReactNode;
  children: React.ReactNode;
}> = ({ onFailure, fallback, children }) => {
  const status = useApiLoadingStatus();
  const onFailureRef = useRef(onFailure);
  onFailureRef.current = onFailure;

  useEffect(() => {
    if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
      onFailureRef.current();
    }
  }, [status]);

  if (status !== APILoadingStatus.LOADED) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

const MapCapabilityMarkers: React.FC<{
  onMapIdUnavailable: () => void;
  children: React.ReactNode;
}> = ({ onMapIdUnavailable, children }) => {
  const map = useMap();
  const [advancedMarkersReady, setAdvancedMarkersReady] = useState(false);
  const onUnavailableRef = useRef(onMapIdUnavailable);
  onUnavailableRef.current = onMapIdUnavailable;

  useEffect(() => {
    if (!map || typeof google === 'undefined') return;
    let disposed = false;

    const syncCapabilities = () => {
      if (disposed) return;
      const caps = map.getMapCapabilities?.();
      if (caps?.isAdvancedMarkersAvailable) {
        setAdvancedMarkersReady(true);
      } else {
        setAdvancedMarkersReady(false);
        onUnavailableRef.current();
      }
    };

    const capListener = map.addListener('mapcapabilities_changed', syncCapabilities);

    return () => {
      disposed = true;
      capListener.remove();
    };
  }, [map]);

  if (!advancedMarkersReady) return null;
  return <>{children}</>;
};

const RouteAndGeofenceOverlays: React.FC<{
  waypoints: HistoricalWaypoint[];
  activePosition: LatLngPoint;
  geofences: GeofenceZone[];
  showGeofences: boolean;
  isDeviation: boolean;
  onMapClickAddGeofence?: (coords: LatLngPoint) => void;
}> = ({ waypoints, activePosition, geofences, showGeofences, isDeviation, onMapClickAddGeofence }) => {
  const map = useMap();
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const circlesRef = useRef<google.maps.Circle[]>([]);

  // Fit bounds when shipment changes
  useEffect(() => {
    if (!map || waypoints.length === 0 || typeof google === 'undefined') return;
    const bounds = new google.maps.LatLngBounds();
    waypoints.forEach((wp) => bounds.extend({ lat: wp.lat, lng: wp.lng }));
    bounds.extend({ lat: activePosition.lat, lng: activePosition.lng });
    map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
  }, [map, waypoints]);

  // Click listener for custom geofence placement
  useEffect(() => {
    if (!map || !onMapClickAddGeofence) return;
    const listener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        onMapClickAddGeofence({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      }
    });
    return () => {
      listener.remove();
    };
  }, [map, onMapClickAddGeofence]);

  // Draw polylines + geofence circles
  useEffect(() => {
    if (!map || typeof google === 'undefined') return;

    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    circlesRef.current.forEach((c) => c.setMap(null));
    circlesRef.current = [];

    const path = waypoints.map((w) => ({ lat: w.lat, lng: w.lng }));
    if (path.length >= 2) {
      const plannedLine = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#1d1d1f',
        strokeOpacity: 0.35,
        strokeWeight: 3,
        map,
      });
      polylinesRef.current.push(plannedLine);

      // Traveled path up to active position
      const traveledPath = [...path.slice(0, Math.max(2, Math.ceil(path.length * 0.7))), activePosition];
      const activeLine = new google.maps.Polyline({
        path: traveledPath,
        geodesic: true,
        strokeColor: isDeviation ? '#FF5A1F' : '#1B6CFF',
        strokeOpacity: 0.95,
        strokeWeight: 4,
        map,
      });
      polylinesRef.current.push(activeLine);
    }

    if (showGeofences) {
      geofences.forEach((gf) => {
        if (!gf.active) return;
        const color =
          gf.type === 'destination'
            ? '#00C853'
            : gf.type === 'hub'
              ? '#1B6CFF'
              : gf.type === 'origin'
                ? '#1d1d1f'
                : '#C42BF0';
        const circle = new google.maps.Circle({
          strokeColor: color,
          strokeOpacity: 0.85,
          strokeWeight: 2,
          fillColor: color,
          fillOpacity: gf.triggered ? 0.22 : 0.1,
          center: { lat: gf.lat, lng: gf.lng },
          radius: gf.radiusMeters,
          clickable: false,
          map,
        });
        circlesRef.current.push(circle);
      });
    }

    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
      circlesRef.current.forEach((c) => c.setMap(null));
    };
  }, [map, waypoints, activePosition, geofences, showGeofences, isDeviation]);

  return null;
};

const VehicleMarkerWithWindow: React.FC<{
  position: LatLngPoint;
  shipment: Shipment;
  speedKmh?: number;
  label?: string;
}> = ({ position, shipment, speedKmh, label }) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [open, setOpen] = useState(false);

  const isAir = shipment.distance_km > 900 && shipment.status !== 'Delivered';
  const isDelivered = shipment.status === 'Delivered';
  const isDeviation = shipment.status === 'Route Deviation';

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={position}
        onClick={() => setOpen((o) => !o)}
        title={`${shipment.tracking_no} — ${shipment.courier.name}`}
      >
        <div
          className={`w-12 h-12 rounded-full border-3 border-white shadow-xl flex items-center justify-center transition-transform ${
            isDeviation
              ? 'bg-[#FF5A1F] text-white'
              : isDelivered
                ? 'bg-[#00C853] text-white'
                : 'bg-[#9D7110] text-white'
          }`}
        >
          {isDelivered ? (
            <Home className="w-5 h-5" />
          ) : isAir ? (
            <Plane className="w-5 h-5" />
          ) : (
            <Truck className="w-5 h-5" />
          )}
        </div>
      </AdvancedMarker>
      {open && marker && (
        <InfoWindow anchor={marker} onCloseClick={() => setOpen(false)}>
          <div className="p-1 text-xs text-[#1d1d1f] max-w-[210px]">
            <p className="font-bold text-sm">{shipment.tracking_no}</p>
            <p className="text-[#6b6b70] mt-0.5">{label || shipment.current.location}</p>
            <p className="mt-1 font-mono-tabular">
              Speed: {speedKmh ?? shipment.current.speedKmh} km/h · {shipment.status}
            </p>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

/** Offline / Low-Connectivity Vector Tactical Map rendered directly in SVG */
const OfflineVectorMap: React.FC<{
  shipment: Shipment;
  activePosition: LatLngPoint & { speedKmh?: number; label?: string };
  showGeofences: boolean;
  playbackIndex?: number;
  reasonLabel: string;
  onMapClickAddGeofence?: (coords: LatLngPoint) => void;
}> = ({ shipment, activePosition, showGeofences, playbackIndex, reasonLabel, onMapClickAddGeofence }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);

  const bounds = useMemo(() => {
    const pts = [
      shipment.origin,
      shipment.dest,
      activePosition,
      ...shipment.routeWaypoints,
      ...shipment.geofences,
    ];
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;
    pts.forEach((p) => {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    });
    const latPad = Math.max(0.35, (maxLat - minLat) * 0.22);
    const lngPad = Math.max(0.45, (maxLng - minLng) * 0.22);
    return {
      minLat: minLat - latPad,
      maxLat: maxLat + latPad,
      minLng: minLng - lngPad,
      maxLng: maxLng + lngPad,
    };
  }, [shipment, activePosition]);

  const W = 800;
  const H = 480;

  const project = (p: LatLngPoint) => {
    const x = ((p.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * W;
    const y = H - ((p.lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * H;
    return { x, y };
  };

  const unproject = (x: number, y: number): LatLngPoint => {
    const lng = bounds.minLng + (x / W) * (bounds.maxLng - bounds.minLng);
    const lat = bounds.minLat + ((H - y) / H) * (bounds.maxLat - bounds.minLat);
    return { lat: Number(lat.toFixed(4)), lng: Number(lng.toFixed(4)) };
  };

  const routePts = shipment.routeWaypoints.map(project);
  const splitIdx =
    typeof playbackIndex === 'number'
      ? Math.max(1, playbackIndex + 1)
      : Math.max(1, Math.ceil((shipment.progress / 100) * routePts.length));
  const traveledPts = [...routePts.slice(0, splitIdx), project(activePosition)];
  const currentProj = project(activePosition);
  const originProj = project(shipment.origin);
  const destProj = project(shipment.dest);
  const isDeviation = shipment.status === 'Route Deviation';

  // Approximate meters-to-pixels scale
  const latSpanMeters = (bounds.maxLat - bounds.minLat) * 110540;
  const pxPerMeter = H / Math.max(1, latSpanMeters);

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onMapClickAddGeofence || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    onMapClickAddGeofence(unproject(x, y));
  };

  return (
    <div className="relative w-full h-full bg-[#f5f4ef] overflow-hidden select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        onClick={handleSvgClick}
        className={`w-full h-full ${onMapClickAddGeofence ? 'cursor-crosshair' : ''}`}
        role="img"
        aria-label={`Route corridor map from ${shipment.origin.city} to ${shipment.dest.city}`}
      >
        <defs>
          <pattern id="tp-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e3da" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#tp-grid)" />

        {/* Latitude & Longitude axis ticks */}
        {[0.25, 0.5, 0.75].map((f) => {
          const latVal = (bounds.minLat + f * (bounds.maxLat - bounds.minLat)).toFixed(2);
          const lngVal = (bounds.minLng + f * (bounds.maxLng - bounds.minLng)).toFixed(2);
          return (
            <g key={f}>
              <text x="10" y={H - f * H - 4} fill="#9ca3af" fontSize="10" fontFamily="JetBrains Mono, monospace">
                {latVal}°N
              </text>
              <text x={f * W + 4} y={H - 8} fill="#9ca3af" fontSize="10" fontFamily="JetBrains Mono, monospace">
                {lngVal}°E
              </text>
            </g>
          );
        })}

        {/* Geofence Zones */}
        {showGeofences &&
          shipment.geofences
            .filter((g) => g.active)
            .map((gf) => {
              const c = project(gf);
              const rPx = Math.max(16, Math.min(110, gf.radiusMeters * pxPerMeter));
              const color =
                gf.type === 'destination'
                  ? '#00C853'
                  : gf.type === 'hub'
                    ? '#1B6CFF'
                    : gf.type === 'origin'
                      ? '#1d1d1f'
                      : '#C42BF0';
              return (
                <g key={gf.id}>
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={rPx}
                    fill={color}
                    fillOpacity={gf.triggered ? 0.16 : 0.08}
                    stroke={color}
                    strokeWidth="2"
                    strokeDasharray={gf.triggered ? undefined : '5 4'}
                  />
                  <text
                    x={c.x}
                    y={c.y - rPx - 6}
                    textAnchor="middle"
                    fill={color}
                    fontSize="10"
                    fontWeight="700"
                    fontFamily="Archivo, sans-serif"
                  >
                    {gf.name} ({(gf.radiusMeters / 1000).toFixed(1)} km)
                  </text>
                </g>
              );
            })}

        {/* Planned Route Polyline */}
        {routePts.length >= 2 && (
          <polyline
            fill="none"
            stroke="#1d1d1f"
            strokeOpacity="0.28"
            strokeWidth="3.5"
            strokeDasharray="8 6"
            points={routePts.map((p) => `${p.x},${p.y}`).join(' ')}
          />
        )}

        {/* Active / Traveled Corridor */}
        {traveledPts.length >= 2 && (
          <polyline
            fill="none"
            stroke={isDeviation ? '#FF5A1F' : '#1B6CFF'}
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={traveledPts.map((p) => `${p.x},${p.y}`).join(' ')}
          />
        )}

        {/* Waypoint Breadcrumbs */}
        {shipment.routeWaypoints.map((wp, idx) => {
          const p = project(wp);
          return (
            <circle
              key={`${wp.lat}-${wp.lng}-${idx}`}
              cx={p.x}
              cy={p.y}
              r={4}
              fill="#ffffff"
              stroke="#1d1d1f"
              strokeWidth="2"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredLabel(`${wp.label || 'Waypoint'} · ${wp.timestamp}`)}
              onMouseLeave={() => setHoveredLabel(null)}
            />
          );
        })}

        {/* Origin Marker */}
        <g transform={`translate(${originProj.x}, ${originProj.y})`}>
          <circle r="11" fill="#1d1d1f" stroke="#ffffff" strokeWidth="3" />
          <text y="-16" textAnchor="middle" fill="#1d1d1f" fontSize="11" fontWeight="800">
            {shipment.origin.city}
          </text>
        </g>

        {/* Destination Marker */}
        <g transform={`translate(${destProj.x}, ${destProj.y})`}>
          <circle r="11" fill="#00C853" stroke="#ffffff" strokeWidth="3" />
          <text y="-16" textAnchor="middle" fill="#1d1d1f" fontSize="11" fontWeight="800">
            {shipment.dest.city}
          </text>
        </g>

        {/* Active Vehicle / Courier Pin */}
        <g transform={`translate(${currentProj.x}, ${currentProj.y})`}>
          <circle r="22" fill={isDeviation ? '#FF5A1F' : '#9D7110'} fillOpacity="0.28" />
          <circle
            r="14"
            fill={isDeviation ? '#FF5A1F' : '#9D7110'}
            stroke="#1d1d1f"
            strokeWidth="3"
          />
          <circle r="4" fill="#FFFFFF" />
        </g>
      </svg>

      {/* Top Left Mode Badge */}
      <div className="absolute top-3 left-3 bg-[#1d1d1f] text-white px-3 py-1.5 text-xs font-medium flex items-center gap-2 shadow-md">
        <WifiOff className="w-3.5 h-3.5 text-[#CD9E34] shrink-0" />
        <span>{reasonLabel}</span>
      </div>

      {/* Hover Tooltip */}
      {hoveredLabel && (
        <div className="absolute bottom-3 left-3 bg-white border border-[#1d1d1f] px-3 py-1.5 text-xs font-medium shadow-sm">
          {hoveredLabel}
        </div>
      )}

      {/* Bottom Right Coordinate Readout */}
      <div className="absolute bottom-3 right-3 bg-white/95 border border-neutral-300 px-2.5 py-1 text-[11px] font-mono-tabular text-[#1d1d1f]">
        {activePosition.lat.toFixed(4)}, {activePosition.lng.toFixed(4)}
      </div>
    </div>
  );
};

export const MapViewport: React.FC<MapViewportProps> = ({
  shipment,
  activePosition,
  playbackIndex,
  isOnline,
  quotaExceeded,
  showGeofences = true,
  onMapClickAddGeofence,
  heightClass = 'h-[380px] lg:h-[520px]',
}) => {
  const [preferOfflineVector, setPreferOfflineVector] = useState(false);
  const [mapConfigUnavailable, setMapConfigUnavailable] = useState(false);
  const handleMapUnavailable = useCallback(() => setMapConfigUnavailable(true), []);

  useEffect(() => {
    window.addEventListener('gmp-map-config-unavailable', handleMapUnavailable);
    return () => window.removeEventListener('gmp-map-config-unavailable', handleMapUnavailable);
  }, [handleMapUnavailable]);

  const pos = activePosition ?? {
    lat: shipment.current.lat,
    lng: shipment.current.lng,
    speedKmh: shipment.current.speedKmh,
    headingDeg: shipment.current.headingDeg,
    label: shipment.current.location,
  };

  const canUseGoogleMaps =
    isOnline && !quotaExceeded && !mapConfigUnavailable && Boolean(MAPS_API_KEY) && !preferOfflineVector;

  const vectorFallback = (
    <OfflineVectorMap
      shipment={shipment}
      activePosition={pos}
      showGeofences={showGeofences}
      playbackIndex={playbackIndex}
      reasonLabel={
        !isOnline
          ? 'Offline Vector Map · Cached Telemetry'
          : preferOfflineVector
            ? 'Tactical Vector Map View'
            : mapConfigUnavailable
              ? 'Tactical Vector Map · Cached Corridor'
              : 'Loading Live Corridor Map...'
      }
      onMapClickAddGeofence={onMapClickAddGeofence}
    />
  );

  return (
    <div className={`relative w-full ${heightClass} border border-neutral-300 bg-neutral-100 overflow-hidden`}>
      {canUseGoogleMaps ? (
        <APIProvider
          apiKey={MAPS_API_KEY}
          libraries={MAP_LIBRARIES}
          version="weekly"
          onError={handleMapUnavailable}
        >
          <ApiLoadingGuard onFailure={handleMapUnavailable} fallback={vectorFallback}>
            <GoogleMap
              mapId={MAPS_MAP_ID}
              defaultCenter={pos}
              defaultZoom={6}
              gestureHandling="greedy"
              disableDefaultUI={false}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              className="w-full h-full"
            >
              <RouteAndGeofenceOverlays
                waypoints={shipment.routeWaypoints}
                activePosition={pos}
                geofences={shipment.geofences}
                showGeofences={showGeofences}
                isDeviation={shipment.status === 'Route Deviation'}
                onMapClickAddGeofence={onMapClickAddGeofence}
              />

              <MapCapabilityMarkers onMapIdUnavailable={handleMapUnavailable}>
                {/* Origin Pin */}
                <AdvancedMarker position={shipment.origin} title={`Origin: ${shipment.origin.city}`}>
                  <div className="px-2 py-1 bg-[#1d1d1f] text-[#CD9E34] text-[11px] font-bold border border-white shadow">
                    ORIGIN · {shipment.origin.city.split(',')[0]}
                  </div>
                </AdvancedMarker>

                {/* Destination Pin */}
                <AdvancedMarker position={shipment.dest} title={`Destination: ${shipment.dest.city}`}>
                  <div className="px-2 py-1 bg-[#00C853] text-white text-[11px] font-bold border border-white shadow">
                    DEST · {shipment.dest.city.split(',')[0]}
                  </div>
                </AdvancedMarker>

                {/* Active Courier / Playback Vehicle */}
                <VehicleMarkerWithWindow
                  position={pos}
                  shipment={shipment}
                  speedKmh={pos.speedKmh}
                  label={pos.label}
                />
              </MapCapabilityMarkers>
            </GoogleMap>
          </ApiLoadingGuard>
        </APIProvider>
      ) : (
        vectorFallback
      )}

      {/* Map View Switcher (when Google Maps is available) */}
      {isOnline && !quotaExceeded && !mapConfigUnavailable && Boolean(MAPS_API_KEY) && (
        <button
          type="button"
          onClick={() => setPreferOfflineVector((v) => !v)}
          className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 bg-white/95 border border-[#1d1d1f] px-3 py-1.5 text-xs font-bold text-[#1d1d1f] hover:bg-[#9D7110] hover:text-white transition-colors shadow-sm cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{preferOfflineVector ? 'Google Maps' : 'Vector Mode'}</span>
        </button>
      )}

      {/* Compact Live Telemetry HUD */}
      <div className="absolute bottom-3 left-3 z-10 hidden sm:flex items-center gap-3 bg-[#1d1d1f]/92 text-white px-3.5 py-2 text-xs shadow-lg pointer-events-none">
        <Navigation className="w-3.5 h-3.5 text-[#CD9E34]" />
        <span className="font-mono-tabular">
          {pos.speedKmh ?? shipment.current.speedKmh} km/h
        </span>
        <span className="text-neutral-400">·</span>
        <span className="truncate max-w-[200px]">{pos.label || shipment.current.location}</span>
      </div>
    </div>
  );
};
