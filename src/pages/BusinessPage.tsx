import React, { useState } from 'react';
import { Code2, FileSpreadsheet, Globe, Headset, Receipt, RotateCcw } from 'lucide-react';
import type { PageRoute } from '../types';

interface BusinessPageProps {
  onNavigate: (page: PageRoute) => void;
}

export const BusinessPage: React.FC<BusinessPageProps> = ({ onNavigate }) => {
  const [csvPreviewOpen, setCsvPreviewOpen] = useState(false);

  const features = [
    {
      icon: FileSpreadsheet,
      title: 'Bulk labels',
      desc: 'Upload a CSV and print hundreds of labels in one go with auto-armed geofences.',
    },
    {
      icon: Code2,
      title: 'Developer API',
      desc: 'Create shipments and pull live GPS & geofence webhooks straight into your store.',
    },
    {
      icon: Globe,
      title: 'Branded tracking',
      desc: 'Your logo and colours on the live tracking page your customers see.',
    },
    {
      icon: Receipt,
      title: 'Monthly invoicing',
      desc: 'One stamped invoice per month, with every verified receipt attached.',
    },
    {
      icon: RotateCcw,
      title: 'Easy returns',
      desc: 'Pre-paid return labels your customers can scan at any of our 16,000+ drop points.',
    },
    {
      icon: Headset,
      title: 'Account manager',
      desc: 'A real person who knows your business, on call 24/7.',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 pb-24 lg:pb-16 space-y-12">
      {/* Business Hero */}
      <div className="bg-[#1d1d1f] text-white p-8 sm:p-12 grid lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#FFCC00]">
            For business
          </span>
          <h1 className="font-display text-4xl sm:text-5xl mt-2 text-balance">
            Ship at scale. Pay monthly.
          </h1>
          <p className="mt-4 text-sm sm:text-base text-neutral-300 max-w-xl leading-relaxed">
            Bulk labels, API access, branded tracking pages and one consolidated invoice every month.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate('contact')}
              className="px-6 py-3 bg-[#FFCC00] text-[#1d1d1f] font-extrabold text-sm hover:bg-white transition-colors cursor-pointer"
            >
              Open an account
            </button>
            <button
              type="button"
              onClick={() => onNavigate('track')}
              className="px-6 py-3 border border-white/30 text-white font-bold text-sm hover:bg-white hover:text-[#1d1d1f] transition-colors cursor-pointer"
            >
              Track fleet parcels
            </button>
          </div>
        </div>

        {/* Monthly Billing Card */}
        <div className="lg:col-span-5 bg-white text-[#1d1d1f] p-6 border-2 border-[#FFCC00]">
          <div className="text-xs font-bold uppercase tracking-wider text-[#6b6b70]">This month</div>
          <div className="grid grid-cols-2 gap-4 mt-4 pb-4 border-b border-neutral-200">
            <div>
              <div className="font-display text-3xl tabular-nums">2,418</div>
              <div className="text-xs text-[#6b6b70]">parcels shipped</div>
            </div>
            <div>
              <div className="font-display text-3xl text-[#008a39] tabular-nums">99.2%</div>
              <div className="text-xs text-[#6b6b70]">On-time</div>
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-neutral-200 text-sm">
            <span className="text-[#6b6b70]">Saved</span>
            <span className="font-mono-tabular font-extrabold text-[#008a39]">£1,840.00</span>
          </div>
          <div className="flex items-center justify-between pt-3 text-sm">
            <div>
              <span className="font-mono-tabular font-bold block">Invoice #INV-0926</span>
              <span className="text-xs text-[#6b6b70]">Due in 14 days</span>
            </div>
            <span className="font-mono-tabular font-extrabold text-lg">£6,420.50</span>
          </div>
        </div>
      </div>

      {/* 6 Enterprise Features */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="bg-white border border-neutral-200 p-6">
              <div className="w-11 h-11 rounded-xl bg-[#FFCC00] text-[#1d1d1f] flex items-center justify-center mb-4">
                <Icon className="w-5 h-5" />
              </div>
              <h2 className="font-extrabold text-lg text-[#1d1d1f]">{f.title}</h2>
              <p className="text-sm text-[#6b6b70] mt-1.5 leading-relaxed">{f.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Interactive Bulk CSV Batch Simulator */}
      <div className="bg-white border border-neutral-200 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <h3 className="font-extrabold text-xl text-[#1d1d1f]">
            Shipping 100+ parcels a month?
          </h3>
          <p className="text-sm text-[#6b6b70] mt-1">
            Talk to us about volume pricing, or preview our sample CSV bulk manifest importer.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setCsvPreviewOpen((v) => !v)}
            className="px-5 py-3 border-2 border-[#1d1d1f] text-xs font-extrabold cursor-pointer"
          >
            {csvPreviewOpen ? 'Hide CSV Manifest' : 'Preview CSV Bulk Labels'}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('contact')}
            className="px-5 py-3 bg-[#1d1d1f] text-[#FFCC00] text-xs font-extrabold cursor-pointer"
          >
            Contact sales
          </button>
        </div>
      </div>

      {csvPreviewOpen && (
        <div className="bg-white border border-neutral-200 p-6 overflow-x-auto">
          <p className="text-xs font-bold uppercase tracking-wider text-[#6b6b70] mb-3">
            Sample Batch Manifest · batch_oct_london.csv (3 labels generated)
          </p>
          <table className="w-full text-left text-xs font-mono-tabular">
            <thead>
              <tr className="border-b border-neutral-300 text-[#6b6b70]">
                <th className="py-2 pr-4">Tracking</th>
                <th className="py-2 px-4">Recipient</th>
                <th className="py-2 px-4">Destination</th>
                <th className="py-2 px-4">Weight</th>
                <th className="py-2 pl-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              <tr>
                <td className="py-2.5 pr-4 font-bold">TP26B104910</td>
                <td className="py-2.5 px-4">Nordic Studio Ltd</td>
                <td className="py-2.5 px-4">Edinburgh, UK</td>
                <td className="py-2.5 px-4">4.2 kg</td>
                <td className="py-2.5 pl-4 text-[#008a39] font-bold">Label Stamped</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-bold">TP26B104911</td>
                <td className="py-2.5 px-4">Atelier Soho</td>
                <td className="py-2.5 px-4">Bristol, UK</td>
                <td className="py-2.5 px-4">1.8 kg</td>
                <td className="py-2.5 pl-4 text-[#008a39] font-bold">Label Stamped</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-bold">TP26B104912</td>
                <td className="py-2.5 px-4">Kensington Gallery</td>
                <td className="py-2.5 px-4">Paris, FR</td>
                <td className="py-2.5 px-4">7.5 kg</td>
                <td className="py-2.5 pl-4 text-[#008a39] font-bold">Customs Cleared</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
