import React from 'react';
import { FLEET_VAN_IMG } from '../data/seedData';
import type { PageRoute, SiteSettings } from '../types';

interface AboutPageProps {
  aboutSettings: SiteSettings['about'];
  onNavigate: (page: PageRoute) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ aboutSettings, onNavigate }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 pb-24 lg:pb-16 space-y-12">
      <div className="grid lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-6 space-y-4">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#6b6b70]">
            {aboutSettings.eyebrow}
          </span>
          <h1 className="font-display text-4xl sm:text-5xl text-[#1d1d1f] text-balance">
            {aboutSettings.headline}
          </h1>
          <p className="text-base text-[#6b6b70] leading-relaxed">
            {aboutSettings.intro}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('track')}
              className="px-6 py-3 bg-[#9D7110] text-white font-extrabold text-sm hover:bg-[#3C2B02] transition-colors cursor-pointer"
            >
              See Live Tracking
            </button>
            <button
              type="button"
              onClick={() => onNavigate('contact')}
              className="px-6 py-3 border border-[#1d1d1f] text-[#1d1d1f] font-bold text-sm cursor-pointer"
            >
              Contact our team
            </button>
          </div>
        </div>
        <div className="lg:col-span-6">
          <img
            src={aboutSettings.heroImage || FLEET_VAN_IMG}
            alt="Metro Parcel Service electric delivery van at urban logistics hub"
            referrerPolicy="no-referrer"
            className="w-full h-72 sm:h-88 object-cover border-2 border-[#1d1d1f]"
          />
        </div>
      </div>

      {/* Values */}
      <div className="grid md:grid-cols-3 gap-6">
        {aboutSettings.values.map((v, idx) => (
          <div key={`${v.title}-${idx}`} className="bg-white border border-neutral-200 p-7 border-t-4 border-t-[#9D7110]">
            <h2 className="font-extrabold text-xl text-[#1d1d1f]">{v.title}</h2>
            <p className="text-sm text-[#6b6b70] mt-2 leading-relaxed">{v.desc}</p>
          </div>
        ))}
      </div>

      {/* Our Journey */}
      <div className="bg-[#1E1501] text-white p-8 sm:p-10 border-t-4 border-[#9D7110]">
        <h2 className="font-display text-3xl text-[#CD9E34] mb-6">Our journey</h2>
        <div className="space-y-4">
          {aboutSettings.milestones.map((m, idx) => (
            <div key={`${m.year}-${idx}`} className="flex items-baseline gap-6 pb-4 border-b border-white/10 last:border-0 last:pb-0">
              <span className="font-display text-2xl text-[#CD9E34] tabular-nums shrink-0">{m.year}</span>
              <span className="text-sm sm:text-base text-neutral-200">{m.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
