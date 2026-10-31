"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { OPEN_STATUS_FILTER, openStatusCount } from "@/lib/admin/queue-tools/dm-leads";
import { cn } from "@/lib/utils";

export const DM_LEAD_SEARCH_INPUT_ID = "dm-lead-search";

export interface DmLeadFilterValues {
  stage: string;
  grade: string;
  intent: string;
  platform: string;
  status: string;
  tag: string;
  sort: string;
  search: string;
  /** Toggle chips: an empty string means off. */
  turn: string;
  link: string;
  star: string;
  followup: string;
}

export interface DmLeadChipCounts {
  needsReply: number;
  pathlabSent: number;
  starred: number;
  followUpDue: number;
}

const STAGE_OPTIONS = [
  { value: "unknown", label: "Unknown" },
  { value: "exploring", label: "Exploring" },
  { value: "building", label: "Building" },
  { value: "job_seeking", label: "Job seeking" },
];

const GRADE_OPTIONS = [
  { value: "ม.3", label: "ม.3" },
  { value: "ม.4", label: "ม.4" },
  { value: "ม.5", label: "ม.5" },
  { value: "ม.6", label: "ม.6" },
  { value: "ปี 1", label: "ปี 1" },
  { value: "none", label: "ไม่ทราบชั้น" },
];

const INTENT_OPTIONS = [
  { value: "pay_ready", label: "🔥 พร้อมสมัคร" },
  { value: "pathlab", label: "อยากลอง PathLab" },
  { value: "community", label: "อยากเข้า Community" },
  { value: "talent", label: "หางาน/ฝึกงาน" },
  { value: "hands_on", label: "มีผลงานแล้ว" },
];

const PLATFORM_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
];

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
  { value: "spam", label: "Spam" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "ล่าสุดก่อน" },
  { value: "waiting", label: "ค้างตอบนานสุด" },
  { value: "propensity", label: "🎯 โอกาสปิดการขายสูงสุด (ML)" },
  { value: "engagement", label: "⚡ คะแนน Engagement (RFM-E)" },
];

const TOGGLE_CHIPS: {
  key: "turn" | "link" | "star" | "followup";
  value: string;
  label: string;
  countKey: keyof DmLeadChipCounts;
  activeClass: string;
}[] = [
  {
    key: "turn",
    value: "mine",
    label: "รอเราตอบ",
    countKey: "needsReply",
    activeClass: "border-amber-500 bg-amber-500 text-white",
  },
  {
    key: "link",
    value: "pathlab",
    label: "📨 ส่ง PathLab แล้ว",
    countKey: "pathlabSent",
    activeClass: "border-emerald-500 bg-emerald-500 text-white",
  },
  {
    key: "star",
    value: "1",
    label: "⭐ ติดดาว",
    countKey: "starred",
    activeClass: "border-amber-400 bg-amber-400 text-white",
  },
  {
    key: "followup",
    value: "due",
    label: "⏰ ถึงกำหนดติดตาม",
    countKey: "followUpDue",
    activeClass: "border-red-500 bg-red-500 text-white",
  },
];

const SELECT_KEYS = ["stage", "grade", "intent", "platform", "status", "tag", "sort"];
const CHIP_KEYS = ["turn", "link", "star", "followup"];

interface DmLeadFiltersProps {
  values: DmLeadFilterValues;
  chipCounts?: DmLeadChipCounts;
  stageCounts?: Record<string, number>;
  /** Live counts per lead status, shown inside the status options. */
  statusCounts?: Record<string, number>;
  /** Distinct admin tags in the current set, with counts, for the tag options. */
  tagCounts?: Record<string, number>;
}

/**
 * The single filter row for the DM leads inbox: toggle chips, search, and
 * dropdowns. Writes every change to the URL so the server component
 * re-queries and filters stay shareable.
 */
export function DmLeadFilters({
  values,
  chipCounts,
  stageCounts,
  statusCounts,
  tagCounts,
}: DmLeadFiltersProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localValues, setLocalValues] = useState<DmLeadFilterValues>(values);
  const [search, setSearch] = useState(values.search);
  const isFirstRender = useRef(true);
  /** The search text this bar last wrote to the URL, until the server echoes it. */
  const pushedSearch = useRef<string | null>(null);

  // Take the applied filters from the server after each navigation. Keyed on
  // the values, not the object, so a refresh with the same filters is a no-op.
  // The echo of our own debounced search is skipped, so a slow response cannot
  // overwrite what is still being typed.
  const valuesKey = JSON.stringify(values);
  useEffect(() => {
    setLocalValues(values);
    if (values.search !== pushedSearch.current) setSearch(values.search);
    pushedSearch.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valuesKey]);

  const pushParams = (patch: Partial<DmLeadFilterValues>) => {
    const updated = { ...localValues, ...patch };
    setLocalValues(updated);

    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(patch)) {
      if (value && value !== "all" && !(key === "sort" && value === "newest")) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    const qs = params.toString();
    const url = qs ? `/admin/dm-leads?${qs}` : "/admin/dm-leads";

    startTransition(() => {
      router.replace(url, { scroll: false });
    });
  };

  // Debounce search → URL. Skip the initial mount so we don't loop.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Already applied (for example, synced from the server): nothing to push.
    if (search === (new URLSearchParams(window.location.search).get("search") ?? "")) return;
    const timer = setTimeout(() => {
      pushedSearch.current = search;
      pushParams({ search });
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const hasActiveFilters =
    SELECT_KEYS.some((k) => {
      const v = localValues[k as keyof DmLeadFilterValues] as string;
      return k === "sort" ? v !== "newest" : v !== "all";
    }) ||
    localValues.search !== "" ||
    CHIP_KEYS.some((k) => localValues[k as keyof DmLeadFilterValues] !== "");

  const clearAll = () => {
    const cleared: DmLeadFilterValues = {
      stage: "all",
      grade: "all",
      intent: "all",
      platform: "all",
      status: "all",
      tag: "all",
      sort: "newest",
      search: "",
      turn: "",
      link: "",
      star: "",
      followup: "",
    };
    setLocalValues(cleared);
    setSearch("");
    const params = new URLSearchParams(window.location.search);
    for (const key of [...SELECT_KEYS, ...CHIP_KEYS, "search"]) params.delete(key);
    const qs = params.toString();
    const url = qs ? `/admin/dm-leads?${qs}` : "/admin/dm-leads";
    startTransition(() => {
      router.replace(url, { scroll: false });
    });
  };

  return (
    <div className="relative flex flex-wrap items-center gap-1.5">
      {isPending && (
        <div className="absolute -top-1.5 left-0 right-0 h-0.5 animate-pulse bg-primary/60 rounded-full z-10" />
      )}
      {TOGGLE_CHIPS.map((chip) => {
        const active = localValues[chip.key] === chip.value;
        const count = chipCounts?.[chip.countKey];
        return (
          <button
            key={chip.key}
            type="button"
            onClick={() => pushParams({ [chip.key]: active ? "" : chip.value })}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs transition-all cursor-pointer active:scale-95",
              active
                ? cn(chip.activeClass, "font-medium shadow-sm")
                : "text-muted-foreground hover:border-foreground/40 hover:text-foreground"
            )}
          >
            {active ? "✓ " : ""}
            {chip.label}
            {count !== undefined && (
              <span className="ml-1 text-[10px] opacity-70">{count}</span>
            )}
          </button>
        );
      })}

      <span className="mx-0.5 text-border">|</span>

      <div className="relative flex items-center">
        <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          id={DM_LEAD_SEARCH_INPUT_ID}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อหรือ @username… ( / )"
          className="h-8 w-40 pl-7 pr-6 text-xs"
        />
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              pushParams({ search: "" });
            }}
            className="absolute right-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <Select value={localValues.stage} onValueChange={(v) => pushParams({ stage: v })}>
        <SelectTrigger className="h-8 w-32 text-xs">
          <SelectValue placeholder="Stage" />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="all">ทุก stage</SelectItem>
          {STAGE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
              {stageCounts?.[o.value] !== undefined ? ` (${stageCounts[o.value]})` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={localValues.grade} onValueChange={(v) => pushParams({ grade: v })}>
        <SelectTrigger className="h-8 w-28 text-xs">
          <SelectValue placeholder="ชั้นปี" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">ทุกชั้นปี</SelectItem>
          {GRADE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={localValues.intent} onValueChange={(v) => pushParams({ intent: v })}>
        <SelectTrigger className="h-8 w-36 text-xs">
          <SelectValue placeholder="ความต้องการ" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">ทุกความต้องการ</SelectItem>
          {INTENT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={localValues.platform} onValueChange={(v) => pushParams({ platform: v })}>
        <SelectTrigger className="h-8 w-28 text-xs">
          <SelectValue placeholder="แพลตฟอร์ม" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">ทุกแพลตฟอร์ม</SelectItem>
          {PLATFORM_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={localValues.status} onValueChange={(v) => pushParams({ status: v })}>
        <SelectTrigger className="h-8 w-28 text-xs">
          <SelectValue placeholder="สถานะ" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">ทุกสถานะ</SelectItem>
          <SelectItem value={OPEN_STATUS_FILTER}>
            Open (not closed)
            {statusCounts ? ` (${openStatusCount(statusCounts)})` : ""}
          </SelectItem>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
              {statusCounts?.[o.value] ? ` (${statusCounts[o.value]})` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {tagCounts && Object.keys(tagCounts).length > 0 && (
        <Select value={localValues.tag} onValueChange={(v) => pushParams({ tag: v })}>
          <SelectTrigger className="h-8 w-28 text-xs">
            <SelectValue placeholder="แท็ก" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกแท็ก</SelectItem>
            {Object.entries(tagCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([tag, count]) => (
                <SelectItem key={tag} value={tag}>
                  {tag} ({count})
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      )}

      <Select value={localValues.sort} onValueChange={(v) => pushParams({ sort: v })}>
        <SelectTrigger className="h-8 w-32 text-xs">
          <SelectValue placeholder="เรียงตาม" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>


      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearAll} className="h-8 gap-1 px-2 text-xs">
          <X className="h-3.5 w-3.5" /> ล้าง
        </Button>
      )}
    </div>
  );
}
