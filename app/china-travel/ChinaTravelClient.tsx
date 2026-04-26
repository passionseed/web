"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { MapPin, Search, X } from "lucide-react";
import { CHINA_LOCATIONS, type Location } from "./locations";
import LocationPanel from "./LocationPanel";

const ChinaMap = dynamic(() => import("./ChinaMap"), { ssr: false });

export default function ChinaTravelClient() {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return null; // null = show all on map
    return CHINA_LOCATIONS.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.chineseName.includes(q) ||
        l.province.toLowerCase().includes(q)
    );
  }, [search]);

  function handlePinClick(location: Location) {
    setSelectedLocation((prev) => (prev?.id === location.id ? null : location));
  }

  function handleClose() {
    setSelectedLocation(null);
  }

  return (
    <main className="min-h-screen bg-[#060d1a] text-white">
      {/* Hero */}
      <section className="relative pt-20 pb-8 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/10 rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.05, 0.7, 0.35, 0.99] }}
          className="relative"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium mb-4">
            <MapPin size={12} />
            <span>All AAAAA Scenic Areas · {CHINA_LOCATIONS.length} Destinations</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-br from-white via-blue-100 to-blue-300 bg-clip-text text-transparent">
            Discover China
          </h1>

          <p className="text-blue-200/60 text-lg max-w-xl mx-auto mb-6">
            Every AAAAA-rated scenic area in China — the highest national tourism designation.
          </p>

          {/* Search */}
          <div className="relative max-w-sm mx-auto">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400/50" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or province…"
              className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-blue-900/20 border border-blue-800/30 text-sm text-blue-100 placeholder:text-blue-500/40 focus:outline-none focus:border-blue-600/50 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400/50 hover:text-blue-300"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </motion.div>
      </section>

      {/* Search results dropdown */}
      {filtered && filtered.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 md:mx-8 mb-4 bg-[#0d1f3c] border border-blue-800/30 rounded-xl overflow-hidden max-h-52 overflow-y-auto"
        >
          {filtered.map((loc) => (
            <button
              key={loc.id}
              onClick={() => {
                setSelectedLocation(loc);
                setSearch("");
              }}
              className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-blue-800/20 transition-colors border-b border-blue-900/20 last:border-0"
            >
              <span className="text-lg">{loc.emoji}</span>
              <div>
                <p className="text-sm text-blue-100 font-medium">{loc.name}</p>
                <p className="text-xs text-blue-400/60">{loc.chineseName} · {loc.province}</p>
              </div>
            </button>
          ))}
        </motion.section>
      )}

      {filtered && filtered.length === 0 && search && (
        <p className="text-center text-blue-400/40 text-sm mb-4">No results for &quot;{search}&quot;</p>
      )}

      {/* Map */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="relative mx-4 md:mx-8 rounded-2xl overflow-hidden border border-blue-900/40 shadow-2xl"
        style={{ height: "70vh", minHeight: "420px" }}
      >
        <ChinaMap selectedId={selectedLocation?.id ?? null} onPinClick={handlePinClick} />
      </motion.section>

      <p className="text-center text-blue-400/40 text-xs mt-4 pb-8">
        Clusters expand as you zoom in · Click any pin to explore
      </p>

      <LocationPanel location={selectedLocation} onClose={handleClose} />
    </main>
  );
}
