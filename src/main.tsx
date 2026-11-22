import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Google Maps Platform Tier 1 Quota & Auth Error Handling
(window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
  window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
};

const origConsoleError = console.error;
console.error = (...args: unknown[]) => {
  origConsoleError.apply(console, args);
  const msg = args.map((a) => String(a)).join(' ');
  if (msg.includes('OverQuotaMapError') || msg.includes('QuotaExceededError')) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  } else if (
    msg.includes('Unable to fetch configuration for mapId') ||
    msg.includes('without a valid Map ID')
  ) {
    window.dispatchEvent(new CustomEvent('gmp-map-config-unavailable'));
  }
};

// Register PWA Service Worker for offline mode & asset precaching
registerSW({
  immediate: true,
  onOfflineReady() {
    window.dispatchEvent(new CustomEvent('metro-parcel-offline-ready'));
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
