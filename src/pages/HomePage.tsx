import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  LineChart,
  MapPin,
  QrCode,
  Search,
  ShieldCheck,
  Star,
  Truck,
} from 'lucide-react';
import { FAQ_ITEMS, REVIEWS } from '../data/seedData';
import type { FaqItem, PageRoute, Shipment } from '../types';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { HomeMediaShowcase } from '../components/HomeMediaShowcase';

import heroCargoFlightImg from '../assets/images/hero_cargo_flight_1795524833013.jpg';
import heroParcelWarehouseImg from '../assets/images/hero_parcel_warehouse_1795524832212.jpg';
import heroHubFleetImg from '../assets/images/golden_courier_hub_fleet_1795375426253.jpg';
import heroParcelsImg from '../assets/images/golden_courier_parcels_1795375425863.jpg';
import heroFleetVanImg from '../assets/images/trackpro_fleet_van_1795252246008.jpg';

interface HomePageProps {
  shipments: Shipment[];
  faqs?: FaqItem[];
  onNavigate: (page: PageRoute) => void;
  onTrackShipment: (trackingNo: string) => void;
}

const HERO_SLIDES = [
  {
    line1: 'Track it',
    band: 'live',
    bandColor: 'bg-[#C42BF0]',
    line3: 'on the map',
    copy: 'Watch your parcel move street by street with Metro Parcel Service. Real-time GPS, geofence alerts, and stamped parcel receipts in your pocket.',
  },
  {
    line1: 'Every detail',
    band: 'inside track',
    bandColor: 'bg-[#FF1FBF]',
    line3: 'one search',
    copy: 'Enter your tracking number to view live GPS movement, dispatch manifests, verified QR receipts, and return options — even offline.',
  },
  {
    line1: 'Global door',
    band: 'to door',
    bandColor: 'bg-[#1B6CFF]',
    line3: '220+ nations',
    copy: 'Customs handled for you, live flight & hub telemetry, and a courier you can call straight from the app.',
  },
];

const HERO_BACKDROP_SCENES = [
  {
    id: 'cargo-flight',
    src: heroCargoFlightImg,
    anim: 'animate-tp-backdrop-a',
    pos: 'object-center',
  },
  {
    id: 'parcel-warehouse',
    src: heroParcelWarehouseImg,
    anim: 'animate-tp-backdrop-b',
    pos: 'object-center',
  },
  {
    id: 'hub-fleet',
    src: heroHubFleetImg,
    anim: 'animate-tp-backdrop-a',
    pos: 'object-center',
  },
  {
    id: 'priority-parcels',
    src: heroParcelsImg,
    anim: 'animate-tp-backdrop-b',
    pos: 'object-center',
  },
  {
    id: 'fleet-van',
    src: heroFleetVanImg,
    anim: 'animate-tp-backdrop-a',
    pos: 'object-center',
  },
];

export const HomePage: React.FC<HomePageProps> = ({
  faqs,
  onNavigate,
  onTrackShipment,
}) => {
  const [slideIdx, setSlideIdx] = useState(0);
  const [backdrop, setBackdrop] = useState({ idx: 0, prev: 0 });
  const [trackInput, setTrackInput] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIdx((i) => (i + 1) % HERO_SLIDES.length);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    HERO_BACKDROP_SCENES.forEach((scene) => {
      const img = new Image();
      img.referrerPolicy = 'no-referrer';
      img.src = scene.src;
    });
    const backdropTimer = setInterval(() => {
      setBackdrop((b) => ({
        idx: (b.idx + 1) % HERO_BACKDROP_SCENES.length,
        prev: b.idx,
      }));
    }, 5200);
    return () => clearInterval(backdropTimer);
  }, []);

  const slide = HERO_SLIDES[slideIdx];

  return (
    <div>
      {/* HERO SECTION */}
      <section className="bg-[#FFCC00] pt-10 pb-16 lg:pt-14 lg:pb-24 relative overflow-hidden">
        {/* Moving Faded Logistics Backdrop (Flights, Cargo Hubs, Fleet & Parcels) */}
        <div
          aria-hidden="true"
          className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0"
        >
          {HERO_BACKDROP_SCENES.map((scene, idx) => {
            const isCurrent = idx === backdrop.idx;
            const isPrevious = idx === backdrop.prev && backdrop.prev !== backdrop.idx;
            return (
              <div
                key={scene.id}
                style={{
                  opacity: isCurrent || isPrevious ? 1 : 0,
                  zIndex: isCurrent ? 2 : isPrevious ? 1 : 0,
                }}
                className="absolute inset-0 transition-opacity duration-1000 ease-in-out will-change-[opacity]"
              >
                <img
                  src={scene.src}
                  alt=""
                  loading="eager"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className={`w-full h-full object-cover ${scene.pos} saturate-[0.9] contrast-115 opacity-[0.66] sm:opacity-[0.70] ${scene.anim}`}
                />
              </div>
            );
          })}
          <div className="absolute inset-0 z-[3] bg-gradient-to-b from-[#FFCC00]/26 via-[#FFCC00]/8 to-[#FFCC00]/22 lg:bg-gradient-to-r lg:from-[#FFCC00]/40 lg:via-[#FFCC00]/14 lg:to-[#FFCC00]/4" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <h1 className="font-display uppercase text-[#1d1d1f] text-5xl sm:text-6xl lg:text-7xl leading-[0.88] tracking-tight text-balance [text-shadow:0_2px_18px_rgba(255,204,0,0.98),0_1px_4px_rgba(255,204,0,0.95)]">
                <span className="block">{slide.line1}</span>
                <span
                  className={`inline-block ${slide.bandColor} text-white px-3 py-1 my-2 -rotate-1`}
                >
                  {slide.band}
                </span>
                <span className="block">{slide.line3}</span>
              </h1>
              <p className="mt-5 text-base sm:text-xl text-[#1d1d1f] max-w-xl font-bold leading-relaxed [text-shadow:0_1px_14px_rgba(255,204,0,0.98),0_1px_4px_rgba(255,204,0,0.95)]">
                {slide.copy}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('track')}
                  className="px-6 py-3.5 bg-[#1d1d1f] text-white font-bold text-sm hover:bg-black hover:text-[#FFCC00] transition-colors cursor-pointer"
                >
                  Open Live GPS Map
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('analytics')}
                  className="px-6 py-3.5 bg-[#FFCC00]/92 backdrop-blur-[2px] border-2 border-[#1d1d1f] text-[#1d1d1f] font-bold text-sm hover:bg-[#1d1d1f] hover:text-[#FFCC00] transition-colors cursor-pointer"
                >
                  Route Playback & Analytics
                </button>
              </div>

              {/* Hero Slider Pagination */}
              <div className="flex items-center gap-2 mt-7" role="tablist" aria-label="Hero slides">
                {HERO_SLIDES.map((s, idx) => (
                  <button
                    key={s.band}
                    type="button"
                    aria-label={`Slide ${idx + 1}`}
                    onClick={() => setSlideIdx(idx)}
                    className={`h-1.5 transition-all cursor-pointer ${
                      idx === slideIdx
                        ? 'w-14 bg-[#1d1d1f]'
                        : 'w-8 bg-[#1d1d1f]/25 hover:bg-[#1d1d1f]/50'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Dedicated Parcel Tracking Widget */}
            <div className="lg:col-span-5">
              <div className="bg-white shadow-2xl border-2 border-[#1d1d1f]">
                <div className="bg-[#1d1d1f] text-[#FFCC00] px-6 py-4 flex items-center justify-between">
                  <span className="font-extrabold text-sm uppercase tracking-wider">
                    Metro Parcel Service Tracker
                  </span>
                  <span className="text-[11px] font-mono-tabular text-neutral-300">
                    GPS + Receipt + Return
                  </span>
                </div>

                <div className="p-6">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (trackInput.trim()) onTrackShipment(trackInput.trim());
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label
                        htmlFor="home-track-input"
                        className="block text-xs font-bold uppercase tracking-wider text-[#6b6b70] mb-1.5"
                      >
                        Enter your tracking or receipt number
                      </label>
                      <div className="relative">
                        <Search className="w-4 h-4 text-[#6b6b70] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          id="home-track-input"
                          type="text"
                          value={trackInput}
                          onChange={(e) => setTrackInput(e.target.value)}
                          placeholder="Enter your tracking or receipt code"
                          className="w-full border-2 border-neutral-300 pl-10 pr-4 py-3 font-mono-tabular text-sm focus:outline-none focus:border-[#1d1d1f]"
                        />
                      </div>
                    </div>

                    <p className="text-xs text-[#6b6b70] leading-relaxed">
                      View live courier GPS coordinates, dispatch details, stamped digital receipt, and return eligibility exclusively for your entered tracking code.
                    </p>

                    <button
                      type="submit"
                      className="w-full py-3.5 bg-[#FFCC00] hover:bg-[#1d1d1f] hover:text-[#FFCC00] text-[#1d1d1f] font-extrabold text-sm transition-colors cursor-pointer"
                    >
                      Track your parcel
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE STRIP */}
      <div className="bg-[#1d1d1f] text-[#FFCC00] py-4 overflow-hidden select-none">
        <div className="animate-tp-marquee font-display uppercase text-lg tracking-wide">
          {[0, 1].map((dup) => (
            <div key={dup} className="inline-flex items-center">
              <span className="mx-6">Metro Parcel Service Live GPS</span>
              <span className="text-white">·</span>
              <span className="mx-6">Geofencing arrival alerts</span>
              <span className="text-white">·</span>
              <span className="mx-6">Stamped parcel receipts</span>
              <span className="text-white">·</span>
              <span className="mx-6">220+ countries</span>
              <span className="text-white">·</span>
              <span className="mx-6">Historical route playback</span>
              <span className="text-white">·</span>
              <span className="mx-6">Offline mode ready</span>
              <span className="text-white">·</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3 LINK CARDS */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid md:grid-cols-3 gap-6">
          <button
            type="button"
            onClick={() => onNavigate('track')}
            className="bg-white p-8 text-left border-2 border-transparent hover:border-[#1d1d1f] hover:shadow-[8px_8px_0_#1d1d1f] transition-all cursor-pointer group"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#1B6CFF] text-white flex items-center justify-center mb-5">
              <MapPin className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-extrabold text-[#1d1d1f] flex items-center justify-between">
              <span>Live GPS Track</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </h2>
            <p className="mt-2 text-sm text-[#6b6b70]">
              Follow live driver location, arrival alerts, stamped receipts, and return details for your parcel.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('analytics')}
            className="bg-white p-8 text-left border-2 border-transparent hover:border-[#1d1d1f] hover:shadow-[8px_8px_0_#1d1d1f] transition-all cursor-pointer group"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#FFCC00] text-[#1d1d1f] flex items-center justify-center mb-5">
              <LineChart className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-extrabold text-[#1d1d1f] flex items-center justify-between">
              <span>Route Playback</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </h2>
            <p className="mt-2 text-sm text-[#6b6b70]">
              Replay historical GPS breadcrumbs and monitor corridor SLA telemetry across every route.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('help')}
            className="bg-white p-8 text-left border-2 border-transparent hover:border-[#1d1d1f] hover:shadow-[8px_8px_0_#1d1d1f] transition-all cursor-pointer group"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#00C853] text-white flex items-center justify-center mb-5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-extrabold text-[#1d1d1f] flex items-center justify-between">
              <span>Help & Support</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </h2>
            <p className="mt-2 text-sm text-[#6b6b70]">
              Answers on live tracking, offline caching, parcel receipts, and return drop-point policies.
            </p>
          </button>
        </div>
      </section>

      {/* INTERACTIVE VIDEO REEL, PARCELS/COURIERS/PEOPLE GALLERY & ENGAGEMENTS */}
      <HomeMediaShowcase onNavigate={onNavigate} />

      {/* THE METRO PARCEL SERVICE APP SHOWCASE */}
      <section className="py-16 bg-white border-y border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#1B6CFF]">
              The Metro Parcel Service App
            </span>
            <h2 className="font-display text-3xl sm:text-5xl text-[#1d1d1f] leading-tight text-balance">
              Your parcels. Like your bank app.
            </h2>
            <p className="text-base text-[#6b6b70] leading-relaxed max-w-xl">
              Everything you’d expect from a modern fintech app – built for Metro Parcel Service deliveries. Live balances become live locations, complete with offline caching and push geofence alerts.
            </p>

            <ul className="space-y-5 pt-2">
              <li className="flex gap-4">
                <span className="w-12 h-12 rounded-xl bg-[#1d1d1f] text-[#FFCC00] flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-base">Live map movement & geofences</h3>
                  <p className="text-sm text-[#6b6b70]">
                    See your courier glide across the map with refreshed GPS points and arrival / route deviation push alerts.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="w-12 h-12 rounded-xl bg-[#1d1d1f] text-[#FFCC00] flex items-center justify-center shrink-0">
                  <QrCode className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-base">Stamped digital parcel receipts</h3>
                  <p className="text-sm text-[#6b6b70]">
                    Every tracked shipment includes a verified, printable Metro Parcel Service receipt with QR verification code.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="w-12 h-12 rounded-xl bg-[#1d1d1f] text-[#FFCC00] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-base">Insured up to £10,000</h3>
                  <p className="text-sm text-[#6b6b70]">
                    Full parcel protection verified by Metro Parcel Service ops, with offline access to receipts and route history.
                  </p>
                </div>
              </li>
            </ul>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('track')}
                className="px-6 py-3 bg-[#FFCC00] text-[#1d1d1f] font-extrabold text-sm hover:bg-[#1d1d1f] hover:text-[#FFCC00] transition-colors cursor-pointer"
              >
                Track a parcel
              </button>
              <PWAInstallButton variant="dark" />
            </div>
          </div>

          {/* Interactive Fintech Phone Preview */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-[330px] rounded-[42px] bg-[#111] p-3 shadow-2xl animate-tp-float">
              <div className="rounded-[32px] bg-[#1B6CFF] text-white p-5 pt-8">
                <div className="flex items-center justify-between text-xs font-bold opacity-90">
                  <span>Metro Parcel Service Live</span>
                  <span className="font-mono-tabular">GPS + Geofence</span>
                </div>

                {/* Progress Ring */}
                <div className="my-5 flex flex-col items-center">
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" stroke="rgba(255,255,255,0.22)" strokeWidth="10" fill="none" />
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        stroke="#C6F432"
                        strokeWidth="10"
                        strokeLinecap="round"
                        fill="none"
                        strokeDasharray={314}
                        strokeDashoffset={314 - (314 * 72) / 100}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="font-display text-3xl tabular-nums">72%</span>
                      <span className="text-[11px] font-bold text-[#C6F432]">In Transit</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/15 rounded-2xl p-3.5 text-xs space-y-1 mb-3">
                  <div className="flex justify-between font-bold">
                    <span>Origin Hub</span>
                    <span>→</span>
                    <span>Destination</span>
                  </div>
                  <p className="text-white/80">Live corridor telemetry & push geofences armed</p>
                </div>

                <div className="space-y-2">
                  {[
                    { title: 'GPS Telemetry', sub: 'Real-time corridor lock', status: 'Live' },
                    { title: 'Digital Receipt', sub: 'QR & VAT breakdown included', status: 'Verified' },
                    { title: 'Offline Cache', sub: 'Available in low-signal areas', status: 'Ready' },
                  ].map((item) => (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => onNavigate('track')}
                      className="w-full text-left bg-[#1d1d1f] hover:bg-black text-white rounded-xl p-3 flex items-center justify-between text-xs transition-colors cursor-pointer"
                    >
                      <div>
                        <span className="font-bold block">{item.title}</span>
                        <span className="text-neutral-400">{item.sub}</span>
                      </div>
                      <span className="font-bold text-[#C6F432]">{item.status}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-10">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#6b6b70]">How it works</span>
          <h2 className="font-display text-3xl sm:text-4xl text-[#1d1d1f] mt-1">Four steps to delivered</h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            ['01', 'Admin dispatch', 'Metro Parcel Service operations creates your shipment, stamps your receipt, and arms route geofences.'],
            ['02', 'Receive tracking ID', 'Get your tracking code with verified dispatch and courier telemetry details.'],
            ['03', 'Track live on GPS', 'Follow every hop on the live map with arrival & deviation push notifications.'],
            ['04', 'Receipt & delivery', 'Access your stamped digital receipt, proof photo, and return details right on your tracking page.'],
          ].map(([num, title, desc]) => (
            <div key={num} className="bg-white p-7 border-t-4 border-[#FFCC00] relative">
              <span className="font-display text-5xl text-[#FFE68A] absolute right-5 top-4 select-none">
                {num}
              </span>
              <h3 className="font-extrabold text-lg text-[#1d1d1f] mt-8">{title}</h3>
              <p className="mt-2 text-sm text-[#6b6b70] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* KPI STATS BAND */}
      <section className="bg-[#1d1d1f] text-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 lg:grid-cols-5 gap-8 text-center lg:text-left">
          {[
            ['1,280,001', 'Parcels delivered'],
            ['16,000+', 'Drop-off points'],
            ['220', 'Countries served'],
            ['99.4%', 'On-time delivery'],
            ['4.9★', 'App rating'],
          ].map(([val, label]) => (
            <div key={label}>
              <div className="font-display text-3xl sm:text-4xl text-[#FFCC00] tabular-nums">{val}</div>
              <div className="mt-1.5 text-xs sm:text-sm text-neutral-300 font-medium">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* BUSINESS PROMO BANNER */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-[#1d1d1f] text-white p-8 sm:p-12 grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#FFCC00]">
              Metro Parcel Service for Business
            </span>
            <h2 className="font-display text-3xl sm:text-4xl mt-2 text-balance">
              Managing fleet volume?
            </h2>
            <p className="mt-3 text-neutral-300 max-w-xl text-sm sm:text-base">
              Partner with Metro Parcel Service for bulk CSV dispatch, REST API webhooks, branded live tracking, and consolidated monthly invoicing.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onNavigate('business')}
                className="px-6 py-3 bg-[#FFCC00] text-[#1d1d1f] font-extrabold text-sm hover:bg-white transition-colors cursor-pointer"
              >
                Take me there
              </button>
              <button
                type="button"
                onClick={() => onNavigate('analytics')}
                className="px-6 py-3 border border-white/30 text-white font-bold text-sm hover:bg-white hover:text-[#1d1d1f] transition-colors cursor-pointer"
              >
                Explore Fleet Analytics
              </button>
            </div>
          </div>
          <div className="lg:col-span-4 grid grid-cols-2 gap-3 text-center">
            <div className="bg-[#2b2b2e] p-4">
              <div className="font-display text-2xl text-[#FFCC00] tabular-nums">2,418</div>
              <div className="text-xs text-neutral-300 mt-1">Monthly parcels</div>
            </div>
            <div className="bg-[#2b2b2e] p-4">
              <div className="font-display text-2xl text-[#00C853] tabular-nums">99.2%</div>
              <div className="text-xs text-neutral-300 mt-1">On-time SLA</div>
            </div>
            <div className="bg-[#2b2b2e] p-4 col-span-2">
              <div className="font-display text-2xl text-white tabular-nums">£1,840.00</div>
              <div className="text-xs text-neutral-300 mt-1">Saved vs standard rates</div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl text-[#1d1d1f]">Loved by recipients</h2>
            <p className="text-sm text-[#6b6b70] mt-1">4.9 average from 38,000+ reviews</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {REVIEWS.map((r) => (
            <div key={r.name} className="bg-white p-6 border border-neutral-200 flex flex-col justify-between">
              <div>
                <div className="flex gap-1 text-[#FFCC00] mb-3" aria-label="5 stars">
                  {[0, 1, 2, 3, 4].map((s) => (
                    <Star key={s} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm text-[#1d1d1f] leading-relaxed">{r.quote}</p>
              </div>
              <div className="flex items-center gap-3 mt-5 pt-4 border-t border-neutral-100">
                <span
                  className="w-9 h-9 rounded-full text-white font-extrabold text-sm flex items-center justify-center shrink-0"
                  style={{ backgroundColor: r.color }}
                >
                  {r.initial}
                </span>
                <div>
                  <div className="text-sm font-bold text-[#1d1d1f]">{r.name}</div>
                  <div className="text-xs text-[#6b6b70]">{r.city}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* LATEST GUIDES / BLOG */}
      <section className="py-16 bg-white border-t border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl text-[#1d1d1f]">The latest from us</h2>
            <p className="text-sm text-[#6b6b70] mt-1">Updates, tips & parcel shortcuts</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'Save your faves',
                desc: 'Your delivery, your rules. Set a go-to drop point, a safe place and a trusted neighbour.',
                cta: 'Power back to you',
                image: '/src/assets/images/golden_courier_driver_1795375426210.jpg',
                alt: 'Metro Parcel Service driver delivering parcel to customer doorstep',
              },
              {
                title: 'There’s no place like out-of-home',
                desc: 'Make deliveries work around your life with 24/7 pickup points and smart lockers.',
                cta: 'Explore drop points',
                image: '/src/assets/images/golden_courier_locker_1795375425922.jpg',
                alt: 'Customer collecting parcel at 24/7 Metro Parcel Service smart locker',
              },
              {
                title: '9 Metro Parcel Service tricks worth knowing',
                desc: 'Discover offline map caching, geofence alerts, and route playback shortcuts power users swear by.',
                cta: 'Open Help Centre',
                image: '/src/assets/images/golden_courier_parcels_1795375425863.jpg',
                alt: 'Metro Parcel Service sealed priority parcels ready for dispatch',
              },
            ].map((post) => (
              <button
                key={post.title}
                type="button"
                onClick={() => onNavigate('help')}
                className="bg-[#f2f2f2] text-left flex flex-col border border-neutral-200 hover:border-[#1d1d1f] transition-colors cursor-pointer group overflow-hidden"
              >
                <div className="h-48 w-full overflow-hidden bg-[#1d1d1f]">
                  <img
                    src={post.image}
                    alt={post.alt}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="font-extrabold text-xl text-[#1d1d1f]">{post.title}</h3>
                  <p className="mt-2 text-sm text-[#6b6b70] leading-relaxed">{post.desc}</p>
                  <span className="mt-5 pt-4 text-sm font-extrabold text-[#1d1d1f] inline-flex items-center gap-2">
                    {post.cta}
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-white p-6 sm:p-10 border border-neutral-200 grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5">
            <h2 className="font-display text-3xl text-[#1d1d1f] text-balance">
              Got questions? We’ve got answers.
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('help')}
              className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-[#1d1d1f] hover:underline cursor-pointer"
            >
              <span>View our help page</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="lg:col-span-7 divide-y divide-neutral-200">
            {(faqs && faqs.length > 0 ? faqs : FAQ_ITEMS).slice(0, 4).map((item, idx) => (
              <div key={item.q} className="py-4 first:pt-0 last:pb-0">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full text-left flex items-center justify-between gap-4 font-extrabold text-base text-[#1d1d1f] cursor-pointer"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 shrink-0 transition-transform ${
                      openFaq === idx ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <p className="mt-2.5 text-sm text-[#6b6b70] leading-relaxed">{item.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* READY TO TRACK CTA */}
      <section className="bg-[#FFCC00] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <h2 className="font-display uppercase text-3xl sm:text-5xl text-[#1d1d1f]">
            Ready to track?
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate('track')}
              className="px-6 py-3.5 bg-[#1d1d1f] text-white font-extrabold text-sm hover:bg-black hover:text-[#FFCC00] transition-colors cursor-pointer"
            >
              Track a parcel
            </button>
            <button
              type="button"
              onClick={() => onNavigate('contact')}
              className="px-6 py-3.5 border-2 border-[#1d1d1f] text-[#1d1d1f] font-extrabold text-sm hover:bg-[#1d1d1f] hover:text-[#FFCC00] transition-colors cursor-pointer"
            >
              Contact support
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
