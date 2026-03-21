"use client";

import { useState } from "react";

import { BackButton } from "../components/back-button";
import type { CollectedData, OnboardingStep } from "@/types/onboarding";

interface Props {
  data: CollectedData;
  advance: (step: OnboardingStep, updates: Partial<CollectedData>) => void;
  goBack: () => void | Promise<void>;
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
  Law: ["Law", "International Relations", "Political Science", "Public Policy"],
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

export function InterestPhase({ data, advance, goBack }: Props) {
  const [selected, setSelected] = useState<string[]>(data.interests ?? []);
  const [expandedClusters, setExpandedClusters] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");

  const isEn = (data.language ?? "en") === "en";

  const toggle = (item: string) => {
    setSelected((prev) =>
      prev.includes(item)
        ? prev.filter((entry) => entry !== item)
        : prev.length < 3
        ? [...prev, item]
        : prev
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

  const toggleCluster = (cluster: string) => {
    setExpandedClusters((prev) =>
      prev.includes(cluster)
        ? prev.filter((entry) => entry !== cluster)
        : [...prev, cluster]
    );
  };

  return (
    <section className="w-full max-w-3xl px-6">
      <div className="ei-card ei-card--static border-white/10 bg-white/[0.04] p-6 sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <BackButton
            label={isEn ? "Back" : "ย้อนกลับ"}
            onClick={() => {
              void goBack();
            }}
          />
          <div className="text-center">
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
          <div className="w-[72px]" aria-hidden="true" />
        </div>

        <div className="grid grid-cols-1 gap-3">
          {Object.keys(CLUSTERS).map((cluster) => {
            const isExpanded = expandedClusters.includes(cluster);

            return (
              <div
                key={cluster}
                className="ei-card overflow-hidden border-white/10 bg-white/[0.03]"
              >
                <button
                  type="button"
                  onClick={() => toggleCluster(cluster)}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <span className="text-2xl">{CLUSTER_ICONS[cluster]}</span>
                  <span className="flex-1 text-sm font-medium text-white/90">
                    {cluster}
                  </span>
                  <span className="text-sm text-white/45">
                    {isExpanded ? "−" : "+"}
                  </span>
                </button>
                {isExpanded ? (
                  <div className="flex flex-wrap gap-2 border-t border-white/8 px-4 py-4">
                    {CLUSTERS[cluster].map((item) => {
                      const isSelected = selected.includes(item);

                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggle(item)}
                          className={[
                            "rounded-full border px-3 py-2 text-sm",
                            isSelected
                              ? "border-orange-300/60 bg-orange-300/15 text-white"
                              : "border-white/10 bg-white/[0.03] text-white/75",
                          ].join(" ")}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

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
            placeholder={
              isEn ? "Type something else..." : "พิมพ์สิ่งที่สนใจเพิ่มเติม..."
            }
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-orange-300/55 focus:outline-none"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!customInput.trim() || selected.length >= 3}
            className="rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-white/80 disabled:cursor-not-allowed disabled:opacity-35"
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
                className="rounded-full border border-orange-300/40 bg-orange-300/12 px-3 py-1.5 text-xs font-medium text-orange-100"
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
