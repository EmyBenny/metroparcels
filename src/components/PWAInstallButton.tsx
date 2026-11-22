import React, { useState } from 'react';
import { Download, Share, PlusSquare, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'dark' | 'outline' | 'compact' | 'store-ios' | 'store-android';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'dark',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled && variant !== 'store-ios' && variant !== 'store-android') {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable && variant !== 'store-ios') {
      const accepted = await install();
      if (accepted) return;
    }
    setShowGuide(true);
  };

  const renderTrigger = () => {
    if (variant === 'store-ios') {
      return (
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className={`inline-flex items-center gap-3 px-4 py-2.5 bg-[#1d1d1f] text-white border border-white/20 hover:bg-black transition-colors text-left cursor-pointer whitespace-nowrap shrink-0 ${className}`}
        >
          <Smartphone className="w-5 h-5 text-[#FFCC00] shrink-0" />
          <span className="leading-tight">
            <small className="block text-[10px] uppercase tracking-wider text-neutral-400">Install on</small>
            <span className="text-sm font-bold">iPhone</span>
          </span>
        </button>
      );
    }

    if (variant === 'store-android') {
      return (
        <button
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center gap-3 px-4 py-2.5 bg-[#1d1d1f] text-white border border-white/20 hover:bg-black transition-colors text-left cursor-pointer whitespace-nowrap shrink-0 ${className}`}
        >
          <Download className="w-5 h-5 text-[#FFCC00] shrink-0" />
          <span className="leading-tight">
            <small className="block text-[10px] uppercase tracking-wider text-neutral-400">Install on</small>
            <span className="text-sm font-bold">Android</span>
          </span>
        </button>
      );
    }

    if (variant === 'compact') {
      return (
        <button
          type="button"
          onClick={handleClick}
          aria-label="Install Metro Parcel Service app"
          className={`inline-flex items-center gap-1.5 px-3 py-2 bg-[#1d1d1f] text-[#FFCC00] text-xs font-bold hover:bg-black transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[40px] ${className}`}
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span>Install</span>
        </button>
      );
    }

    if (variant === 'outline') {
      return (
        <button
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center justify-center gap-2 border-2 border-[#1d1d1f] px-5 py-3 text-sm font-bold text-[#1d1d1f] hover:bg-[#1d1d1f] hover:text-[#FFCC00] transition-colors cursor-pointer whitespace-nowrap shrink-0 ${className}`}
        >
          <Download className="w-4 h-4 shrink-0" />
          <span>Install the app</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center justify-center gap-2 bg-[#1d1d1f] text-white px-5 py-3 text-sm font-bold hover:bg-black hover:text-[#FFCC00] transition-colors cursor-pointer whitespace-nowrap shrink-0 ${className}`}
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>Install app</span>
      </button>
    );
  };

  return (
    <>
      {renderTrigger()}

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
        >
          <div className="w-full sm:max-w-md bg-white text-[#1d1d1f] p-6 sm:rounded-2xl rounded-t-3xl border-2 border-[#1d1d1f] shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              aria-label="Close install instructions"
              className="absolute right-4 top-4 w-10 h-10 flex items-center justify-center rounded-full hover:bg-neutral-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 mb-5">
              <img
                src="/pwa-192x192.png"
                alt="Metro Parcel Service icon"
                className="w-14 h-14 rounded-2xl border border-neutral-200 shrink-0"
              />
              <div>
                <h3 id="pwa-install-title" className="text-lg font-extrabold tracking-tight">
                  Install Metro Parcel Service
                </h3>
                <p className="text-xs text-[#6b6b70]">
                  Offline GPS cache · Push geofence alerts · Native launcher
                </p>
              </div>
            </div>

            {isIOS || variant === 'store-ios' ? (
              <ol className="space-y-3 text-sm mb-5">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#FFCC00] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Tap the <strong>Share</strong> button <Share className="inline w-4 h-4 mx-0.5" /> in Safari’s toolbar.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#FFCC00] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare className="inline w-4 h-4 mx-0.5" />.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#FFCC00] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>Tap <strong>Add</strong> to launch Metro Parcel Service offline from your home screen.</span>
                </li>
              </ol>
            ) : (
              <ol className="space-y-3 text-sm mb-5">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#FFCC00] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    <strong>Android (Chrome):</strong> Open the browser menu and tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#FFCC00] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    <strong>iPhone / iPad (Safari):</strong> Tap Share and select <strong>Add to Home Screen</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#FFCC00] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    <strong>Desktop (Chrome / Edge):</strong> Click the install icon in the address bar to run Metro Parcel Service as a standalone app.
                  </span>
                </li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full py-3 bg-[#1d1d1f] text-white font-bold text-sm hover:bg-black hover:text-[#FFCC00] transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
