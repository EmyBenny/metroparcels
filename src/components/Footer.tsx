import React from 'react';
import type { PageRoute, SiteSettings } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface FooterProps {
  contactSettings: SiteSettings['contact'];
  onNavigate: (page: PageRoute) => void;
}

export const Footer: React.FC<FooterProps> = ({ contactSettings, onNavigate }) => {
  const whatsappRaw = contactSettings.whatsapp || '+447447484073';
  const whatsappDigits = whatsappRaw.replace(/[^0-9]/g, '') || '447447484073';

  return (
    <footer className="bg-[#1E1501] text-white pt-16 pb-24 lg:pb-12 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-8 pb-12 border-b border-white/10">
          <div className="col-span-2">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="inline-flex items-center gap-2.5 text-white font-extrabold text-xl tracking-tight cursor-pointer"
            >
              <span className="w-9 h-9 rounded-lg bg-[#9D7110] text-white flex items-center justify-center font-display text-lg">
                M
              </span>
              <span>Metro Parcel Service</span>
            </button>
            <p className="mt-4 text-sm text-neutral-300 max-w-xs leading-relaxed">
              Delivery, tracked to the metre. Track parcels, view stamped digital receipts, and follow live GPS geofence alerts — even offline.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#CD9E34] mb-4">
              Tracking & Fleet
            </h4>
            <ul className="space-y-2.5 text-sm text-neutral-300">
              <li>
                <button type="button" onClick={() => onNavigate('track')} className="hover:text-[#CD9E34] cursor-pointer">
                  Track a parcel
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('analytics')} className="hover:text-[#CD9E34] cursor-pointer">
                  Route playback
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('services')} className="hover:text-[#CD9E34] cursor-pointer">
                  Delivery services
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#CD9E34] mb-4">
              Company
            </h4>
            <ul className="space-y-2.5 text-sm text-neutral-300">
              <li>
                <button type="button" onClick={() => onNavigate('about')} className="hover:text-[#CD9E34] cursor-pointer">
                  About us
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('business')} className="hover:text-[#CD9E34] cursor-pointer">
                  Business
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('contact')} className="hover:text-[#CD9E34] cursor-pointer">
                  Contact
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('help')} className="hover:text-[#CD9E34] cursor-pointer">
                  Help centre
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#CD9E34] mb-4">
              Get in touch
            </h4>
            <p className="text-xs text-neutral-300 leading-relaxed mb-2">
              {contactSettings.address}
            </p>
            <p className="text-xs text-neutral-300 font-mono-tabular mb-1">{contactSettings.phone}</p>
            <p className="text-xs text-neutral-300 mb-2">{contactSettings.email}</p>
            <a
              href={`https://wa.me/${whatsappDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#25D366] hover:text-[#CD9E34] transition-colors font-mono-tabular"
            >
              <span>WhatsApp Live Chat: {whatsappRaw}</span>
            </a>
          </div>
        </div>

        {/* Get the Metro Parcel Service App Bar */}
        <div className="my-8 p-5 sm:p-6 bg-[#2b2b2e] flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <img
            src="/pwa-192x192.png"
            alt="Metro Parcel Service App"
            className="w-14 h-14 rounded-2xl shrink-0"
          />
          <div className="flex-1">
            <p className="font-extrabold text-base text-white">Get the Metro Parcel Service app</p>
            <p className="text-sm text-neutral-300">
              Live tracking, geofence alerts, parcel receipts and offline cache on your home screen.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <PWAInstallButton variant="store-ios" />
            <PWAInstallButton variant="store-android" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400">
          <span>© 2026 Metro Parcel Service. All rights reserved.</span>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => onNavigate('help')} className="hover:text-white cursor-pointer">
              Privacy
            </button>
            <span aria-hidden="true">·</span>
            <button type="button" onClick={() => onNavigate('help')} className="hover:text-white cursor-pointer">
              Terms
            </button>
            <span aria-hidden="true">·</span>
            <button type="button" onClick={() => onNavigate('help')} className="hover:text-white cursor-pointer">
              Cookies
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
