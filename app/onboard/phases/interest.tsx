"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import {
  Atom,
  Brain,
  Briefcase,
  Building2,
  Camera,
  Clapperboard,
  Code2,
  Cpu,
  Earth,
  FlaskConical,
  Gavel,
  Globe2,
  GraduationCap,
  HandHeart,
  HeartPulse,
  Landmark,
  Leaf,
  LineChart,
  Microscope,
  Music,
  Newspaper,
  Palette,
  PenLine,
  Plane,
  Rocket,
  Scale,
  Shield,
  Shirt,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Users,
  Utensils,
  Wand2,
  Wrench,
} from "lucide-react";

import { PhaseShell } from "../components/phase-shell";
import type { CollectedData, OnboardingStep } from "@/types/onboarding";

interface Props {
  data: CollectedData;
  advance: (step: OnboardingStep, updates: Partial<CollectedData>) => void;
  goBack: () => void | Promise<void>;
}

type Icon = ComponentType<LucideProps>;

type InterestItem = {
  id: string;
  labelEn: string;
  labelTh: string;
  icon: Icon;
};

type InterestCluster = {
  id: string;
  labelEn: string;
  labelTh: string;
  icon: Icon;
  items: InterestItem[];
};

const CLUSTERS: InterestCluster[] = [
  {
    id: "tech",
    labelEn: "Tech & Digital",
    labelTh: "เทคและดิจิทัล",
    icon: Cpu,
    items: [
      { id: "Software & Apps", labelEn: "Software & Apps", labelTh: "ซอฟต์แวร์และแอป", icon: Code2 },
      { id: "AI & Data", labelEn: "AI & Data", labelTh: "เอไอและข้อมูล", icon: Sparkles },
      { id: "Cybersecurity", labelEn: "Cybersecurity", labelTh: "ไซเบอร์ซีเคียวริตี้", icon: Shield },
      { id: "Games & Interactive", labelEn: "Games & Interactive", labelTh: "เกมและอินเทอร์แอคทีฟ", icon: Wand2 },
      { id: "Product & Platforms", labelEn: "Product & Platforms", labelTh: "ผลิตภัณฑ์และแพลตฟอร์ม", icon: Rocket },
    ],
  },
  {
    id: "design",
    labelEn: "Design & Making",
    labelTh: "ออกแบบและสร้างสรรค์",
    icon: Palette,
    items: [
      { id: "UX / UI Design", labelEn: "UX / UI Design", labelTh: "UX / UI", icon: Wand2 },
      { id: "Graphic & Brand", labelEn: "Graphic & Brand", labelTh: "กราฟิกและแบรนด์", icon: Palette },
      { id: "Architecture & Space", labelEn: "Architecture & Space", labelTh: "สถาปัตย์และพื้นที่", icon: Building2 },
      { id: "Fashion & Style", labelEn: "Fashion & Style", labelTh: "แฟชั่นและสไตล์", icon: Shirt },
      { id: "Industrial Design", labelEn: "Industrial Design", labelTh: "ออกแบบผลิตภัณฑ์", icon: Wrench },
    ],
  },
  {
    id: "business",
    labelEn: "Business & Money",
    labelTh: "ธุรกิจและการเงิน",
    icon: Briefcase,
    items: [
      { id: "Entrepreneurship", labelEn: "Entrepreneurship", labelTh: "ผู้ประกอบการ", icon: Rocket },
      { id: "Marketing & Brands", labelEn: "Marketing & Brands", labelTh: "การตลาดและแบรนด์", icon: TrendingUp },
      { id: "Finance & Investing", labelEn: "Finance & Investing", labelTh: "การเงินและการลงทุน", icon: Landmark },
      { id: "E‑commerce", labelEn: "E‑commerce", labelTh: "อีคอมเมิร์ซ", icon: ShoppingBag },
      { id: "Consulting & Strategy", labelEn: "Consulting & Strategy", labelTh: "ที่ปรึกษาและกลยุทธ์", icon: LineChart },
    ],
  },
  {
    id: "health",
    labelEn: "Health & Care",
    labelTh: "สุขภาพและการดูแล",
    icon: HeartPulse,
    items: [
      { id: "Medicine & Clinical", labelEn: "Medicine & Clinical", labelTh: "แพทย์และคลินิก", icon: Stethoscope },
      { id: "Mental Health", labelEn: "Mental Health", labelTh: "สุขภาพจิต", icon: Brain },
      { id: "Public Health", labelEn: "Public Health", labelTh: "สาธารณสุข", icon: HandHeart },
      { id: "Sports & Movement", labelEn: "Sports & Movement", labelTh: "กีฬาและการเคลื่อนไหว", icon: Users },
      { id: "Nutrition & Wellness", labelEn: "Nutrition & Wellness", labelTh: "โภชนาการและเวลเนส", icon: Leaf },
    ],
  },
  {
    id: "science",
    labelEn: "Science & Engineering",
    labelTh: "วิทยาศาสตร์และวิศวกรรม",
    icon: Microscope,
    items: [
      { id: "Engineering", labelEn: "Engineering", labelTh: "วิศวกรรม", icon: Wrench },
      { id: "Biology & Biotech", labelEn: "Biology & Biotech", labelTh: "ชีววิทยาและไบโอเทค", icon: FlaskConical },
      { id: "Environment & Climate", labelEn: "Environment & Climate", labelTh: "สิ่งแวดล้อมและภูมิอากาศ", icon: Earth },
      { id: "Physics & Research", labelEn: "Physics & Research", labelTh: "ฟิสิกส์และวิจัย", icon: Atom },
      { id: "Food & Agriculture", labelEn: "Food & Agriculture", labelTh: "อาหารและเกษตร", icon: Utensils },
    ],
  },
  {
    id: "media",
    labelEn: "Media & Story",
    labelTh: "สื่อและการเล่าเรื่อง",
    icon: Clapperboard,
    items: [
      { id: "Film & Video", labelEn: "Film & Video", labelTh: "ภาพยนตร์และวิดีโอ", icon: Clapperboard },
      { id: "Content Creation", labelEn: "Content Creation", labelTh: "ครีเอเตอร์คอนเทนต์", icon: Camera },
      { id: "Journalism", labelEn: "Journalism", labelTh: "สื่อสารมวลชน", icon: Newspaper },
      { id: "Music & Sound", labelEn: "Music & Sound", labelTh: "ดนตรีและเสียง", icon: Music },
      { id: "Writing & Narrative", labelEn: "Writing & Narrative", labelTh: "การเขียนและเล่าเรื่อง", icon: PenLine },
    ],
  },
  {
    id: "society",
    labelEn: "People & Society",
    labelTh: "คนและสังคม",
    icon: Scale,
    items: [
      { id: "Law & Justice", labelEn: "Law & Justice", labelTh: "กฎหมายและความยุติธรรม", icon: Gavel },
      { id: "Education & Teaching", labelEn: "Education & Teaching", labelTh: "การศึกษาและการสอน", icon: GraduationCap },
      { id: "Policy & Government", labelEn: "Policy & Government", labelTh: "นโยบายและภาครัฐ", icon: Landmark },
      { id: "International Affairs", labelEn: "International Affairs", labelTh: "กิจการระหว่างประเทศ", icon: Globe2 },
      { id: "Travel & Hospitality", labelEn: "Travel & Hospitality", labelTh: "ท่องเที่ยวและบริการ", icon: Plane },
    ],
  },
];

/** How long the interest buttons stay highlighted after "Next" is tapped with nothing picked. */
const NUDGE_MS = 1200;

const LABEL_BY_ID = new Map(
  CLUSTERS.flatMap((cluster) =>
    cluster.items.map((item) => [item.id, item] as const)
  )
);

export function InterestPhase({ data, advance, goBack }: Props) {
  const [selected, setSelected] = useState<string[]>(data.interests ?? []);
  const [customInput, setCustomInput] = useState("");
  // The Next button stays tappable with nothing picked: a greyed-out,
  // disabled button read as a broken page. Tapping it instead highlights the
  // interest buttons and scrolls them into view.
  const [nudging, setNudging] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!nudging) return;
    const timer = window.setTimeout(() => setNudging(false), NUDGE_MS);
    return () => window.clearTimeout(timer);
  }, [nudging]);

  const isEn = (data.language ?? "th") === "en";

  const next = () => {
    if (selected.length > 0) {
      advance("assessment", { interests: selected });
      return;
    }
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    listRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    setNudging(true);
  };

  const toggle = (itemId: string) => {
    setNudging(false);
    setSelected((prev) =>
      prev.includes(itemId)
        ? prev.filter((entry) => entry !== itemId)
        : [...prev, itemId]
    );
  };

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed || selected.includes(trimmed)) return;
    setSelected((prev) => [...prev, trimmed]);
    setCustomInput("");
  };

  const displayLabel = (id: string) => {
    const item = LABEL_BY_ID.get(id);
    if (!item) return id;
    return isEn ? item.labelEn : item.labelTh;
  };

  return (
    <PhaseShell
      wide
      eyebrow={isEn ? "Interests" : "ความสนใจ"}
      title={isEn ? "What are you interested in?" : "คุณสนใจด้านไหน?"}
      subtitle={
        isEn
          ? "Tap anything that pulls you. No limit."
          : "แตะได้ตามที่สนใจ ไม่จำกัดจำนวน"
      }
      backLabel={isEn ? "Back" : "ย้อนกลับ"}
      onBack={() => {
        void goBack();
      }}
      footer={
        <button
          type="button"
          onClick={next}
          aria-disabled={selected.length === 0}
          className="ei-button-dawn min-h-12 w-full justify-center py-3.5 text-base font-semibold aria-disabled:opacity-60 sm:min-h-0 sm:py-3 sm:text-sm"
        >
          {isEn
            ? selected.length > 0
              ? `Next · ${selected.length} selected`
              : "Pick at least one"
            : selected.length > 0
              ? `ถัดไป · เลือกแล้ว ${selected.length}`
              : "เลือกอย่างน้อย 1 อย่าง"}
        </button>
      }
    >
      <div ref={listRef} className="flex scroll-mt-4 flex-col gap-5">
        {CLUSTERS.map((cluster) => {
          const ClusterIcon = cluster.icon;
          return (
            <div key={cluster.id} className="space-y-2.5">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
                <ClusterIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {isEn ? cluster.labelEn : cluster.labelTh}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {cluster.items.map(({ id, labelEn, labelTh, icon: ItemIcon }) => {
                  const isSelected = selected.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggle(id)}
                      className={[
                        "inline-flex min-h-12 items-center gap-2.5 rounded-2xl border px-3.5 py-3 text-left text-sm transition-colors duration-300 active:scale-[0.99]",
                        isSelected
                          ? "border-blue-400/45 bg-blue-500/10 text-white"
                          : nudging
                            ? "border-blue-300/60 bg-blue-400/[0.08] text-white"
                            : "border-white/10 bg-white/[0.03] text-white/80",
                      ].join(" ")}
                    >
                      <ItemIcon
                        className={[
                          "h-4 w-4 shrink-0",
                          isSelected ? "text-blue-200" : "text-white/45",
                        ].join(" ")}
                        aria-hidden="true"
                      />
                      <span className="leading-snug">
                        {isEn ? labelEn : labelTh}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex gap-2">
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
            isEn ? "Type something else..." : "พิมพ์สิ่งที่สนใจเพิ่ม..."
          }
          className="min-h-12 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-base text-white placeholder:text-white/30 focus:border-blue-400/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!customInput.trim()}
          className="min-h-12 min-w-12 rounded-xl border border-white/10 text-lg font-medium text-white/80 disabled:cursor-not-allowed disabled:opacity-35"
        >
          +
        </button>
      </div>

      {selected.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {selected.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => toggle(item)}
              className="min-h-9 rounded-full border border-blue-400/35 bg-blue-500/10 px-3 text-xs font-medium text-white/85"
            >
              {displayLabel(item)} ×
            </button>
          ))}
        </div>
      ) : null}
    </PhaseShell>
  );
}
