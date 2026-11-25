import React from 'react';
import {
  AlertTriangle,
  Bell,
  BellRing,
  CheckCheck,
  MapPin,
  RefreshCw,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import type { PushAlert } from '../types';
import type { NotificationPermissionState } from '../utils/notifications';

interface AlertsDrawerProps {
  open: boolean;
  onClose: () => void;
  alerts: PushAlert[];
  selectedTrackingNo?: string;
  isAdmin?: boolean;
  onMarkAllRead: () => void;
  onSelectShipment: (trackingNo: string) => void;
  notificationPermission: NotificationPermissionState;
  onRequestNotifications: () => void;
  isOnline: boolean;
  simulatedOffline: boolean;
  onToggleSimulatedOffline: () => void;
  offlineQueueCount: number;
  onSyncNow: () => void;
}

export const AlertsDrawer: React.FC<AlertsDrawerProps> = ({
  open,
  onClose,
  alerts,
  selectedTrackingNo = '',
  isAdmin = false,
  onMarkAllRead,
  onSelectShipment,
  notificationPermission,
  onRequestNotifications,
  isOnline,
  simulatedOffline,
  onToggleSimulatedOffline,
  offlineQueueCount,
  onSyncNow,
}) => {
  if (!open) return null;

  const visibleAlerts = isAdmin
    ? alerts
    : selectedTrackingNo.trim()
      ? alerts.filter(
          (al) => al.trackingNo.toUpperCase() === selectedTrackingNo.trim().toUpperCase()
        )
      : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs no-print" role="dialog" aria-modal="true">
      <div className="w-full max-w-md bg-white h-full flex flex-col border-l-2 border-[#1d1d1f] shadow-2xl">
        <div className="px-5 py-4 bg-[#3C2B02] text-[#F2E9D4] border-b border-[#6D500C] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-[#CD9E34]" />
            <h2 className="font-extrabold text-base text-white">Push Alerts & Offline Sync</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close alerts drawer"
            className="w-10 h-10 flex items-center justify-center text-[#F2E9D4] hover:bg-white/15 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls: Push Permissions + Offline Resilience Toggle */}
        <div className="p-4 bg-[#f2f2f2] border-b border-neutral-200 space-y-3">
          <div className="flex items-center justify-between gap-3 bg-white p-3 border border-neutral-200">
            <div>
              <p className="text-xs font-bold text-[#1d1d1f]">Browser Push Notifications</p>
              <p className="text-[11px] text-[#6b6b70]">
                {notificationPermission === 'granted'
                  ? 'Enabled for arrivals, deviations & route updates'
                  : notificationPermission === 'denied'
                    ? 'Blocked in browser settings'
                    : 'Allow OS notifications for geofence triggers'}
              </p>
            </div>
            <button
              type="button"
              onClick={onRequestNotifications}
              disabled={notificationPermission === 'granted'}
              className={`px-3 py-1.5 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                notificationPermission === 'granted'
                  ? 'bg-emerald-100 text-emerald-800 cursor-default'
                  : 'bg-[#1d1d1f] text-[#CD9E34] hover:bg-black'
              }`}
            >
              {notificationPermission === 'granted' ? 'Enabled' : 'Enable Push'}
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 bg-white p-3 border border-neutral-200">
            <div>
              <p className="text-xs font-bold text-[#1d1d1f] flex items-center gap-1.5">
                {isOnline ? <Wifi className="w-3.5 h-3.5 text-[#00C853]" /> : <WifiOff className="w-3.5 h-3.5 text-[#FF5A1F]" />}
                <span>{isOnline ? 'Online · Live GPS Stream' : 'Offline Mode Active'}</span>
              </p>
              <p className="text-[11px] text-[#6b6b70]">
                {offlineQueueCount > 0
                  ? `${offlineQueueCount} pending offline action(s) queued`
                  : 'All shipments & routes cached locally'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {offlineQueueCount > 0 && isOnline && (
                <button
                  type="button"
                  onClick={onSyncNow}
                  className="px-2.5 py-1.5 bg-[#1B6CFF] text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  Sync
                </button>
              )}
              <button
                type="button"
                onClick={onToggleSimulatedOffline}
                className={`px-3 py-1.5 text-xs font-bold border cursor-pointer ${
                  simulatedOffline
                    ? 'bg-[#FF5A1F] text-white border-[#FF5A1F]'
                    : 'bg-white text-[#1d1d1f] border-[#1d1d1f] hover:bg-neutral-100'
                }`}
              >
                {simulatedOffline ? 'Go Online' : 'Test Offline'}
              </button>
            </div>
          </div>
        </div>

        {/* Alert Feed Header */}
        <div className="px-5 py-3 border-b border-neutral-200 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6b6b70]">
            Geofence & Route Feed ({visibleAlerts.length})
          </span>
          <button
            type="button"
            onClick={onMarkAllRead}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#1B6CFF] hover:underline cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-200">
          {visibleAlerts.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#6b6b70]">
              {!isAdmin && !selectedTrackingNo.trim()
                ? 'Track a parcel with your tracking code to see live geofence & route alerts for your shipment.'
                : 'No geofence or route alerts yet for this parcel.'}
            </div>
          ) : (
            visibleAlerts.map((al) => (
              <button
                key={al.id}
                type="button"
                onClick={() => {
                  onSelectShipment(al.trackingNo);
                  onClose();
                }}
                className={`w-full text-left p-4 hover:bg-[#F2E9D4]/75 transition-colors flex gap-3 cursor-pointer ${
                  !al.read ? 'bg-[#F2E9D4]/45' : 'bg-white'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    al.type === 'deviation'
                      ? 'bg-[#FF5A1F] text-white'
                      : al.type === 'arrival'
                        ? 'bg-[#00C853] text-white'
                        : 'bg-[#1B6CFF] text-white'
                  }`}
                >
                  {al.type === 'deviation' ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : al.type === 'arrival' ? (
                    <MapPin className="w-4 h-4" />
                  ) : (
                    <BellRing className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-[#1d1d1f] truncate">{al.title}</p>
                    {!al.read && <span className="w-2 h-2 rounded-full bg-[#FF5A1F] shrink-0" />}
                  </div>
                  <p className="text-xs text-[#6b6b70] mt-1 leading-relaxed">{al.message}</p>
                  <div className="flex items-center gap-2 mt-2 text-[11px] font-mono-tabular text-[#6b6b70]">
                    <span>{al.trackingNo}</span>
                    <span>·</span>
                    <span>{al.timestamp}</span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
