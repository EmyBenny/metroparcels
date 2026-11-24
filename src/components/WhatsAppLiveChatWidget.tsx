import React, { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, MessageCircle, Send, X } from 'lucide-react';

interface WhatsAppLiveChatWidgetProps {
  whatsappNumber?: string;
  selectedTrackingNo?: string;
}

export const WhatsAppLiveChatWidget: React.FC<WhatsAppLiveChatWidgetProps> = ({
  whatsappNumber = '+447447484073',
  selectedTrackingNo = '',
}) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');

  const cleanDigits = whatsappNumber.replace(/[^0-9]/g, '') || '447447484073';
  const displayNumber = whatsappNumber.trim() || '+447447484073';

  useEffect(() => {
    const trimmedCode = selectedTrackingNo.trim().toUpperCase();
    if (trimmedCode) {
      setMessage(`Hello Metro Parcel Service, I would like an update on parcel ${trimmedCode}.`);
    }
  }, [selectedTrackingNo]);

  const effectiveMessage =
    message.trim() ||
    'Hello Metro Parcel Service, I need live assistance with my parcel delivery.';
  const waHref = `https://wa.me/${cleanDigits}?text=${encodeURIComponent(effectiveMessage)}`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(displayNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="fixed bottom-16 right-4 lg:bottom-6 lg:right-6 z-40 no-print flex flex-col items-end gap-3">
      {open && (
        <div
          role="dialog"
          aria-label="WhatsApp Live Chat"
          className="w-[calc(100vw-2rem)] max-w-xs sm:max-w-sm bg-white border-2 border-[#1d1d1f] shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-[#9D7110] text-white px-4 py-3.5 flex items-center justify-between gap-2 border-b border-[#1d1d1f]">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0 border border-white/30">
                <MessageCircle className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-extrabold uppercase tracking-wider leading-tight">
                  WhatsApp Live Chat
                </p>
                <p className="text-[11px] font-mono-tabular text-[#F2E9D4] truncate">
                  {displayNumber} · Online 24/7
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close WhatsApp chat"
              className="w-8 h-8 flex items-center justify-center text-white hover:bg-black/20 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3 bg-[#F2E9D4]/40">
            <div className="bg-white border border-neutral-200 p-3 text-xs text-[#1d1d1f] leading-relaxed">
              Need instant parcel support, live courier status, or receipt assistance? Message our dispatch desk directly on WhatsApp.
            </div>

            <div className="flex items-center justify-between gap-2 bg-white border border-neutral-200 px-3 py-2 text-xs">
              <span className="font-mono-tabular font-bold text-[#1d1d1f]">{displayNumber}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#9D7110] hover:text-[#1d1d1f] cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div>
              <label
                htmlFor="wa-livechat-msg"
                className="block text-[11px] font-bold uppercase tracking-wider text-[#6b6b70] mb-1"
              >
                Your message
              </label>
              <textarea
                id="wa-livechat-msg"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your tracking code or question..."
                className="w-full bg-white border border-neutral-300 px-3 py-2 text-xs text-[#1d1d1f] focus:outline-none focus:border-[#9D7110] resize-none"
              />
            </div>

            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-extrabold text-xs inline-flex items-center justify-center gap-2 transition-colors border border-[#1d1d1f]"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Start WhatsApp Live Chat</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open WhatsApp Live Chat (+447447484073)"
        className="inline-flex items-center gap-2.5 bg-[#1d1d1f] hover:bg-[#9D7110] text-white px-4 py-3 border-2 border-[#9D7110] shadow-xl transition-colors cursor-pointer"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-[#25D366] animate-pulse shrink-0" />
        <MessageCircle className="w-4 h-4 text-[#25D366] shrink-0" />
        <span className="text-xs font-extrabold tracking-wide whitespace-nowrap">
          WhatsApp Live Chat
        </span>
      </button>
    </div>
  );
};
