import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Bookmark,
  Captions,
  ChevronLeft,
  ChevronRight,
  Heart,
  Maximize2,
  MessageSquarePlus,
  Pause,
  Play,
  Share2,
  SkipForward,
  ThumbsUp,
  Video,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { PageRoute } from '../types';

interface HomeMediaShowcaseProps {
  onNavigate: (page: PageRoute) => void;
}

interface VideoChapter {
  id: string;
  num: string;
  category: string;
  title: string;
  subtitle: string;
  durationSec: number;
  image: string;
  routeLabel: string;
  courierName: string;
  captions: string[];
}

interface GalleryStory {
  id: string;
  num: string;
  group: 'Couriers' | 'Parcels' | 'People & Shops' | 'Fleet & Hubs';
  title: string;
  caption: string;
  detail: string;
  location: string;
  image: string;
  featured?: boolean;
  defaultLikes: number;
}

const VIDEO_CHAPTERS: VideoChapter[] = [
  {
    id: 'doorstep-handover',
    num: '01',
    category: 'Doorstep Delivery',
    title: 'Friendly Couriers, Verified at Every Door',
    subtitle:
      'Every parcel handover includes a live GPS ping, barcode confirmation, and optional photo inspection.',
    durationSec: 12,
    image: '/src/assets/images/golden_courier_driver_1795375426210.jpg',
    routeLabel: 'London Central · Express Doorstep',
    courierName: 'Courier Richard D. · Van EV-402',
    captions: [
      '07:45 — Courier arrives within the 30-minute live GPS arrival window.',
      '07:46 — Barcode verified; recipient receives instant stamped digital receipt.',
      '07:47 — Handover photo & signature archived securely on tracking link.',
    ],
  },
  {
    id: 'parcel-studio',
    num: '02',
    category: 'Parcel Care',
    title: 'Packed, Taped & Barcode-Checked for Transit',
    subtitle:
      'Reinforced kraft packaging, tamper-evident Metro Parcel Service tape, and dual-barcode sorting keep fragile goods safe.',
    durationSec: 12,
    image: '/src/assets/images/golden_courier_parcels_1795375425863.jpg',
    routeLabel: 'Birmingham Sort Studio · Belt 04',
    courierName: 'Automated Weigh & Laser Scan',
    captions: [
      '11:10 — Dimensional weight & barcode quality verified in under 2 seconds.',
      '11:12 — Priority gold-tape seal protects high-value electronics & garments.',
      '11:15 — Routed straight to regional electric sprint bay.',
    ],
  },
  {
    id: 'people-shops',
    num: '03',
    category: 'People & Businesses',
    title: 'Trusted by Independent Shops & Everyday Recipients',
    subtitle:
      'From local makers dispatching daily orders to families unboxing gifts, Metro Parcel Service keeps every milestone transparent.',
    durationSec: 12,
    image: '/src/assets/images/golden_courier_people_1795375425495.jpg',
    routeLabel: 'Soho Craft Collective · Daily Dispatch',
    courierName: 'Merchant Portal · Bulk Dispatch',
    captions: [
      '14:20 — Independent shops seal 40+ customer parcels with live tracking IDs.',
      '14:22 — Customers receive SMS/email updates & follow the courier live.',
      '14:25 — Hassle-free 14–30 day drop-point returns built into every order.',
    ],
  },
  {
    id: 'hub-fleet',
    num: '04',
    category: 'Fleet & Smart Lockers',
    title: 'Golden-Hour EV Fleet & 16,000+ Smart Lockers',
    subtitle:
      'Our electric courier vans connect regional sort hubs to 24/7 street-level QR lockers across 220+ destinations.',
    durationSec: 12,
    image: '/src/assets/images/golden_courier_hub_fleet_1795375426253.jpg',
    routeLabel: 'National Electric Corridor · Bay 12',
    courierName: 'Evening Linehaul · 99.4% On-Time SLA',
    captions: [
      '18:30 — Electric Sprinter bays load pre-sorted cages for overnight transit.',
      '18:34 — Corridor geofences armed across motorway hubs and urban lockers.',
      '18:38 — Morning deliveries arrive cleanly with zero tailpipe emissions.',
    ],
  },
];

const GALLERY_STORIES: GalleryStory[] = [
  {
    id: 'story-courier',
    num: '01',
    group: 'Couriers',
    title: 'Morning Doorstep Handover',
    caption: 'Uniformed Metro Parcel Service drivers deliver directly to homes with live arrival ETA.',
    detail:
      'Every Metro Parcel Service driver carries a connected telemetry handheld that updates your live map position and triggers geofence arrival alerts before knocking.',
    location: 'Camden & North London',
    image: '/src/assets/images/golden_courier_driver_1795375426210.jpg',
    featured: true,
    defaultLikes: 342,
  },
  {
    id: 'story-parcels',
    num: '02',
    group: 'Parcels',
    title: 'Priority Sealed Parcels',
    caption: 'Reinforced kraft boxes sealed with bold gold-and-charcoal priority tape and QR labels.',
    detail:
      'Each parcel receives an inspection photo at dispatch that only the recipient tracking that exact code can inspect online or offline.',
    location: 'Birmingham Sort Studio',
    image: '/src/assets/images/golden_courier_parcels_1795375425863.jpg',
    defaultLikes: 289,
  },
  {
    id: 'story-people',
    num: '03',
    group: 'People & Shops',
    title: 'Small Businesses & Happy Unboxings',
    caption: 'Boutique studio owners and customers packing and opening insured orders together.',
    detail:
      'Over 14,000 independent retailers use Metro Parcel Service for batch CSV dispatches, automated customer tracking links, and £10,000 parcel protection.',
    location: 'Manchester Northern Quarter',
    image: '/src/assets/images/golden_courier_people_1795375425495.jpg',
    defaultLikes: 418,
  },
  {
    id: 'story-locker',
    num: '04',
    group: 'People & Shops',
    title: '24/7 QR Smart Locker Pickup',
    caption: 'Scan your Metro Parcel Service QR receipt on your phone to collect your package any hour.',
    detail:
      'Missed home deliveries can be redirected to 16,000+ solar-lit street lockers with zero extra pickup fees.',
    location: 'Edinburgh City Centre',
    image: '/src/assets/images/golden_courier_locker_1795375425922.jpg',
    defaultLikes: 264,
  },
  {
    id: 'story-fleet',
    num: '05',
    group: 'Fleet & Hubs',
    title: 'Golden-Hour Electric Fleet Hub',
    caption: 'Zero-emission vans loading pre-sorted parcel cages for nationwide overnight express.',
    detail:
      'Our regional parcel hubs combine high-speed conveyor sortation with live route playback analytics to maintain a 99.4% on-time delivery rate.',
    location: 'Midlands National Hub',
    image: '/src/assets/images/golden_courier_hub_fleet_1795375426253.jpg',
    defaultLikes: 376,
  },
  {
    id: 'story-proof',
    num: '06',
    group: 'Parcels',
    title: 'Verified Delivery Proof Photos',
    caption: 'Clear photographic proof attached directly to each tracked parcel timeline.',
    detail:
      'Admin operations attach dispatch and doorstep verification photos so senders and receivers always have transparent proof of condition.',
    location: 'Bristol & South West',
    image: '/src/assets/images/parcel_proof_boots_1795252245449.jpg',
    defaultLikes: 215,
  },
];

const POLL_OPTIONS = [
  { id: 'sameday', label: 'Same-Day Doorstep Courier', baseVotes: 184 },
  { id: 'express', label: 'Next-Day Tracked Express', baseVotes: 312 },
  { id: 'locker', label: '24/7 Smart Locker Collect', baseVotes: 149 },
  { id: 'business', label: 'Business Bulk & API Dispatch', baseVotes: 121 },
];

const INITIAL_COMMUNITY_NOTES = [
  {
    id: 'note-1',
    author: 'Hannah M.',
    city: 'Leeds',
    tag: 'Courier Shoutout',
    text: 'Driver waited two extra minutes while I stepped down to the lobby and checked the parcel seal with me.',
    time: 'Today, 09:42',
  },
  {
    id: 'note-2',
    author: 'Kaito Ceramics',
    city: 'London',
    tag: 'Business Partner',
    text: 'All 65 fragile stoneware boxes arrived unbroken this week. Customers love seeing dispatch photos on their tracking link.',
    time: 'Yesterday, 17:15',
  },
  {
    id: 'note-3',
    author: 'Samir P.',
    city: 'Glasgow',
    tag: 'Smart Locker',
    text: 'Picked up my headphones at 10 PM with the QR receipt code — took less than 20 seconds.',
    time: '2 days ago',
  },
];

export const HomeMediaShowcase: React.FC<HomeMediaShowcaseProps> = ({ onNavigate }) => {
  // Video Reel state
  const [chapterIdx, setChapterIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progressSec, setProgressSec] = useState(0);
  const [showCaptions, setShowCaptions] = useState(true);
  const [muted, setMuted] = useState(true);
  const [videoLikes, setVideoLikes] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('gc_video_likes_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore storage errors
    }
    return {
      'doorstep-handover': 128,
      'parcel-studio': 94,
      'people-shops': 156,
      'hub-fleet': 112,
    };
  });
  const [likedVideos, setLikedVideos] = useState<Record<string, boolean>>({});
  const [savedVideos, setSavedVideos] = useState<Record<string, boolean>>({});
  const [clipFeedback, setClipFeedback] = useState<string | null>(null);

  // Quick appreciation badges on video
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({
    'Fast Arrival': 241,
    'Friendly Courier': 318,
    'Zero Damage': 195,
  });
  const [myReactions, setMyReactions] = useState<Record<string, boolean>>({});

  // Photo Gallery state
  const [activeGroup, setActiveGroup] = useState<string>('All');
  const [storyLikes, setStoryLikes] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    GALLERY_STORIES.forEach((s) => {
      initial[s.id] = s.defaultLikes;
    });
    return initial;
  });
  const [likedStories, setLikedStories] = useState<Record<string, boolean>>({});
  const [lightboxStory, setLightboxStory] = useState<GalleryStory | null>(null);

  // Poll & Delivery Matcher & Community Shoutouts
  const [selectedPollId, setSelectedPollId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('gc_home_poll_vote_v1');
    } catch {
      return null;
    }
  });
  const [matcherItem, setMatcherItem] = useState<'Fragile Craft' | 'Urgent Docs' | 'Multi-Box Order'>('Fragile Craft');
  const [matcherSpeed, setMatcherSpeed] = useState<'Today' | 'Tomorrow AM' | 'Flexible'>('Tomorrow AM');
  const [matcherDrop, setMatcherDrop] = useState<'Doorstep' | 'Smart Locker'>('Doorstep');

  const [communityNotes, setCommunityNotes] = useState(() => {
    try {
      const saved = localStorage.getItem('gc_community_notes_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_COMMUNITY_NOTES;
  });
  const [noteForm, setNoteForm] = useState({ author: '', city: '', text: '' });
  const [noteFeedback, setNoteFeedback] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loadedImagesRef = useRef<Record<string, HTMLImageElement>>({});

  const chapter = VIDEO_CHAPTERS[chapterIdx];

  // Preload chapter images cleanly for Canvas rendering
  useEffect(() => {
    VIDEO_CHAPTERS.forEach((ch) => {
      if (!loadedImagesRef.current[ch.image]) {
        const img = new Image();
        img.src = ch.image;
        loadedImagesRef.current[ch.image] = img;
      }
    });
  }, []);

  // Video playback timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setProgressSec((prev) => {
        const next = prev + 0.1;
        if (next >= chapter.durationSec) {
          setChapterIdx((c) => (c + 1) % VIDEO_CHAPTERS.length);
          return 0;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, chapter.durationSec]);

  // Render smooth animated motion frame onto Canvas
  useEffect(() => {
    let rafId = 0;
    const drawFrame = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          ctx.fillStyle = '#141416';
          ctx.fillRect(0, 0, w, h);

          const img = loadedImagesRef.current[chapter.image];
          const ratio = Math.min(1, progressSec / chapter.durationSec);
          // Smooth Ken Burns zoom & pan per chapter
          const dir = chapterIdx % 2 === 0 ? 1 : -1;
          const zoom = 1.03 + ratio * 0.09;
          const panX = dir * (ratio - 0.5) * 32;
          const panY = (0.5 - ratio) * 14;

          if (img && img.complete && img.naturalWidth > 0) {
            const imgAspect = img.naturalWidth / img.naturalHeight;
            const canvasAspect = w / h;
            let drawW = w * zoom;
            let drawH = h * zoom;
            if (imgAspect > canvasAspect) {
              drawH = h * zoom;
              drawW = drawH * imgAspect;
            } else {
              drawW = w * zoom;
              drawH = drawW / imgAspect;
            }
            const x = (w - drawW) / 2 + panX;
            const y = (h - drawH) / 2 + panY;
            ctx.drawImage(img, x, y, drawW, drawH);
          }

          // Top & bottom editorial scrims for high-contrast HUD legibility
          const topGrad = ctx.createLinearGradient(0, 0, 0, 120);
          topGrad.addColorStop(0, 'rgba(15, 15, 18, 0.78)');
          topGrad.addColorStop(1, 'rgba(15, 15, 18, 0)');
          ctx.fillStyle = topGrad;
          ctx.fillRect(0, 0, w, 120);

          const botGrad = ctx.createLinearGradient(0, h - 170, 0, h);
          botGrad.addColorStop(0, 'rgba(15, 15, 18, 0)');
          botGrad.addColorStop(1, 'rgba(15, 15, 18, 0.9)');
          ctx.fillStyle = botGrad;
          ctx.fillRect(0, h - 170, w, 170);

          // Corner broadcast frame markers
          ctx.strokeStyle = '#FFCC00';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(20, 44);
          ctx.lineTo(20, 20);
          ctx.lineTo(44, 20);
          ctx.moveTo(w - 44, 20);
          ctx.lineTo(w - 20, 20);
          ctx.lineTo(w - 20, 44);
          ctx.stroke();

          // Subtle live audio wave bars when unmuted & playing
          if (!muted && isPlaying) {
            for (let b = 0; b < 5; b++) {
              const barH = 6 + Math.abs(Math.sin(progressSec * 6 + b * 1.1)) * 16;
              ctx.fillStyle = '#FFCC00';
              ctx.fillRect(w - 58 + b * 7, 40 - barH, 4, barH);
            }
          }
        }
      }
      if (isPlaying) {
        rafId = requestAnimationFrame(drawFrame);
      }
    };

    drawFrame();
    return () => cancelAnimationFrame(rafId);
  }, [chapter.image, chapter.durationSec, chapterIdx, progressSec, isPlaying, muted]);

  const activeCaption = useMemo(() => {
    const step = Math.min(
      chapter.captions.length - 1,
      Math.floor((progressSec / chapter.durationSec) * chapter.captions.length)
    );
    return chapter.captions[step];
  }, [chapter, progressSec]);

  const handleToggleVideoLike = (id: string) => {
    const already = !!likedVideos[id];
    const nextLiked = { ...likedVideos, [id]: !already };
    const nextCounts = {
      ...videoLikes,
      [id]: Math.max(0, (videoLikes[id] || 0) + (already ? -1 : 1)),
    };
    setLikedVideos(nextLiked);
    setVideoLikes(nextCounts);
    try {
      localStorage.setItem('gc_video_likes_v1', JSON.stringify(nextCounts));
    } catch {
      // ignore
    }
  };

  const handleShareClip = () => {
    navigator.clipboard?.writeText(window.location.href);
    setClipFeedback(`Reel "${chapter.title}" link copied`);
    setTimeout(() => setClipFeedback(null), 2600);
  };

  const handleVotePoll = (id: string) => {
    setSelectedPollId(id);
    try {
      localStorage.setItem('gc_home_poll_vote_v1', id);
    } catch {
      // ignore
    }
  };

  const totalPollVotes = useMemo(() => {
    const base = POLL_OPTIONS.reduce((acc, o) => acc + o.baseVotes, 0);
    return selectedPollId ? base + 1 : base;
  }, [selectedPollId]);

  const matcherRecommendation = useMemo(() => {
    if (matcherSpeed === 'Today') {
      return {
        tier: 'Metro Parcel Service Same-Day Priority',
        eta: 'Delivered within 2–4 hours',
        note:
          matcherDrop === 'Smart Locker'
            ? 'Direct drop into the closest 24/7 street smart locker with QR pickup pass.'
            : 'Dedicated courier van straight to the recipient doorstep with live GPS map link.',
      };
    }
    if (matcherItem === 'Multi-Box Order') {
      return {
        tier: 'Metro Parcel Service Business Express',
        eta: 'Next-morning guaranteed arrival',
        note: 'Includes bulk manifest tracking, photo dispatch inspection, and £10,000 cover.',
      };
    }
    return {
      tier: 'Metro Parcel Service Tracked Express',
      eta: matcherSpeed === 'Tomorrow AM' ? 'Next day before 12:00' : '1–2 working days',
      note:
        matcherDrop === 'Smart Locker'
          ? 'Flexible collection from 16,000+ QR parcel lockers with instant SMS notification.'
          : 'Live corridor telemetry, geofence arrival alerts, and stamped digital receipt.',
    };
  }, [matcherItem, matcherSpeed, matcherDrop]);

  const filteredStories = useMemo(() => {
    if (activeGroup === 'All') return GALLERY_STORIES;
    return GALLERY_STORIES.filter((s) => s.group === activeGroup);
  }, [activeGroup]);

  const handleAddCommunityNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteForm.author.trim() || !noteForm.text.trim()) {
      setNoteFeedback('Please enter your name and message.');
      return;
    }
    const created = {
      id: `note-${Date.now()}`,
      author: noteForm.author.trim(),
      city: noteForm.city.trim() || 'UK',
      tag: 'Customer Story',
      text: noteForm.text.trim(),
      time: 'Just now',
    };
    const next = [created, ...communityNotes].slice(0, 6);
    setCommunityNotes(next);
    setNoteForm({ author: '', city: '', text: '' });
    setNoteFeedback('Thank you! Your Metro Parcel Service shoutout has been posted.');
    try {
      localStorage.setItem('gc_community_notes_v1', JSON.stringify(next));
    } catch {
      // ignore
    }
    setTimeout(() => setNoteFeedback(null), 3500);
  };

  return (
    <>
      {/* 1. INTERACTIVE VIDEO REEL SECTION */}
      <section className="py-16 bg-[#1d1d1f] text-white border-y border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#FFCC00] inline-flex items-center gap-2">
                <Video className="w-4 h-4" />
                <span>Metro Parcel Service Films · Inside Our Service</span>
              </span>
              <h2 className="font-display text-3xl sm:text-5xl text-white mt-2 text-balance">
                See our couriers, parcels &amp; people in motion
              </h2>
            </div>
            <p className="text-sm text-neutral-300 max-w-md">
              Watch how every Metro Parcel Service parcel travels from studio tape-seal to verified doorstep handover or 24/7 smart locker pickup.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-6 items-start">
            {/* Main Interactive Video Canvas Frame */}
            <div className="lg:col-span-8 bg-[#121214] border border-neutral-700">
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-black">
                <canvas
                  ref={canvasRef}
                  width={960}
                  height={540}
                  className="w-full h-full object-cover block"
                />

                {/* Top Overlay Telemetry Metadata */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-3 pointer-events-none">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#FFCC00] block">
                      Chapter {chapter.num} · {chapter.category}
                    </span>
                    <span className="text-xs font-mono-tabular text-white/90">
                      {chapter.routeLabel}
                    </span>
                  </div>
                  <div className="text-right font-mono-tabular text-[11px] text-neutral-200 bg-black/60 px-2.5 py-1 border border-white/15">
                    {chapter.courierName}
                  </div>
                </div>

                {/* Captions Strip */}
                {showCaptions && (
                  <div className="absolute bottom-14 left-4 right-4 pointer-events-none">
                    <div className="bg-black/80 border border-white/15 px-4 py-2.5 text-xs sm:text-sm text-white max-w-2xl">
                      {activeCaption}
                    </div>
                  </div>
                )}

                {/* Play/Pause Overlay Center Button when paused */}
                {!isPlaying && (
                  <button
                    type="button"
                    onClick={() => setIsPlaying(true)}
                    aria-label="Play video story"
                    className="absolute inset-0 m-auto w-16 h-16 bg-[#FFCC00] text-[#1d1d1f] flex items-center justify-center border-2 border-[#1d1d1f] shadow-xl hover:scale-105 transition-transform cursor-pointer"
                  >
                    <Play className="w-7 h-7 fill-current ml-0.5" />
                  </button>
                )}

                {/* Bottom Transport Controls */}
                <div className="absolute bottom-0 inset-x-0 bg-black/85 px-4 py-2.5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPlaying((p) => !p)}
                    aria-label={isPlaying ? 'Pause video' : 'Play video'}
                    className="w-8 h-8 bg-[#FFCC00] text-[#1d1d1f] flex items-center justify-center cursor-pointer shrink-0"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setChapterIdx((c) => (c + 1) % VIDEO_CHAPTERS.length);
                      setProgressSec(0);
                    }}
                    aria-label="Next video chapter"
                    className="w-8 h-8 border border-white/25 text-white hover:border-[#FFCC00] hover:text-[#FFCC00] flex items-center justify-center cursor-pointer shrink-0"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>

                  {/* Timeline Scrubber */}
                  <div className="flex-1 flex items-center gap-2.5">
                    <input
                      type="range"
                      aria-label="Video timeline"
                      min={0}
                      max={chapter.durationSec}
                      step={0.1}
                      value={progressSec}
                      onChange={(e) => setProgressSec(Number(e.target.value))}
                      className="w-full accent-[#FFCC00] cursor-pointer"
                    />
                    <span className="font-mono-tabular text-[11px] text-neutral-300 shrink-0">
                      00:{String(Math.floor(progressSec)).padStart(2, '0')} / 00:{chapter.durationSec}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCaptions((v) => !v)}
                    aria-label="Toggle captions"
                    className={`p-1.5 border text-xs cursor-pointer ${
                      showCaptions
                        ? 'border-[#FFCC00] text-[#FFCC00]'
                        : 'border-white/20 text-neutral-400'
                    }`}
                  >
                    <Captions className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMuted((m) => !m)}
                    aria-label={muted ? 'Unmute audio visualizer' : 'Mute audio visualizer'}
                    className="p-1.5 border border-white/20 text-neutral-200 hover:border-[#FFCC00] cursor-pointer"
                  >
                    {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#FFCC00]" />}
                  </button>
                </div>
              </div>

              {/* Video Title + Viewer Engagements Strip */}
              <div className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <h3 className="font-extrabold text-xl text-white">{chapter.title}</h3>
                    <p className="text-sm text-neutral-300 mt-1 leading-relaxed">{chapter.subtitle}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleVideoLike(chapter.id)}
                      className={`px-3.5 py-2 border text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                        likedVideos[chapter.id]
                          ? 'bg-[#FFCC00] text-[#1d1d1f] border-[#FFCC00]'
                          : 'border-neutral-700 text-white hover:border-[#FFCC00]'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>Applaud ({videoLikes[chapter.id] ?? 0})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSavedVideos((s) => ({ ...s, [chapter.id]: !s[chapter.id] }))
                      }
                      className={`px-3.5 py-2 border text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                        savedVideos[chapter.id]
                          ? 'bg-white text-[#1d1d1f] border-white'
                          : 'border-neutral-700 text-white hover:border-white'
                      }`}
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>{savedVideos[chapter.id] ? 'Saved' : 'Save'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleShareClip}
                      className="px-3.5 py-2 border border-neutral-700 text-xs font-bold text-white hover:border-[#FFCC00] inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share</span>
                    </button>
                  </div>
                </div>

                {clipFeedback && (
                  <div className="text-xs font-bold text-[#1d1d1f] bg-[#FFCC00] px-3 py-2">
                    {clipFeedback}
                  </div>
                )}

                {/* Quick Community Service Appreciation Reactions */}
                <div className="pt-3 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-bold text-neutral-400">
                    Tap to applaud Metro Parcel Service:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(reactionCounts).map(([label, count]) => {
                      const active = !!myReactions[label];
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => {
                            setMyReactions((prev) => ({ ...prev, [label]: !active }));
                            setReactionCounts((prev) => ({
                              ...prev,
                              [label]: prev[label] + (active ? -1 : 1),
                            }));
                          }}
                          className={`px-3 py-1.5 text-xs font-bold border cursor-pointer transition-colors ${
                            active
                              ? 'bg-[#FFCC00] text-[#1d1d1f] border-[#FFCC00]'
                              : 'bg-[#1d1d1f] text-neutral-200 border-neutral-700 hover:border-neutral-400'
                          }`}
                        >
                          {label} · <span className="font-mono-tabular">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Chapter Selector Sidebar */}
            <div className="lg:col-span-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-neutral-400 pb-1">
                <span>Reel Chapters ({VIDEO_CHAPTERS.length})</span>
                <span>Auto-playing</span>
              </div>
              {VIDEO_CHAPTERS.map((item, idx) => {
                const active = idx === chapterIdx;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setChapterIdx(idx);
                      setProgressSec(0);
                      setIsPlaying(true);
                    }}
                    className={`w-full text-left p-3 border flex items-center gap-3 transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#2a2a2e] border-[#FFCC00]'
                        : 'bg-[#161618] border-neutral-800 hover:border-neutral-600'
                    }`}
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-20 h-14 object-cover shrink-0 border border-neutral-700"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#FFCC00] block">
                        {item.num} · {item.category}
                      </span>
                      <span className="font-bold text-xs text-white line-clamp-2 mt-0.5 block">
                        {item.title}
                      </span>
                      <span className="text-[11px] font-mono-tabular text-neutral-400 mt-0.5 block">
                        00:{item.durationSec} · {videoLikes[item.id] ?? 0} applauds
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 2. PARCELS, COURIERS & PEOPLE GALLERY (ASYMMETRIC EDITORIAL BENTO) */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#1B6CFF]">
              Across Our Network
            </span>
            <h2 className="font-display text-3xl sm:text-4xl text-[#1d1d1f] mt-1">
              Parcels, couriers &amp; people
            </h2>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {['All', 'Couriers', 'Parcels', 'People & Shops', 'Fleet & Hubs'].map((group) => (
              <button
                key={group}
                type="button"
                onClick={() => setActiveGroup(group)}
                className={`px-3.5 py-2 text-xs font-extrabold border cursor-pointer transition-colors ${
                  activeGroup === group
                    ? 'bg-[#1d1d1f] text-[#FFCC00] border-[#1d1d1f]'
                    : 'bg-white text-[#1d1d1f] border-neutral-300 hover:border-[#1d1d1f]'
                }`}
              >
                {group === 'All' ? 'All Stories' : group}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStories.map((story, idx) => {
            const liked = !!likedStories[story.id];
            const isHeroSpan = activeGroup === 'All' && idx === 0;
            return (
              <article
                key={story.id}
                className={`bg-white border border-neutral-200 flex flex-col justify-between group hover:border-[#1d1d1f] transition-colors ${
                  isHeroSpan ? 'md:col-span-2 lg:col-span-2' : ''
                }`}
              >
                <div className="relative overflow-hidden bg-[#1d1d1f]">
                  <img
                    src={story.image}
                    alt={story.title}
                    referrerPolicy="no-referrer"
                    className={`w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${
                      isHeroSpan ? 'h-72 sm:h-96' : 'h-64'
                    }`}
                  />
                  <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 via-black/35 to-transparent pointer-events-none" />
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2 text-white">
                    <div>
                      <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#FFCC00] block">
                        {story.num} · {story.group}
                      </span>
                      <h3 className="font-extrabold text-lg sm:text-xl leading-snug">
                        {story.title}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLightboxStory(story)}
                      aria-label={`Inspect ${story.title}`}
                      className="w-9 h-9 bg-[#1d1d1f]/90 hover:bg-[#FFCC00] text-white hover:text-[#1d1d1f] border border-white/25 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <p className="text-sm text-[#6b6b70] leading-relaxed">{story.caption}</p>
                    <p className="text-xs font-mono-tabular text-neutral-500 mt-2">
                      Location: {story.location}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLikedStories((prev) => ({ ...prev, [story.id]: !liked }));
                        setStoryLikes((prev) => ({
                          ...prev,
                          [story.id]: (prev[story.id] ?? story.defaultLikes) + (liked ? -1 : 1),
                        }));
                      }}
                      className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 border cursor-pointer transition-colors ${
                        liked
                          ? 'bg-[#FFF6CC] border-[#1d1d1f] text-[#1d1d1f]'
                          : 'bg-white border-neutral-300 text-[#1d1d1f] hover:border-[#1d1d1f]'
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          liked ? 'fill-[#FF5A1F] text-[#FF5A1F]' : 'text-[#6b6b70]'
                        }`}
                      />
                      <span className="font-mono-tabular">
                        {storyLikes[story.id] ?? story.defaultLikes}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLightboxStory(story)}
                      className="text-xs font-extrabold text-[#1d1d1f] hover:text-[#1B6CFF] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Read story</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 3. INTERACTIVE ENGAGEMENTS: POLL, DELIVERY MATCHER & COMMUNITY SHOUTOUTS */}
      <section className="py-16 bg-white border-y border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Left 6 cols: Interactive Community Poll + Service Matcher */}
            <div className="lg:col-span-6 space-y-6">
              <div className="border border-neutral-200 bg-[#f2f2f2] p-6 space-y-4">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-widest text-[#1B6CFF]">
                    Interactive Poll
                  </span>
                  <h2 className="font-display text-2xl text-[#1d1d1f] mt-1">
                    Which Metro Parcel Service tier fits your routine best?
                  </h2>
                  <p className="text-xs text-[#6b6b70] mt-1">
                    Vote to see live preferences from {totalPollVotes.toLocaleString()} Metro Parcel Service community members.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {POLL_OPTIONS.map((opt) => {
                    const votes = opt.baseVotes + (selectedPollId === opt.id ? 1 : 0);
                    const pct = Math.round((votes / totalPollVotes) * 100);
                    const isMine = selectedPollId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleVotePoll(opt.id)}
                        className={`w-full text-left border p-3.5 relative overflow-hidden cursor-pointer transition-colors ${
                          isMine
                            ? 'border-[#1d1d1f] bg-white'
                            : 'border-neutral-300 bg-white hover:border-[#1d1d1f]'
                        }`}
                      >
                        {selectedPollId && (
                          <div
                            className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                              isMine ? 'bg-[#FFCC00]/55' : 'bg-neutral-200/65'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        )}
                        <div className="relative z-10 flex items-center justify-between gap-2 text-xs sm:text-sm">
                          <span className="font-extrabold text-[#1d1d1f]">{opt.label}</span>
                          {selectedPollId ? (
                            <span className="font-mono-tabular font-bold text-[#1d1d1f]">
                              {pct}% ({votes})
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-[#1B6CFF]">Vote</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Delivery Matcher Widget */}
              <div className="border border-neutral-200 bg-white p-6 space-y-4">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-widest text-[#6b6b70]">
                    Quick Service Matcher
                  </span>
                  <h3 className="font-extrabold text-lg text-[#1d1d1f] mt-1">
                    Match your parcel to the right Metro Parcel Service tier
                  </h3>
                </div>

                <div className="grid sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="font-bold text-[#6b6b70] block mb-1.5">1. Parcel Type</span>
                    <div className="space-y-1.5">
                      {(['Fragile Craft', 'Urgent Docs', 'Multi-Box Order'] as const).map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setMatcherItem(item)}
                          className={`w-full text-left px-3 py-2 border font-bold cursor-pointer ${
                            matcherItem === item
                              ? 'bg-[#1d1d1f] text-[#FFCC00] border-[#1d1d1f]'
                              : 'bg-[#f2f2f2] text-[#1d1d1f] border-neutral-200'
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="font-bold text-[#6b6b70] block mb-1.5">2. Timing</span>
                    <div className="space-y-1.5">
                      {(['Today', 'Tomorrow AM', 'Flexible'] as const).map((spd) => (
                        <button
                          key={spd}
                          type="button"
                          onClick={() => setMatcherSpeed(spd)}
                          className={`w-full text-left px-3 py-2 border font-bold cursor-pointer ${
                            matcherSpeed === spd
                              ? 'bg-[#1d1d1f] text-[#FFCC00] border-[#1d1d1f]'
                              : 'bg-[#f2f2f2] text-[#1d1d1f] border-neutral-200'
                          }`}
                        >
                          {spd}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="font-bold text-[#6b6b70] block mb-1.5">3. Handover</span>
                    <div className="space-y-1.5">
                      {(['Doorstep', 'Smart Locker'] as const).map((drop) => (
                        <button
                          key={drop}
                          type="button"
                          onClick={() => setMatcherDrop(drop)}
                          className={`w-full text-left px-3 py-2 border font-bold cursor-pointer ${
                            matcherDrop === drop
                              ? 'bg-[#1d1d1f] text-[#FFCC00] border-[#1d1d1f]'
                              : 'bg-[#f2f2f2] text-[#1d1d1f] border-neutral-200'
                          }`}
                        >
                          {drop}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-[#FFF6CC] border border-[#1d1d1f] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#1d1d1f]/75 block">
                      Recommended: {matcherRecommendation.eta}
                    </span>
                    <p className="font-extrabold text-base text-[#1d1d1f]">
                      {matcherRecommendation.tier}
                    </p>
                    <p className="text-xs text-[#1d1d1f]/80 mt-0.5">{matcherRecommendation.note}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onNavigate(matcherItem === 'Multi-Box Order' ? 'business' : 'contact')
                    }
                    className="px-4 py-2.5 bg-[#1d1d1f] text-[#FFCC00] text-xs font-extrabold whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {matcherItem === 'Multi-Box Order' ? 'Explore Business →' : 'Ask Operations →'}
                  </button>
                </div>
              </div>
            </div>

            {/* Right 6 cols: Community Appreciation & Experience Wall */}
            <div className="lg:col-span-6 border border-neutral-200 bg-[#f2f2f2] p-6 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-widest text-[#1B6CFF]">
                    Community Voices
                  </span>
                  <h2 className="font-display text-2xl text-[#1d1d1f] mt-1">
                    Share your Metro Parcel Service experience
                  </h2>
                </div>
                <MessageSquarePlus className="w-6 h-6 text-[#1d1d1f] shrink-0" />
              </div>

              <form onSubmit={handleAddCommunityNote} className="bg-white border border-neutral-200 p-4 space-y-3 text-xs">
                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Your name *"
                    value={noteForm.author}
                    onChange={(e) => setNoteForm((f) => ({ ...f, author: e.target.value }))}
                    className="border border-neutral-300 px-3 py-2 focus:outline-none focus:border-[#1d1d1f]"
                  />
                  <input
                    type="text"
                    placeholder="City (e.g. Manchester)"
                    value={noteForm.city}
                    onChange={(e) => setNoteForm((f) => ({ ...f, city: e.target.value }))}
                    className="border border-neutral-300 px-3 py-2 focus:outline-none focus:border-[#1d1d1f]"
                  />
                </div>
                <textarea
                  rows={2}
                  required
                  placeholder="Share how our couriers, lockers, or live tracking helped your delivery..."
                  value={noteForm.text}
                  onChange={(e) => setNoteForm((f) => ({ ...f, text: e.target.value }))}
                  className="w-full border border-neutral-300 px-3 py-2 focus:outline-none focus:border-[#1d1d1f]"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {noteFeedback ? (
                    <span className="text-[#008a39] font-bold">{noteFeedback}</span>
                  ) : (
                    <span className="text-[#6b6b70]">Posts instantly to the community feed</span>
                  )}
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#1d1d1f] text-[#FFCC00] font-extrabold cursor-pointer hover:bg-black"
                  >
                    Post Shoutout
                  </button>
                </div>
              </form>

              <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                {communityNotes.map((note: (typeof INITIAL_COMMUNITY_NOTES)[number]) => (
                  <div key={note.id} className="bg-white border border-neutral-200 p-4 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-extrabold text-[#1d1d1f]">
                        {note.author} · <span className="font-normal text-[#6b6b70]">{note.city}</span>
                      </span>
                      <span className="text-[11px] font-mono-tabular text-neutral-400">
                        {note.time}
                      </span>
                    </div>
                    <p className="text-sm text-[#1d1d1f] leading-relaxed">{note.text}</p>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#1B6CFF] block">
                      {note.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PHOTO STORY LIGHTBOX MODAL */}
      {lightboxStory && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxStory(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white border-2 border-[#1d1d1f] shadow-[8px_8px_0_#1d1d1f] max-w-3xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-[#1d1d1f]">
              <img
                src={lightboxStory.image}
                alt={lightboxStory.title}
                referrerPolicy="no-referrer"
                className="w-full max-h-[56vh] object-cover"
              />
              <button
                type="button"
                onClick={() => setLightboxStory(null)}
                aria-label="Close story preview"
                className="absolute top-3 right-3 w-10 h-10 bg-[#1d1d1f] text-[#FFCC00] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const idx = GALLERY_STORIES.findIndex((s) => s.id === lightboxStory.id);
                  const prev = GALLERY_STORIES[(idx - 1 + GALLERY_STORIES.length) % GALLERY_STORIES.length];
                  setLightboxStory(prev);
                }}
                aria-label="Previous story"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-[#1d1d1f]/85 text-white hover:text-[#FFCC00] flex items-center justify-center cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const idx = GALLERY_STORIES.findIndex((s) => s.id === lightboxStory.id);
                  const next = GALLERY_STORIES[(idx + 1) % GALLERY_STORIES.length];
                  setLightboxStory(next);
                }}
                aria-label="Next story"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-[#1d1d1f]/85 text-white hover:text-[#FFCC00] flex items-center justify-center cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#1B6CFF]">
                  {lightboxStory.num} · {lightboxStory.group} · {lightboxStory.location}
                </span>
                <span className="text-xs font-mono-tabular text-[#6b6b70]">
                  {storyLikes[lightboxStory.id] ?? lightboxStory.defaultLikes} likes
                </span>
              </div>
              <h3 className="font-display text-2xl text-[#1d1d1f]">{lightboxStory.title}</h3>
              <p className="text-sm text-[#1d1d1f]/85 leading-relaxed">{lightboxStory.detail}</p>
              <div className="pt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setLightboxStory(null);
                    onNavigate('track');
                  }}
                  className="px-5 py-2.5 bg-[#FFCC00] text-[#1d1d1f] font-extrabold text-xs cursor-pointer hover:bg-[#1d1d1f] hover:text-[#FFCC00]"
                >
                  Track a Parcel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLightboxStory(null);
                    onNavigate('contact');
                  }}
                  className="px-5 py-2.5 border border-[#1d1d1f] text-[#1d1d1f] font-bold text-xs cursor-pointer hover:bg-[#f2f2f2]"
                >
                  Contact Our Team
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
