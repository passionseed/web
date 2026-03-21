"use client";

import { useState } from "react";

import type { CollectedData, OnboardingStep } from "@/types/onboarding";

interface Props {
  data: CollectedData;
  advance: (step: OnboardingStep, updates: Partial<CollectedData>) => void;
}

const CLUSTERS: Record<string, string[]> = {
  Technology: [
    "Computer Science",
    "Software Engineering",
    "Data Science",
    "AI / Machine Learning",
    "Cybersecurity",
    "Web Development",
  ],
  Design: [
    "UX/UI Design",
    "Graphic Design",
    "Product Design",
    "Architecture",
    "Fashion Design",
    "Film & Media",
  ],
  Business: [
    "Business Administration",
    "Marketing",
    "Finance",
    "Entrepreneurship",
    "Economics",
    "Accounting",
  ],
  Sciences: [
    "Medicine",
    "Biology",
    "Chemistry",
    "Physics",
    "Environmental Science",
    "Psychology",
  ],
  Arts: [
    "Fine Arts",
    "Music",
    "Theater",
    "Creative Writing",
    "Photography",
    "Animation",
  ],
  Law: [
    "Law",
    "International Relations",
    "Political Science",
    "Public Policy",
  ],
  Education: [
    "Teaching",
    "Educational Psychology",
    "Early Childhood",
    "Special Education",
  ],
};

const CLUSTER_ICONS: Record<string, string> = {
  Technology: "💻",
  Design: "🎨",
  Business: "📊",
  Sciences: "🔬",
  Arts: "🎭",
  Law: "⚖️",
  Education: "📚",
};

export function InterestPhase({ data, advance }: Props) {
  const [selected, setSelected] = useState<string[]>(data.interests ?? []);
  const [activeCluster, setActiveCluster] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState("");

  const isEn = (data.language ?? "en") === "en";

  const toggle = (item: string) => {
    setSelected((prev) =>
      prev.includes(item)
        ? prev.filter((entry) => entry !== item)
        : prev.length < 3
          ? [...prev, item]
          : prev,
    );
  };

  const addCustom = () => {
    const trimmed = customInput.trim();

    if (!trimmed || selected.includes(trimmed) || selected.length >= 3) {
      return;
    }

    setSelected((prev) => [...prev, trimmed]);
    setCustomInput("");
  };

  return (
    <section className="w-full max-w-3xl px-6">
      <div className="ei-card border-white/10 bg-white/[0.04] p-6 sm:p-8">
        <div className="mb-6 text-center">
          <p className="text-xs uppercase tracking-[0.24em] text-orange-200/65">
            {isEn ? "Interests" : "ความสนใจ"}
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
            {isEn ? "What are you interested in?" : "คุณสนใจด้านไหน?"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/60">
            {isEn
              ? "Pick up to 3. You do not need to be certain yet."
              : "เลือกได้สูงสุด 3 อย่าง ยังไม่ต้องแน่ใจ 100% ก็ได้"}
          </p>
        </div>

        {!activeCluster ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Object.keys(CLUSTERS).map((cluster) => (
              <button
                key={cluster}
                type="button"
                onClick={() => setActiveCluster(cluster)}
                className="ei-card flex items-center gap-3 border-white/10 bg-white/[0.03] p-4 text-left transition-all hover:border-orange-300/45 hover:bg-orange-400/5"
              >
                <span className="text-2xl">{CLUSTER_ICONS[cluster]}</span>
                <span className="text-sm font-medium text-white/90">
                  {cluster}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setActiveCluster(null)}
              className="self-start text-xs font-medium text-orange-200/80 transition-colors hover:text-orange-100"
            >
              ← {isEn ? "Back to categories" : "กลับไปหมวดหมู่"}
            </button>

            <div className="flex flex-wrap gap-2">
              {CLUSTERS[activeCluster].map((item) => {
                const isSelected = selected.includes(item);

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggle(item)}
                    className={[
                      "rounded-full border px-3 py-2 text-sm transition-all",
                      isSelected
                        ? "border-orange-300/60 bg-orange-300/15 text-white"
                        : "border-white/10 bg-white/[0.03] text-white/75 hover:border-white/30 hover:text-white",
                    ].join(" ")}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <input
            value={customInput}
            onChange={(event) => setCustomInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addCustom();
              }
            }}
            placeholder={isEn ? "Type something else..." : "พิมพ์สิ่งที่สนใจเพิ่มเติม..."}
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-orange-300/55 focus:outline-none"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!customInput.trim() || selected.length >= 3}
            className="rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-white/80 transition-all hover:border-orange-300/55 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            +
          </button>
        </div>

        {selected.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {selected.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => toggle(item)}
                className="rounded-full border border-orange-300/40 bg-orange-300/12 px-3 py-1.5 text-xs font-medium text-orange-100 transition-all hover:bg-orange-300/18"
              >
                {item} ×
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-8">
          <button
            type="button"
            onClick={() => advance("assessment", { interests: selected })}
            disabled={selected.length === 0}
            className="ei-button-dusk w-full justify-center py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isEn ? "Next" : "ถัดไป"} →
          </button>
        </div>
      </div>
    </section>
  );
}
