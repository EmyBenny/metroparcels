import React from 'react';
import { Check, Globe, Package, Truck, Zap } from 'lucide-react';
import type { PageRoute } from '../types';

interface ServicesPageProps {
  onNavigate: (page: PageRoute) => void;
}

export const ServicesPage: React.FC<ServicesPageProps> = ({ onNavigate }) => {
  const tiers = [
    {
      price: 'From £3.99',
      title: 'Domestic parcels',
      desc: 'Next-day across the country',
      icon: Package,
      accent: 'bg-[#9D7110] text-white',
      bullets: [
        'Collection from your door or drop-off point',
        'Up to 30 kg per parcel',
        'Live map tracking & push geofence updates',
        'Free cover up to £50.00',
      ],
      action: () => onNavigate('track'),
      cta: 'Track a parcel',
    },
    {
      price: 'From £23.17',
      title: 'International',
      desc: '220+ countries, customs handled',
      icon: Globe,
      accent: 'bg-[#1B6CFF] text-white',
      bullets: [
        'Paperless customs declarations',
        'Duties paid or unpaid options',
        'Hub-by-hub tracking with flight legs',
        'Insurance up to £10,000.00',
      ],
      action: () => onNavigate('track'),
      cta: 'Track a parcel',
    },
    {
      price: 'From £19.99',
      title: 'Same day express',
      desc: 'Door to door in hours',
      icon: Zap,
      accent: 'bg-[#C42BF0] text-white',
      bullets: [
        'Dedicated courier, no stops',
        'Real-time courier GPS location',
        'Call or chat your driver directly',
        'Photo proof of delivery',
      ],
      action: () => onNavigate('track'),
      cta: 'Track a parcel',
    },
    {
      price: 'Enterprise',
      title: 'Freight & pallets',
      desc: 'Heavy and bulky goods',
      icon: Truck,
      accent: 'bg-[#3C2B02] text-[#CD9E34]',
      bullets: [
        'Full and part pallets',
        'Tail-lift vehicles available',
        'Warehouse-to-warehouse routing',
        'Dedicated account manager included',
      ],
      action: () => onNavigate('contact'),
      cta: 'Contact dispatch',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 pb-24 lg:pb-16 space-y-12">
      <div>
        <span className="text-xs font-extrabold uppercase tracking-widest text-[#6b6b70]">
          Home / Services
        </span>
        <h1 className="font-display text-4xl sm:text-5xl text-[#1d1d1f] mt-2 text-balance">
          Metro Parcel Service delivery tiers
        </h1>
        <p className="text-base text-[#6b6b70] mt-2 max-w-xl">
          Every Metro Parcel Service shipment is dispatched and verified by our operations hub with live GPS tracking and stamped receipts.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {tiers.map((tier) => {
          const Icon = tier.icon;
          return (
            <div key={tier.title} className="bg-white border border-neutral-200 p-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-4 mb-5">
                  <span className={`w-12 h-12 rounded-xl flex items-center justify-center ${tier.accent}`}>
                    <Icon className="w-6 h-6" />
                  </span>
                  <span className="font-mono-tabular text-lg font-extrabold text-[#1d1d1f]">
                    {tier.price}
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold text-[#1d1d1f]">{tier.title}</h2>
                <p className="text-sm text-[#6b6b70] mt-1">{tier.desc}</p>
                <ul className="mt-5 space-y-2.5 text-sm text-[#1d1d1f]">
                  {tier.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-[#00C853] shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={tier.action}
                className="mt-7 w-full py-3 bg-[#9D7110] hover:bg-[#3C2B02] text-white font-extrabold text-sm transition-colors cursor-pointer"
              >
                {tier.cta}
              </button>
            </div>
          );
        })}
      </div>

      {/* Service Comparison Table */}
      <div className="bg-white border border-neutral-200 p-6 sm:p-8 overflow-x-auto">
        <h2 className="font-extrabold text-2xl text-[#1d1d1f] mb-6">Compare speeds</h2>
        <table className="w-full text-left border-collapse min-w-[540px] text-sm">
          <thead>
            <tr className="border-b-2 border-[#1d1d1f] text-xs uppercase tracking-wider text-[#6b6b70]">
              <th className="py-3 pr-4">Feature</th>
              <th className="py-3 px-4">Economy</th>
              <th className="py-3 px-4">Standard</th>
              <th className="py-3 px-4">Express</th>
              <th className="py-3 pl-4">Same Day</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            <tr>
              <td className="py-3.5 pr-4 font-bold">Delivery window</td>
              <td className="py-3.5 px-4">3–5 days</td>
              <td className="py-3.5 px-4">2–3 days</td>
              <td className="py-3.5 px-4">Next day</td>
              <td className="py-3.5 pl-4 font-bold text-[#008a39]">Today</td>
            </tr>
            <tr>
              <td className="py-3.5 pr-4 font-bold">Live GPS map & geofencing</td>
              <td className="py-3.5 px-4">Included</td>
              <td className="py-3.5 px-4">Included</td>
              <td className="py-3.5 px-4">Included</td>
              <td className="py-3.5 pl-4">Included</td>
            </tr>
            <tr>
              <td className="py-3.5 pr-4 font-bold">Direct courier call & chat</td>
              <td className="py-3.5 px-4 text-neutral-400">—</td>
              <td className="py-3.5 px-4 text-neutral-400">—</td>
              <td className="py-3.5 px-4 font-bold text-[#1B6CFF]">Included</td>
              <td className="py-3.5 pl-4 font-bold text-[#1B6CFF]">Included</td>
            </tr>
            <tr>
              <td className="py-3.5 pr-4 font-bold">Starting price</td>
              <td className="py-3.5 px-4 font-mono-tabular font-extrabold">£3.99</td>
              <td className="py-3.5 px-4 font-mono-tabular font-extrabold">£5.99</td>
              <td className="py-3.5 px-4 font-mono-tabular font-extrabold">£9.99</td>
              <td className="py-3.5 pl-4 font-mono-tabular font-extrabold">£19.99</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
