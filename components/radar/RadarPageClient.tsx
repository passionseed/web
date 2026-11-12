"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getRadarFields, getRadarCollections } from "@/lib/supabase/radar";
import { normalizeRadarCollections } from "@/lib/radar/filters";
import type { Database } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { getCareerCardVisual } from "@/lib/radar/card-visuals";

// Moved to lib so the field page can import it without this client bundle (spec 2.9).
export { getCareerCardVisual };

type RadarField = Database["public"]["Tables"]["radar_fields"]["Row"];
type RadarCollection = Database["public"]["Tables"]["radar_collections"]["Row"];
type RadarCardStyle = CSSProperties & Record<`--radar-${string}`, string>;

const CAREER_SEARCH_TAGS = [
  {
    key: "technology",
    label: "Technology",
    keywords: [
      "technology",
      "tech",
      "software",
      "developer",
      "programmer",
      "computer",
      "data",
      "ai",
      "cyber",
      "security",
      "it",
      "digital",
      "stem",
      "engineering",
      "engineer",
      "mechanical",
      "เทคโนโลยี",
      "ซอฟต์แวร์",
      "คอมพิวเตอร์",
      "ข้อมูล",
      "ไซเบอร์",
      "วิศวกร",
    ],
  },
  {
    key: "business",
    label: "Business",
    keywords: [
      "business",
      "marketing",
      "market",
      "sales",
      "finance",
      "account",
      "accounting",
      "management",
      "strategy",
      "operations",
      "product manager",
      "entrepreneur",
      "ธุรกิจ",
      "การตลาด",
      "บัญชี",
      "การเงิน",
      "ผู้จัดการ",
    ],
  },
  {
    key: "law",
    label: "Law",
    keywords: ["law", "legal", "lawyer", "attorney", "compliance", "policy", "กฎหมาย", "ทนาย"],
  },
  {
    key: "art",
    label: "Art",
    keywords: [
      "art",
      "artist",
      "creative",
      "design",
      "designer",
      "fashion",
      "model",
      "modeling",
      "fashion model",
      "animation",
      "film",
      "media",
      "content",
      "music",
      "ศิลปะ",
      "สร้างสรรค์",
      "ออกแบบ",
      "แฟชั่น",
      "นางแบบ",
      "นายแบบ",
      "คอนเทนต์",
    ],
  },
  {
    key: "medical",
    label: "Medical",
    keywords: [
      "medical",
      "medicine",
      "health",
      "healthcare",
      "doctor",
      "nurse",
      "clinical",
      "hospital",
      "pharma",
      "biotech",
      "lab",
      "แพทย์",
      "สุขภาพ",
      "พยาบาล",
      "โรงพยาบาล",
      "คลินิก",
    ],
  },
  {
    key: "engineer",
    label: "Engineer",
    keywords: [
      "engineer",
      "engineering",
      "mechanical",
      "civil",
      "electrical",
      "industrial",
      "software engineer",
      "qa",
      "test engineer",
      "วิศวกร",
      "วิศวกรรม",
    ],
  },
] as const;

function getCareerLabels(field: RadarField) {
  const english = field.name_en
    ?.replace(/\s*\([^)]*[\u0E00-\u0E7F][^)]*\)\s*/g, " ")
    .trim();
  const thaiInParentheses = field.name_th?.match(/\(([^)]*[\u0E00-\u0E7F][^)]*)\)/)?.[1];
  const primary = english || thaiInParentheses || field.name_th || "Career path";
  const secondary = thaiInParentheses || field.name_th || field.slug;

  return {
    primary,
    secondary: secondary === primary ? field.slug : secondary,
  };
}

function getCareerSearchText(field: RadarField) {
  return [
    field.slug,
    field.name_en,
    field.name_th,
    field.tagline_en,
    field.tagline_th,
    ...(field.tags || []),
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLocaleLowerCase();
}

function normalizeCareerKeywordText(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/[-_/]+/g, " ")
    .replace(/[^a-z0-9\u0E00-\u0E7F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasThaiText(value: string) {
  return /[\u0E00-\u0E7F]/.test(value);
}

function matchesCareerKeyword(searchText: string, keyword: string) {
  const normalizedKeyword = normalizeCareerKeywordText(keyword);
  if (!normalizedKeyword) return false;

  if (hasThaiText(normalizedKeyword)) {
    return searchText.includes(normalizedKeyword);
  }

  return ` ${normalizeCareerKeywordText(searchText)} `.includes(` ${normalizedKeyword} `);
}

function getCareerSearchTags(field: RadarField) {
  const searchText = getCareerSearchText(field);
  return CAREER_SEARCH_TAGS.filter((tag) =>
    tag.keywords.some((keyword) => matchesCareerKeyword(searchText, keyword))
  );
}

function filterFieldsByCareerTags(
  fields: RadarField[],
  activeTag: string | null,
  searchQuery: string
) {
  const query = searchQuery.trim().toLocaleLowerCase();

  return fields.filter((field) => {
    const searchTags = getCareerSearchTags(field);
    if (activeTag && !searchTags.some((tag) => tag.key === activeTag)) return false;
    if (!query) return true;

    return (
      getCareerSearchText(field).includes(query) ||
      searchTags.some((tag) => tag.label.toLocaleLowerCase().includes(query))
    );
  });
}

export function RadarPageClient({
  initialFields,
  initialCollections,
  initialError = null,
  fromPlan = false,
}: {
  initialFields: RadarField[];
  initialCollections: RadarCollection[];
  initialError?: string | null;
  /** Arrived from the My Path wizard — field pages then offer the plan decision. */
  fromPlan?: boolean;
}) {
  const router = useRouter();
  const [fields, setFields] = useState<RadarField[]>(initialFields);
  const [collections, setCollections] =
    useState<RadarCollection[]>(initialCollections);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad] = useState(!initialFields.length);
  const [error, setError] = useState<string | null>(initialError);
  const pageRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardGridRef = useRef<HTMLDivElement>(null);
  const { allLabel } = useMemo(
    () => normalizeRadarCollections(collections),
    [collections]
  );

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [fieldsData, collectionsData] = await Promise.all([
        getRadarFields(),
        getRadarCollections(),
      ]);
      setFields(fieldsData);
      setCollections(collectionsData);
      setActiveCollection(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCollectionClick = useCallback((key: string | null) => {
    setActiveCollection(key);
    setError(null);
  }, []);

  const filteredFields = useMemo(
    () => filterFieldsByCareerTags(fields, activeCollection, searchQuery),
    [fields, activeCollection, searchQuery]
  );
  const fieldBatches = useMemo(() => {
    const batches: RadarField[][] = [];
    for (let index = 0; index < filteredFields.length; index += 12) {
      batches.push(filteredFields.slice(index, index + 12));
    }
    return batches;
  }, [filteredFields]);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;

    const isSafari =
      navigator.vendor.includes("Apple") &&
      !/(CriOS|FxiOS|EdgiOS|OPiOS)/.test(navigator.userAgent);
    if (!isSafari) return;

    page.classList.add("radar-index-page--safari");
    return () => {
      page.classList.remove("radar-index-page--safari");
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const grid = cardGridRef.current;
    if (!grid) return;

    const touchQuery = window.matchMedia("(hover: none)");
    if (!touchQuery.matches) return;

    const cards = Array.from(
      grid.querySelectorAll<HTMLElement>(".radar-career-card")
    );
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("in-view", entry.isIntersecting);
          if (entry.isIntersecting) {
            const href = (entry.target as HTMLElement).dataset.radarHref;
            if (href) router.prefetch(href);
          }
        });
      },
      {
        rootMargin: "-38% 0px -38% 0px",
        threshold: 0,
      }
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [filteredFields, router]);

  return (
    <div ref={pageRef} className="radar-index-page min-h-screen">
      <div className="radar-index-hero relative overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8 md:pt-20 md:pb-10">
          <div className="mb-6 flex flex-wrap gap-2">
            <Link href="/radar" className="faculty-radar-mode faculty-radar-mode--active">
              Career Radar
            </Link>
            <Link href="/faculty-radar" className="faculty-radar-mode">
              Faculty Gallery
            </Link>
          </div>
          <h1 className="mb-4 font-radar-title text-5xl font-normal leading-none tracking-normal text-white sm:text-6xl md:text-7xl lg:text-8xl">
            Career Radar
          </h1>
          <p className="max-w-2xl font-radar-thai text-lg font-medium leading-relaxed text-white/85 sm:text-xl md:text-2xl">
            สำรวจสายอาชีพ ค้นหาสิ่งที่ใช่ และมองเห็นทิศทางของตัวเอง
            เลื่อนดูการ์ดเพื่อทำความรู้จักแต่ละเส้นทาง
          </p>
        </div>
      </div>

      <div className="radar-filter-shell relative z-30 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
              <Input
                placeholder="Search fields..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="ค้นหาอาชีพ"
                className="pl-10 border-white/[0.12] bg-white/[0.06] text-white placeholder:text-white/40 focus:border-emerald-300/50 focus:ring-emerald-300/20"
              />
            </div>

            <div className="relative min-w-0 w-full sm:flex-1">
              <div
                ref={scrollRef}
                role="group"
                aria-label="กรองอาชีพ"
                className="radar-filter-chips flex min-w-0 gap-2 overflow-x-auto py-1 pr-8"
              >
                <button
                  onClick={() => handleCollectionClick(null)}
                  aria-pressed={activeCollection === null}
                  className={`shrink-0 min-h-11 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/70 ${
                    activeCollection === null
                      ? "border border-emerald-200/[0.36] bg-emerald-200/[0.16] text-emerald-50"
                      : "border border-white/10 bg-white/5 text-white/[0.62] hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {allLabel}
                </button>
                {CAREER_SEARCH_TAGS.map((tag) => (
                  <button
                    key={tag.key}
                    onClick={() => handleCollectionClick(tag.key)}
                    aria-pressed={activeCollection === tag.key}
                    className={`shrink-0 min-h-11 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/70 ${
                      activeCollection === tag.key
                        ? "border border-emerald-200/[0.36] bg-emerald-200/[0.16] text-emerald-50"
                        : "border border-white/10 bg-white/5 text-white/[0.62] hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="radar-card-stage">
        <div className="max-w-7xl mx-auto px-4 pb-8 pt-8 sm:px-6 lg:px-8">
          {isLoading && isInitialLoad ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-xl bg-white/5 border border-white/10 h-48"
                />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-400 mb-4">{error}</p>
              <Button
                variant="outline"
                onClick={loadData}
                className="border-white/10 text-white hover:bg-white/10"
              >
                Try Again
              </Button>
            </div>
          ) : filteredFields.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-neutral-400 text-lg">
                No fields found. Try a different filter or search term.
              </p>
            </div>
          ) : (
            <div
              ref={cardGridRef}
              className={`radar-career-batches flex flex-col gap-4 transition-opacity duration-200 ${isLoading ? "pointer-events-none opacity-60" : ""}`}
            >
              {fieldBatches.map((batch, batchIndex) => (
                <div
                  key={batch[0]?.id ?? batchIndex}
                  className="radar-career-batch"
                >
                  <div className="radar-career-grid">
                    {batch.map((field) => (
                      <FieldTile
                        key={field.id}
                        field={field}
                        fromPlan={fromPlan}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const FieldTile = memo(function FieldTile({
  field,
  fromPlan = false,
}: {
  field: RadarField;
  fromPlan?: boolean;
}) {
  const fieldHref = `/radar/${field.slug}${fromPlan ? "?from=plan" : ""}`;
  const visual = getCareerCardVisual(field);
  const labels = getCareerLabels(field);
  const primaryLabel = labels.primary;
  const secondaryLabel = labels.secondary;
  const tags: string[] = getCareerSearchTags(field)
    .map((tag) => tag.label)
    .slice(0, 2);
  if (tags.length === 0) tags.push("Career");
  const titleSize =
    primaryLabel.length > 42
      ? "text-lg sm:text-xl"
      : primaryLabel.length > 28
        ? "text-xl sm:text-2xl"
        : "text-2xl sm:text-[1.75rem]";
  const cardStyle: RadarCardStyle = {
    background: visual.background,
    color: visual.textColor,
    ...visual.dotStyle,
  };

  return (
    <Link
      href={fieldHref}
      prefetch={false}
      data-radar-href={fieldHref}
      className="radar-career-card group relative isolate block aspect-[4/5] w-full cursor-pointer overflow-visible rounded-lg text-left shadow-[0_18px_50px_rgba(0,0,0,0.28)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60 sm:aspect-[3/5]"
      style={cardStyle}
    >
      <span className="radar-career-card__grain" aria-hidden="true" />

      <span className="radar-career-card__figure" aria-hidden="true">
        <Image
          src={visual.figure}
          alt=""
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 34vw, 25vw"
          loading="lazy"
          className="object-contain object-center"
          draggable={false}
        />
      </span>

      <span
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[62%]"
        style={{ background: visual.scrim }}
        aria-hidden="true"
      />

      <span
        className="absolute inset-x-0 bottom-0 z-[110] block p-4 sm:p-5"
        style={{ textShadow: visual.textShadow }}
      >
        <span
          className={`block break-words font-radar-title font-normal leading-[0.9] ${titleSize}`}
        >
          {primaryLabel}
        </span>
        <span className="mt-1 block line-clamp-2 font-radar-thai text-sm font-semibold leading-tight opacity-90">
          {secondaryLabel}
        </span>
        <span className={`mt-3 grid gap-1.5 ${tags.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {tags.map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className="min-w-0 truncate rounded-md border px-2 py-1 text-center font-mono text-xs font-bold"
              style={{
                borderColor: "currentColor",
                backgroundColor: visual.tagBackground,
              }}
            >
              {tag}
            </span>
          ))}
        </span>
      </span>
    </Link>
  );
});
