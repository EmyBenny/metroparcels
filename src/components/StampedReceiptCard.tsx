import React from 'react';
import { Printer } from 'lucide-react';
import { DEFAULT_SITE_SETTINGS } from '../data/seedData';
import type { Shipment, SiteSettings } from '../types';

interface StampedReceiptCardProps {
  shipment: Shipment;
  showPrintButton?: boolean;
  contactSettings?: SiteSettings['contact'];
}

export const StampedReceiptCard: React.FC<StampedReceiptCardProps> = ({
  shipment,
  showPrintButton = true,
  contactSettings = DEFAULT_SITE_SETTINGS.contact,
}) => {
  return (
    <div className="bg-white border-2 border-[#1d1d1f] p-6 sm:p-8 shadow-xl print-sheet relative overflow-hidden">
      {/* Diagonal Stamp */}
      <div
        className={`inline-block sm:absolute sm:right-6 sm:top-24 border-4 px-3.5 py-1 font-display uppercase tracking-widest text-xs sm:text-sm sm:rotate-[-8deg] mb-4 sm:mb-0 ${
          shipment.payment.state === 'Paid'
            ? 'border-[#00C853] text-[#008a39]'
            : 'border-[#FF5A1F] text-[#FF5A1F]'
        }`}
      >
        METRO PARCEL SERVICE · {shipment.payment.state.toUpperCase()}
      </div>

      {/* Invoice Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 pb-5 border-b border-neutral-200">
        <div>
          <div className="font-extrabold text-xl text-[#1d1d1f]">Metro Parcel Service</div>
          <p className="text-xs text-[#6b6b70] mt-1">
            {contactSettings.address}
          </p>
          <p className="text-xs text-[#6b6b70] font-mono-tabular mt-0.5">
            {contactSettings.phone} · {contactSettings.email} · VAT: GB 284 5521 09
          </p>
        </div>
        <div className="sm:text-right">
          <div className="text-xs font-extrabold uppercase tracking-widest text-[#6b6b70]">
            Official Receipt
          </div>
          <div className="font-mono-tabular font-extrabold text-lg text-[#1d1d1f]">
            {shipment.receipt_no}
          </div>
          <div className="text-xs text-[#6b6b70] mt-0.5">Issued {shipment.payment.issuedAt}</div>
        </div>
      </div>

      {/* Parties */}
      <div className="grid sm:grid-cols-2 gap-5 py-5 border-b border-neutral-200 text-xs">
        <div>
          <span className="text-[#6b6b70] font-bold uppercase tracking-wider block mb-1">
            Billed to (sender)
          </span>
          <p className="font-extrabold text-sm text-[#1d1d1f]">{shipment.sender.name}</p>
          <p className="text-[#6b6b70] mt-0.5">{shipment.sender.address}</p>
          <p className="text-[#6b6b70]">
            {shipment.sender.email || 'sender@metroparcel.demo'} ·{' '}
            {shipment.sender.phone || '+44 7700 900123'}
          </p>
        </div>
        <div>
          <span className="text-[#6b6b70] font-bold uppercase tracking-wider block mb-1">
            Deliver to
          </span>
          <p className="font-extrabold text-sm text-[#1d1d1f]">{shipment.receiver.name}</p>
          <p className="text-[#6b6b70] mt-0.5">{shipment.receiver.address}</p>
          <p className="text-[#6b6b70]">{shipment.receiver.phone || '+44 7700 900456'}</p>
        </div>
      </div>

      {/* Shipment Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-neutral-200 text-xs">
        <div>
          <span className="text-[#6b6b70] block">Tracking no.</span>
          <span className="font-mono-tabular font-bold">{shipment.tracking_no}</span>
        </div>
        <div>
          <span className="text-[#6b6b70] block">Route</span>
          <span className="font-bold">
            {shipment.origin.city.split(',')[0]} → {shipment.dest.city.split(',')[0]}
          </span>
        </div>
        <div>
          <span className="text-[#6b6b70] block">Service</span>
          <span className="font-bold">{shipment.service}</span>
        </div>
        <div>
          <span className="text-[#6b6b70] block">Status</span>
          <span className="font-bold">{shipment.status}</span>
        </div>
      </div>

      {/* Line Items */}
      <table className="w-full text-left border-collapse my-5 text-xs sm:text-sm">
        <thead>
          <tr className="border-b border-[#1d1d1f] text-[#6b6b70] text-xs uppercase">
            <th className="py-2">Description</th>
            <th className="py-2 text-center">Qty</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          <tr>
            <td className="py-2.5">
              <strong className="block">{shipment.service} shipping</strong>
              <span className="text-xs text-[#6b6b70]">
                {shipment.package} · {shipment.weight.toFixed(2)} kg · {shipment.dimensionsCm}
              </span>
            </td>
            <td className="py-2.5 text-center font-mono-tabular">{shipment.pieces}</td>
            <td className="py-2.5 text-right font-mono-tabular font-bold">
              {shipment.payment.shippingFee}
            </td>
          </tr>
          <tr>
            <td className="py-2.5">Parcel protection / insurance</td>
            <td className="py-2.5 text-center font-mono-tabular">1</td>
            <td className="py-2.5 text-right font-mono-tabular font-bold">
              {shipment.payment.insuranceFee}
            </td>
          </tr>
          <tr>
            <td className="py-2.5">VAT / duties</td>
            <td className="py-2.5 text-center">—</td>
            <td className="py-2.5 text-right font-mono-tabular font-bold">
              {shipment.payment.vatFee}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Totals & QR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 pt-4 border-t border-neutral-200">
        <div className="flex items-center gap-3">
          <svg
            viewBox="0 0 64 64"
            className="w-16 h-16 border border-[#1d1d1f] p-1 bg-white shrink-0"
            aria-label="Receipt QR Code"
          >
            <rect x="2" y="2" width="18" height="18" fill="none" stroke="#1d1d1f" strokeWidth="4" />
            <rect x="8" y="8" width="6" height="6" fill="#1d1d1f" />
            <rect x="44" y="2" width="18" height="18" fill="none" stroke="#1d1d1f" strokeWidth="4" />
            <rect x="50" y="8" width="6" height="6" fill="#1d1d1f" />
            <rect x="2" y="44" width="18" height="18" fill="none" stroke="#1d1d1f" strokeWidth="4" />
            <rect x="8" y="50" width="6" height="6" fill="#1d1d1f" />
            <path
              d="M26 6h6v6h-6zM26 18h12v6H26zM34 30h12v6H34zM26 44h10v6H26zM44 44h16v6H44zM44 54h8v8h-8zM30 56h10v6H30z"
              fill="#1d1d1f"
            />
          </svg>
          <div className="text-[11px] text-[#6b6b70] max-w-[220px]">
            Scan the QR code to verify this stamped Metro Parcel Service receipt for parcel{' '}
            <strong className="font-mono-tabular text-[#1d1d1f]">{shipment.tracking_no}</strong>.
          </div>
        </div>

        <div className="w-full sm:w-64 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-[#6b6b70]">Total due</span>
            <span className="font-mono-tabular font-bold">{shipment.payment.total}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6b6b70]">Amount paid</span>
            <span className="font-mono-tabular font-bold text-[#008a39]">
              {shipment.payment.paid}
            </span>
          </div>
          <div className="flex justify-between pt-1.5 border-t border-neutral-200 font-extrabold">
            <span>Balance</span>
            <span className="font-mono-tabular">{shipment.payment.balance}</span>
          </div>
        </div>
      </div>

      {/* Footer & Print */}
      <div className="mt-6 pt-4 border-t border-neutral-100 flex flex-wrap justify-between items-center gap-3 text-[11px] text-[#6b6b70]">
        <span>
          Thank you for shipping with Metro Parcel Service · Method: {shipment.payment.method}
        </span>
        {showPrintButton && (
          <button
            type="button"
            onClick={() => window.print()}
            className="no-print px-3.5 py-2 bg-[#1d1d1f] text-[#CD9E34] hover:bg-[#9D7110] hover:text-white transition-colors text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
        )}
      </div>
    </div>
  );
};
