import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Send,
  Ticket,
} from 'lucide-react';
import type { SiteSettings, SupportTicket } from '../types';

interface ContactPageProps {
  contactSettings: SiteSettings['contact'];
  tickets: SupportTicket[];
  isOnline: boolean;
  onSubmitTicket: (payload: {
    name: string;
    email: string;
    subject: string;
    message: string;
    trackingNo?: string;
    category?: SupportTicket['category'];
    priority?: SupportTicket['priority'];
  }) => Promise<{ queuedOffline: boolean; ticket: SupportTicket }>;
  onReplyTicket: (
    ticketIdOrCode: string,
    payload: { senderRole: 'visitor' | 'admin'; senderName: string; text: string }
  ) => Promise<{ ok: boolean; ticket?: SupportTicket }>;
  onLookupTicket: (ticketCode: string) => Promise<SupportTicket | null>;
}

export const ContactPage: React.FC<ContactPageProps> = ({
  contactSettings,
  tickets,
  isOnline,
  onSubmitTicket,
  onReplyTicket,
  onLookupTicket,
}) => {
  const [activeTab, setActiveTab] = useState<'new' | 'tickets'>(
    tickets.length > 0 ? 'tickets' : 'new'
  );
  const [selectedTicketId, setSelectedTicketId] = useState<string>(tickets[0]?.id || '');

  // New ticket form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [trackingNo, setTrackingNo] = useState('');
  const [category, setCategory] = useState<SupportTicket['category']>('Tracking');
  const [priority, setPriority] = useState<SupportTicket['priority']>('Normal');
  const [subject, setSubject] = useState('Parcel tracking & delivery inquiry');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [createdBanner, setCreatedBanner] = useState<{
    ticketCode: string;
    queuedOffline: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Ticket lookup by code
  const [lookupCode, setLookupCode] = useState('');
  const [lookupFeedback, setLookupFeedback] = useState<string | null>(null);

  // Live reply input
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  const selectedTicket =
    tickets.find((t) => t.id === selectedTicketId) || tickets[0] || null;

  useEffect(() => {
    if (selectedTicket && selectedTicket.id !== selectedTicketId) {
      setSelectedTicketId(selectedTicket.id);
    }
  }, [selectedTicket, selectedTicketId]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedTicket?.replies.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Please fill in your name, email, and message.');
      return;
    }
    setError(null);
    setSending(true);
    try {
      const res = await onSubmitTicket({
        name: name.trim(),
        email: email.trim(),
        trackingNo: trackingNo.trim() || undefined,
        category,
        priority,
        subject: subject.trim() || 'Support Request',
        message: message.trim(),
      });
      setCreatedBanner({
        ticketCode: res.ticket.ticketCode,
        queuedOffline: res.queuedOffline,
      });
      setMessage('');
      setSelectedTicketId(res.ticket.id);
      setActiveTab('tickets');
    } finally {
      setSending(false);
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = lookupCode.trim().toUpperCase();
    if (!clean) return;
    setLookupFeedback(null);
    const found = await onLookupTicket(clean);
    if (found) {
      setSelectedTicketId(found.id);
      setActiveTab('tickets');
      setLookupCode('');
    } else {
      setLookupFeedback(`No ticket found for code ${clean}.`);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;
    setSendingReply(true);
    try {
      await onReplyTicket(selectedTicket.id, {
        senderRole: 'visitor',
        senderName: selectedTicket.name,
        text: replyText.trim(),
      });
      setReplyText('');
    } finally {
      setSendingReply(false);
    }
  };

  const statusLabel = (st: SupportTicket['status']) => {
    if (st === 'resolved') return 'Resolved';
    if (st === 'in_progress') return 'Admin Replied';
    return 'Open';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 pb-24 lg:pb-16">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#6b6b70]">
            Home / Contact &amp; Live Support
          </span>
          <h1 className="font-display text-4xl text-[#1d1d1f] mt-2">Say hello &amp; open a ticket</h1>
          <p className="text-sm text-[#6b6b70] mt-1">
            Submit a support ticket and chat with a Metro Parcel Service operations admin in real time.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('new')}
            className={`px-4 py-2.5 text-xs font-extrabold border inline-flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'new'
                ? 'bg-[#1d1d1f] text-[#FFCC00] border-[#1d1d1f]'
                : 'bg-white text-[#1d1d1f] border-neutral-300 hover:border-[#1d1d1f]'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Submit New Ticket</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tickets')}
            className={`px-4 py-2.5 text-xs font-extrabold border inline-flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'tickets'
                ? 'bg-[#FFCC00] text-[#1d1d1f] border-[#1d1d1f]'
                : 'bg-white text-[#1d1d1f] border-neutral-300 hover:border-[#1d1d1f]'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>My Support Tickets ({tickets.length})</span>
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left 4 cols: Live Admin-Controlled Contact Info + Ticket Code Lookup */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-neutral-200 p-5 flex gap-4">
            <Phone className="w-5 h-5 text-[#1d1d1f] shrink-0 mt-0.5" />
            <div>
              <h2 className="font-extrabold text-sm">Call us</h2>
              <a
                href={`tel:${contactSettings.phone}`}
                className="font-mono-tabular text-sm text-[#1B6CFF] hover:underline mt-0.5 block"
              >
                {contactSettings.phone}
              </a>
            </div>
          </div>

          <div className="bg-white border border-neutral-200 p-5 flex gap-4">
            <Mail className="w-5 h-5 text-[#1d1d1f] shrink-0 mt-0.5" />
            <div>
              <h2 className="font-extrabold text-sm">Email</h2>
              <a
                href={`mailto:${contactSettings.email}`}
                className="text-sm text-[#1B6CFF] hover:underline mt-0.5 block break-all"
              >
                {contactSettings.email}
              </a>
            </div>
          </div>

          <div className="bg-white border border-neutral-200 p-5 flex gap-4">
            <MapPin className="w-5 h-5 text-[#1d1d1f] shrink-0 mt-0.5" />
            <div>
              <h2 className="font-extrabold text-sm">Head office</h2>
              <p className="text-sm text-[#6b6b70] mt-0.5 leading-relaxed">
                {contactSettings.address}
              </p>
            </div>
          </div>

          <div className="bg-[#1d1d1f] text-white p-5 flex gap-4">
            <Clock className="w-5 h-5 text-[#FFCC00] shrink-0 mt-0.5" />
            <div>
              <h2 className="font-extrabold text-sm text-[#FFCC00]">Support hours</h2>
              <p className="text-xs text-neutral-300 mt-1">{contactSettings.supportHours}</p>
              <p className="text-xs text-neutral-300 mt-0.5">{contactSettings.salesHours}</p>
            </div>
          </div>

          {/* Open existing ticket by Ticket Code */}
          <form onSubmit={handleLookup} className="bg-white border border-neutral-200 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-[#1d1d1f]" />
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-[#1d1d1f]">
                Open Ticket by Code
              </h3>
            </div>
            <p className="text-xs text-[#6b6b70]">
              Already submitted a ticket from another device? Enter your code (e.g. TKT-4821) to view real-time replies.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[#6b6b70] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={lookupCode}
                  onChange={(e) => setLookupCode(e.target.value)}
                  placeholder="TKT-XXXX"
                  className="w-full border border-neutral-300 pl-8 pr-2.5 py-2 text-xs font-mono-tabular uppercase"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-2 bg-[#1d1d1f] text-[#FFCC00] text-xs font-extrabold cursor-pointer"
              >
                Open
              </button>
            </div>
            {lookupFeedback && (
              <p className="text-xs font-bold text-[#FF5A1F]">{lookupFeedback}</p>
            )}
          </form>
        </div>

        {/* Right 8 cols: Submit Ticket Form OR Live Real-Time Ticket Chat */}
        <div className="lg:col-span-8 space-y-4">
          {createdBanner && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-[#008a39] shrink-0" />
                <span>
                  {createdBanner.queuedOffline
                    ? `Offline Mode: Ticket ${createdBanner.ticketCode} queued and ready to sync when online.`
                    : `Ticket ${createdBanner.ticketCode} is now live with Metro Parcel Service Support. Replies from Admin appear here in real time.`}
                </span>
              </div>
              <span className="font-mono-tabular font-extrabold px-2 py-1 bg-white border border-emerald-300 shrink-0">
                {createdBanner.ticketCode}
              </span>
            </div>
          )}

          {activeTab === 'new' && (
            <form onSubmit={handleSubmit} className="bg-white border border-neutral-200 p-6 sm:p-8 space-y-5">
              <div>
                <h2 className="font-display text-2xl text-[#1d1d1f]">Create a Support Ticket</h2>
                <p className="text-xs text-[#6b6b70] mt-1">
                  Your ticket receives a private reference code so you and our admin team can message back and forth in real time.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="c-name" className="block text-xs font-bold mb-1">
                    Your Name *
                  </label>
                  <input
                    id="c-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="c-email" className="block text-xs font-bold mb-1">
                    Your Email *
                  </label>
                  <input
                    id="c-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="c-tracking" className="block text-xs font-bold mb-1">
                    Tracking No (optional)
                  </label>
                  <input
                    id="c-tracking"
                    type="text"
                    placeholder="e.g. TP26AB100245"
                    value={trackingNo}
                    onChange={(e) => setTrackingNo(e.target.value)}
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-sm font-mono-tabular"
                  />
                </div>
                <div>
                  <label htmlFor="c-cat" className="block text-xs font-bold mb-1">
                    Category
                  </label>
                  <select
                    id="c-cat"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as SupportTicket['category'])}
                    className="w-full border border-neutral-300 px-3 py-2.5 text-sm bg-white"
                  >
                    <option value="Tracking">Tracking</option>
                    <option value="Delivery Issue">Delivery Issue</option>
                    <option value="Receipt & Billing">Receipt &amp; Billing</option>
                    <option value="Return">Return</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="c-prio" className="block text-xs font-bold mb-1">
                    Priority
                  </label>
                  <select
                    id="c-prio"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as SupportTicket['priority'])}
                    className="w-full border border-neutral-300 px-3 py-2.5 text-sm bg-white"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="c-subject" className="block text-xs font-bold mb-1">
                  Subject *
                </label>
                <input
                  id="c-subject"
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full border border-neutral-300 px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label htmlFor="c-msg" className="block text-xs font-bold mb-1">
                  How can we help? *
                </label>
                <textarea
                  id="c-msg"
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your parcel question or delivery update request..."
                  className="w-full border border-neutral-300 px-3.5 py-2.5 text-sm"
                />
              </div>

              {error && <p className="text-xs font-bold text-[#FF5A1F]">{error}</p>}

              <button
                type="submit"
                disabled={sending}
                className="px-7 py-3.5 bg-[#1d1d1f] text-[#FFCC00] font-extrabold text-sm hover:bg-black transition-colors cursor-pointer disabled:opacity-60 inline-flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{sending ? 'Creating Ticket...' : 'Submit Ticket & Start Live Chat'}</span>
              </button>
            </form>
          )}

          {activeTab === 'tickets' && (
            <div className="bg-white border border-neutral-200">
              {tickets.length === 0 ? (
                <div className="p-10 text-center space-y-3">
                  <MessageSquare className="w-8 h-8 text-[#6b6b70] mx-auto" />
                  <h2 className="font-display text-xl text-[#1d1d1f]">No Support Tickets Yet</h2>
                  <p className="text-xs text-[#6b6b70] max-w-md mx-auto">
                    Submit a new support ticket or enter your ticket code on the left to chat with Metro Parcel Service Admin in real time.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('new')}
                    className="px-5 py-2.5 bg-[#FFCC00] text-[#1d1d1f] border border-[#1d1d1f] text-xs font-extrabold cursor-pointer"
                  >
                    Create Your First Ticket
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-12 min-h-[460px]">
                  {/* Visitor Ticket List */}
                  <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-neutral-200 bg-[#f2f2f2] divide-y divide-neutral-200">
                    <div className="p-3.5 bg-white border-b border-neutral-200 flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-[#6b6b70]">
                        Your Tickets ({tickets.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('new')}
                        className="text-xs font-extrabold text-[#1B6CFF] hover:underline cursor-pointer"
                      >
                        + New
                      </button>
                    </div>
                    {tickets.map((t) => {
                      const active = selectedTicket?.id === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedTicketId(t.id)}
                          className={`w-full text-left p-3.5 space-y-1 transition-colors cursor-pointer ${
                            active ? 'bg-[#FFF6CC] border-l-4 border-l-[#1d1d1f]' : 'bg-white hover:bg-neutral-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-mono-tabular font-extrabold text-[#1d1d1f]">
                              {t.ticketCode}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 font-bold uppercase text-[10px] ${
                                t.status === 'resolved'
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : t.status === 'in_progress'
                                  ? 'bg-blue-100 text-blue-900'
                                  : 'bg-[#FFE68A] text-[#1d1d1f]'
                              }`}
                            >
                              {statusLabel(t.status)}
                            </span>
                          </div>
                          <p className="font-bold text-xs text-[#1d1d1f] truncate">{t.subject}</p>
                          <p className="text-[11px] text-[#6b6b70]">
                            {t.replies.length} message{t.replies.length > 1 ? 's' : ''}
                            {t.trackingNo ? ` · #${t.trackingNo}` : ''}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Live Ticket Thread */}
                  {selectedTicket && (
                    <div className="md:col-span-8 flex flex-col">
                      <div className="p-4 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-2 bg-white">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono-tabular text-xs font-extrabold px-2 py-0.5 bg-[#1d1d1f] text-[#FFCC00]">
                              {selectedTicket.ticketCode}
                            </span>
                            <span className="text-xs font-bold text-[#6b6b70]">
                              {selectedTicket.category}
                              {selectedTicket.priority === 'Urgent' ? ' · Urgent' : ''}
                            </span>
                            {selectedTicket.trackingNo && (
                              <span className="text-xs font-mono-tabular text-[#1B6CFF] font-bold">
                                #{selectedTicket.trackingNo}
                              </span>
                            )}
                          </div>
                          <h3 className="font-extrabold text-sm text-[#1d1d1f] mt-1">
                            {selectedTicket.subject}
                          </h3>
                        </div>
                        <span className="text-[11px] font-bold text-[#008a39]">
                          {isOnline ? 'Live real-time sync active' : 'Offline queue active'}
                        </span>
                      </div>

                      <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-[#f9f9fa] max-h-[380px]">
                        {selectedTicket.replies.map((rep) => {
                          const isVisitor = rep.senderRole === 'visitor';
                          return (
                            <div
                              key={rep.id}
                              className={`flex flex-col ${isVisitor ? 'items-end' : 'items-start'}`}
                            >
                              <div
                                className={`max-w-[85%] p-3.5 text-xs space-y-1 ${
                                  isVisitor
                                    ? 'bg-[#1d1d1f] text-white'
                                    : 'bg-[#FFF6CC] border border-[#1d1d1f] text-[#1d1d1f]'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-4 text-[10px] opacity-80 font-bold uppercase tracking-wider">
                                  <span>
                                    {isVisitor ? rep.senderName : `${rep.senderName} (Admin)`}
                                  </span>
                                  <span className="font-mono-tabular">
                                    {new Date(rep.createdAt).toLocaleTimeString('en-GB', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                                <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                                  {rep.text}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={threadEndRef} />
                      </div>

                      <form
                        onSubmit={handleSendReply}
                        className="p-3.5 bg-white border-t border-neutral-200 flex gap-2"
                      >
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write a real-time reply to Metro Parcel Service support..."
                          className="flex-1 border border-neutral-300 px-3 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#1d1d1f]"
                        />
                        <button
                          type="submit"
                          disabled={sendingReply || !replyText.trim()}
                          className="px-5 py-2.5 bg-[#1d1d1f] text-[#FFCC00] font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Reply</span>
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
