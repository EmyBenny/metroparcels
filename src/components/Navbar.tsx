import React, { useState } from 'react';
import {
  Bell,
  Briefcase,
  HelpCircle,
  Home,
  Menu,
  ScanLine,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import type { PageRoute } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  currentPage: PageRoute;
  onNavigate: (page: PageRoute) => void;
  unreadAlertsCount: number;
  onOpenAlerts: () => void;
  isOnline: boolean;
  offlineQueueCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  unreadAlertsCount,
  onOpenAlerts,
  isOnline,
  offlineQueueCount,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navTo = (page: PageRoute) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Desktop & Mobile Top Navigation — Strictly 3-Zone Contract */}
      <header className="sticky top-0 z-40 bg-[#FFCC00] border-b border-black/10 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 lg:h-16 flex items-center justify-between gap-4 xl:gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => navTo('home')}
            className="inline-flex items-center gap-2.5 text-[#1d1d1f] font-extrabold text-lg sm:text-xl tracking-tight whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span className="w-8 h-8 rounded-lg bg-[#1d1d1f] text-[#FFCC00] flex items-center justify-center font-display text-base">
              M
            </span>
            <span>Metro Parcel Service</span>
          </button>

          {/* Zone 2: Desktop Concise Nav Links (No Send / Receipt / Return for visitors) */}
          <nav
            className="hidden lg:flex items-center gap-5 xl:gap-6 text-sm font-bold text-[#1d1d1f]"
            aria-label="Main navigation"
          >
            {(
              [
                ['home', 'Home'],
                ['track', 'Track'],
                ['business', 'Business'],
                ['about', 'About'],
                ['help', 'Help'],
                ['contact', 'Contact'],
              ] as Array<[PageRoute, string]>
            ).map(([route, label]) => (
              <button
                key={route}
                type="button"
                onClick={() => navTo(route)}
                className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  currentPage === route
                    ? 'border-[#1d1d1f]'
                    : 'border-transparent hover:border-[#1d1d1f]/50'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Alert Center + Admin + Primary Action */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenAlerts}
              aria-label={`Alerts and offline status (${unreadAlertsCount} unread)`}
              className="relative w-10 h-10 flex items-center justify-center bg-black/8 hover:bg-black/15 text-[#1d1d1f] transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {unreadAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#FF5A1F] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {unreadAlertsCount}
                </span>
              )}
            </button>

            <div className="hidden sm:block">
              <PWAInstallButton variant="compact" />
            </div>

            <button
              type="button"
              onClick={() => navTo('track')}
              className="hidden lg:inline-flex items-center px-4 py-2 bg-[#1d1d1f] text-white text-sm font-bold hover:bg-black hover:text-[#FFCC00] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Track parcel
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              className="lg:hidden w-11 h-11 flex items-center justify-center text-[#1d1d1f] cursor-pointer"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Full Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-[#FFCC00] text-[#1d1d1f] flex flex-col p-6 overflow-y-auto lg:hidden">
          <div className="flex items-center justify-between pb-4 border-b border-black/15">
            <span className="font-extrabold text-xl tracking-tight">Metro Parcel Service Menu</span>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
              className="w-11 h-11 flex items-center justify-center cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="py-4 space-y-1 flex-1">
            {(
              [
                ['home', 'Home'],
                ['track', 'Track Parcel'],
                ['services', 'Services Overview'],
                ['business', 'Business'],
                ['about', 'About'],
                ['help', 'Help'],
                ['contact', 'Contact'],
                ['analytics', 'Route Playback & Analytics'],
              ] as Array<[PageRoute, string]>
            ).map(([route, label]) => (
              <button
                key={route}
                type="button"
                onClick={() => navTo(route)}
                className={`w-full text-left py-3 px-2 text-lg font-bold border-b border-black/10 flex items-center justify-between cursor-pointer ${
                  currentPage === route ? 'underline underline-offset-4' : ''
                }`}
              >
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="pt-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold bg-black/10 px-3 py-2.5">
              <span className="inline-flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-emerald-700" />
                ) : (
                  <WifiOff className="w-4 h-4 text-amber-800" />
                )}
                {isOnline ? 'Connected · Live Sync Active' : 'Offline Mode · Cached Data'}
              </span>
              {offlineQueueCount > 0 && (
                <span className="font-mono-tabular">{offlineQueueCount} queued</span>
              )}
            </div>
            <PWAInstallButton variant="dark" className="w-full" />
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar — Strictly Visitor Safe (No Send / Receipt / Return) */}
      <nav
        aria-label="Mobile bottom navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 h-14 grid grid-cols-4 items-center no-print"
      >
        <button
          type="button"
          onClick={() => navTo('home')}
          className={`flex flex-col items-center justify-center h-full text-[10px] font-bold cursor-pointer ${
            currentPage === 'home' ? 'text-[#1d1d1f]' : 'text-[#6b6b70]'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={() => navTo('track')}
          aria-label="Live Track"
          className="flex flex-col items-center justify-center h-full cursor-pointer"
        >
          <span
            className={`px-4 py-1.5 rounded-full inline-flex items-center gap-1.5 text-[11px] font-extrabold shadow-sm ${
              currentPage === 'track'
                ? 'bg-[#1d1d1f] text-[#FFCC00]'
                : 'bg-[#FFCC00] text-[#1d1d1f]'
            }`}
          >
            <ScanLine className="w-4 h-4" />
            <span>Track</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => navTo('business')}
          className={`flex flex-col items-center justify-center h-full text-[10px] font-bold cursor-pointer ${
            currentPage === 'business' ? 'text-[#1d1d1f]' : 'text-[#6b6b70]'
          }`}
        >
          <Briefcase className="w-5 h-5 mb-0.5" />
          <span>Business</span>
        </button>

        <button
          type="button"
          onClick={() => navTo('help')}
          className={`flex flex-col items-center justify-center h-full text-[10px] font-bold cursor-pointer ${
            currentPage === 'help' ? 'text-[#1d1d1f]' : 'text-[#6b6b70]'
          }`}
        >
          <HelpCircle className="w-5 h-5 mb-0.5" />
          <span>Help</span>
        </button>
      </nav>
    </>
  );
};
