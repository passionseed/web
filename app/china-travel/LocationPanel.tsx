"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, Clock, MapPin, Star } from "lucide-react";
import type { Location } from "./locations";

interface Props {
  location: Location | null;
  onClose: () => void;
}

// Generic China scenic area fallback images by category emoji
const FALLBACK_IMAGES: Record<string, string> = {
  "🏯": "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=600&q=80",
  "🧱": "https://images.unsplash.com/photo-1508804052814-cd3ba865a116?w=600&q=80",
  "⛰️": "https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=600&q=80",
  "🏔️": "https://images.unsplash.com/photo-1513415277900-a62401e19be4?w=600&q=80",
  "🏞️": "https://images.unsplash.com/photo-1505293994485-1c2d9a87dd7d?w=600&q=80",
  "🌸": "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&q=80",
  "🛕": "https://images.unsplash.com/photo-1569397288884-4d43d6738fbd?w=600&q=80",
  "🗿": "https://images.unsplash.com/photo-1508804052814-cd3ba865a116?w=600&q=80",
  "💧": "https://images.unsplash.com/photo-1505293994485-1c2d9a87dd7d?w=600&q=80",
  "🌊": "https://images.unsplash.com/photo-1505293994485-1c2d9a87dd7d?w=600&q=80",
};

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=600&q=80";

export default function LocationPanel({ location, onClose }: Props) {
  return (
    <AnimatePresence>
      {location && (
        <>
          {/* Backdrop (mobile) */}
          <motion.div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            className="fixed right-0 top-0 h-full w-full max-w-sm z-50 overflow-y-auto"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
          >
            <div className="ei-card h-full flex flex-col bg-[#0a1628]/95 backdrop-blur-md border-l border-blue-900/40">
              {/* Header image */}
              <div className="relative h-52 shrink-0 overflow-hidden">
                <img
                  src={FALLBACK_IMAGES[location.emoji] ?? DEFAULT_IMAGE}
                  alt={location.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628] via-transparent to-transparent" />

                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  aria-label="Close panel"
                >
                  <X size={16} />
                </button>

                {/* Location number badge */}
                <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm">
                  {location.id}
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-col gap-4 p-5 flex-1">
                {/* Title */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{location.emoji}</span>
                    <h2 className="text-xl font-bold text-white">{location.name}</h2>
                  </div>
                  <p className="text-blue-300/70 text-sm font-medium">
                    {location.chineseName} · <span className="text-blue-400/50">{location.province}</span>
                  </p>
                </div>

                {/* Best time */}
                <div className="flex items-center gap-2 text-sm text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  <Clock size={14} className="shrink-0" />
                  <span>
                    <span className="text-amber-300/60 mr-1">Best time:</span>
                    {location.bestTime}
                  </span>
                </div>

                {/* Description */}
                <p className="text-blue-100/80 text-sm leading-relaxed">{location.description}</p>

                {/* Highlights */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Star size={14} className="text-amber-400" />
                    <h3 className="text-xs font-semibold text-blue-300/70 uppercase tracking-wider">
                      Highlights
                    </h3>
                  </div>
                  <ul className="flex flex-col gap-2">
                    {location.highlights.map((h) => (
                      <li key={h} className="flex items-center gap-2 text-sm text-blue-100/70">
                        <MapPin size={12} className="shrink-0 text-orange-400/70" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
