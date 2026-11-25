import React, { useMemo, useState } from 'react';
import { MessageCircle, Search } from 'lucide-react';
import type { PageRoute, SiteSettings } from '../types';

interface HelpPageProps {
  helpSettings: SiteSettings['help'];
  whatsappNumber?: string;
  onNavigate: (page: PageRoute) => void;
}

export const HelpPage: React.FC<HelpPageProps> = ({
  helpSettings,
  whatsappNumber = '+447447484073',
  onNavigate,
}) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const cleanDigits = whatsappNumber.replace(/[^0-9]/g, '') || '447447484073';

  const categories = useMemo(() => {
    const unique = Array.from(new Set(helpSettings.faqs.map((f) => f.category).filter(Boolean)));
    return ['All', ...unique];
  }, [helpSettings.faqs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return helpSettings.faqs.filter((item) => {
      const catMatch = activeCategory === 'All' || item.category === activeCategory;
      const textMatch =
        !q || item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q);
      return catMatch && textMatch;
    });
  }, [helpSettings.faqs, search, activeCategory]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 pb-24 lg:pb-16 space-y-8">
      <div className="bg-[#9D7110] p-8 border-2 border-[#3C2B02] text-white">
        <span className="text-xs font-extrabold uppercase tracking-widest text-[#F2E9D4]">
          {helpSettings.eyebrow}
        </span>
        <h1 className="font-display text-4xl text-white mt-1">{helpSettings.headline}</h1>
        <div className="relative mt-5 max-w-xl">
          <Search className="w-4 h-4 text-[#6b6b70] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={helpSettings.searchPlaceholder}
            className="w-full bg-white text-[#1d1d1f] border-2 border-[#3C2B02] pl-10 pr-4 py-3 text-sm focus:outline-none"
          />
        </div>
      </div>

      {/* Category Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 text-xs font-extrabold border cursor-pointer ${
              activeCategory === cat
                ? 'bg-[#3C2B02] text-[#CD9E34] border-[#3C2B02]'
                : 'bg-white text-[#1d1d1f] border-neutral-300 hover:border-[#3C2B02]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* FAQ Items */}
      <div className="bg-white border border-neutral-200 divide-y divide-neutral-200">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#6b6b70]">
            No articles matched your query. Try clearing the search filter.
          </div>
        ) : (
          filtered.map((item) => (
            <div key={item.id || item.q} className="p-6">
              <span className="text-xs font-bold text-[#1B6CFF] uppercase tracking-wider">
                {item.category}
              </span>
              <h2 className="font-extrabold text-lg text-[#1d1d1f] mt-1">{item.q}</h2>
              <p className="text-sm text-[#6b6b70] mt-2 leading-relaxed">{item.a}</p>
            </div>
          ))
        )}
      </div>

      {/* Offline & Live Support Guide */}
      <div className="bg-[#3C2B02] text-white p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-[#6D500C]">
        <div>
          <h3 className="font-extrabold text-lg text-[#CD9E34]">{helpSettings.stillStuckTitle}</h3>
          <p className="text-sm text-[#F2E9D4] mt-1">
            {helpSettings.stillStuckSubtitle}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 shrink-0">
          <a
            href={`https://wa.me/${cleanDigits}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-3 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-extrabold text-sm inline-flex items-center gap-2 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp ({whatsappNumber})</span>
          </a>
          <button
            type="button"
            onClick={() => onNavigate('contact')}
            className="px-6 py-3 bg-[#9D7110] hover:bg-[#CD9E34] hover:text-[#1E1501] text-white font-extrabold text-sm transition-colors cursor-pointer"
          >
            Open Live Support Ticket
          </button>
        </div>
      </div>
    </div>
  );
};
