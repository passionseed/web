"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowRight, ExternalLink, Instagram, MessageCircle, Pencil, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  CONTENT_WORK_ITEMS,
  FUNNEL_STAGES,
  filterContentIdeas,
  getStageMix,
  workItemToContentIdea,
  type ContentChannel,
  type ContentStatus,
  type FunnelOffer,
  type FunnelStage,
} from "@/lib/work/marketing-funnel";
import type { WorkItem } from "@/lib/work/work-items";

import { WorkItemEditor } from "./WorkItemEditor";
import { WorkPersistenceNotice } from "./WorkPersistenceNotice";
import { useWorkItems } from "./useWorkItems";
import styles from "./work.module.css";

type StageFilter = FunnelStage | "all";
type ChannelFilter = ContentChannel | "all";
type OfferFilter = FunnelOffer | "all";

const channelLabels: Record<ContentChannel, string> = { instagram: "Instagram", facebook: "Facebook", both: "IG + Facebook" };
const offerLabels: Record<FunnelOffer, string> = { techseed: "TechSeed", shift: "SHIFT", both: "Both offers" };
const stageLabels: Record<FunnelStage, string> = { tofu: "TOFU", mofu: "MOFU", bofu: "BOFU" };
const statusStyles: Record<ContentStatus, string> = {
  idea: "border-white/10 text-stone-400",
  draft: "border-sky-400/20 bg-sky-400/[0.06] text-sky-200/80",
  ready: "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200/80",
  published: "border-orange-300/25 bg-orange-300/[0.07] text-orange-200",
};
const weekPlan = [
  ["Mon", "Reach", "Portfolio Tier List", "TOFU"],
  ["Tue", "Listen", "Story poll + objection box", "Signal"],
  ["Wed", "Teach", "One project, three levels", "MOFU"],
  ["Thu", "Prove", "Student or mentor build clip", "MOFU"],
  ["Fri", "Convert", "Program fit + parent pack", "BOFU"],
] as const;

function FilterGroup<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <p className="mb-2 font-space-mono text-[9px] uppercase tracking-[0.16em] text-white/30">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)} className={`${styles.filterButton} ${value === option.value ? styles.filterButtonActive : ""}`}>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MarketingFunnelWorkspace() {
  const workspace = useWorkItems("marketing", CONTENT_WORK_ITEMS);
  const [stage, setStage] = useState<StageFilter>("all");
  const [channel, setChannel] = useState<ChannelFilter>("all");
  const [offer, setOffer] = useState<OfferFilter>("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WorkItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const ideas = useMemo(() => workspace.items.map(workItemToContentIdea), [workspace.items]);
  const filteredIdeas = useMemo(() => filterContentIdeas(ideas, stage, channel, offer), [ideas, stage, channel, offer]);
  const stageMix = getStageMix(ideas);
  const canEdit = workspace.state === "connected";

  function openEditor(item: WorkItem | null) {
    setActionError(null);
    setEditingItem(item);
    setEditorOpen(true);
  }

  async function changeStatus(id: string, status: ContentStatus) {
    setActionError(null);
    try {
      await workspace.update({ id, status });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not update the status.");
    }
  }

  return (
    <div className={styles.page}>
      <header>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={styles.eyebrow}>Work / Marketing / Funnel</p>
          <a href="https://www.instagram.com/passion_seed.th/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm text-stone-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300">
            <Instagram className="h-4 w-4 text-orange-300" aria-hidden="true" />@passion_seed.th<ExternalLink className="h-3.5 w-3.5 text-white/35" aria-hidden="true" />
          </a>
        </div>
        <div className="mt-3 grid gap-5 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <h1 className="font-kodchasan text-3xl font-semibold tracking-tight text-white sm:text-4xl">Attention → conversation → sale</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-400 sm:text-base">Plan, assign, and move content from idea to published. TechSeed catches exploration; SHIFT converts readiness into proof of work.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/work/mkt/segments" className={styles.secondaryButton}>
              Segments &amp; worksheets
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
            <button type="button" onClick={() => openEditor(null)} disabled={!canEdit} className={styles.primaryButton} title={!canEdit ? workspace.message : undefined}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />Add content
            </button>
          </div>
        </div>
        <p className="mt-3 font-space-mono text-[9px] uppercase tracking-[0.14em] text-white/30">Social metrics: manual snapshot, 04 Sep 2026</p>
        <div className={styles.rule} />
      </header>

      <div className="mt-5"><WorkPersistenceNotice state={workspace.state} message={workspace.message} onRetry={workspace.reload} /></div>
      {actionError && <p className={styles.editorError} role="alert">{actionError} Your previous value was restored.</p>}

      <section className="mt-8 grid gap-px overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.07] sm:grid-cols-3">
        {[["1,131", "Instagram followers", Users], ["24.2K", "Breakout Reel likes", Instagram], ["1.2K", "PORT comments", MessageCircle]].map(([value, label, Icon]) => (
          <div key={String(label)} className="bg-[#0d0a10]/95 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4"><p className="font-space-mono text-2xl font-bold tracking-tight text-white">{value as string}</p><Icon className="h-4 w-4 text-orange-300/65" aria-hidden="true" /></div>
            <p className="mt-2 text-xs text-stone-500">{label as string}</p>
          </div>
        ))}
      </section>

      <section className={`${styles.decisionSurface} mt-6 p-5 sm:p-6`}>
        <div className="relative z-10 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div><p className={styles.eyebrow}>Channel learning</p><p className="mt-3 max-w-3xl text-base font-medium leading-7 text-white">Sharp Portfolio judgment creates demand. Keep “PORT” as the entry keyword, then qualify before pitching.</p></div>
          <a href="#content-backlog" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-orange-200 hover:text-orange-100">Open content backlog<ArrowDown className="h-4 w-4" aria-hidden="true" /></a>
        </div>
      </section>

      <section className="mt-12">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><p className={styles.eyebrow}>Funnel map</p><h2 className="mt-2 font-kodchasan text-xl font-semibold text-white">Choose the stage by the audience question</h2></div>
          <button type="button" onClick={() => setStage("all")} className="min-h-11 self-start text-xs text-stone-500 hover:text-white sm:self-auto">Show full funnel</button>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {FUNNEL_STAGES.map((item) => {
            const active = stage === item.id;
            const count = stageMix.find((entry) => entry.stage === item.id)?.count ?? 0;
            return (
              <button key={item.id} type="button" aria-pressed={active} onClick={() => setStage(active ? "all" : item.id)} className={`${styles.stageButton} ${active ? styles.stageButtonActive : ""}`}>
                <div className="flex items-center justify-between gap-3"><span className="font-space-mono text-[10px] font-bold tracking-[0.16em] text-orange-300/80">{item.shortLabel}</span><span className="text-[10px] text-white/30">{count} items · {item.share}% target</span></div>
                <p className="mt-5 text-sm font-semibold leading-6 text-white">{item.question}</p><p className="mt-3 text-xs leading-5 text-stone-500">{item.job}</p>
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3 text-[10px]"><span className="text-stone-400">{item.action}</span><span className="text-white/30">{item.metric}</span></div>
              </button>
            );
          })}
        </div>
      </section>

      <section id="content-backlog" className={`${styles.section} mt-12 scroll-mt-28`}>
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div><p className={styles.eyebrow}>Content backlog</p><h2 className="mt-2 font-kodchasan text-xl font-semibold text-white">Move ideas into production</h2><p className="mt-2 text-xs text-stone-500">{filteredIdeas.length} visible · {ideas.filter((item) => item.status === "ready").length} ready · {ideas.filter((item) => item.status === "published").length} published</p></div>
          <div className="flex flex-wrap gap-5">
            <FilterGroup<ChannelFilter> label="Channel" value={channel} options={[{ value: "all", label: "All" }, { value: "instagram", label: "Instagram" }, { value: "facebook", label: "Facebook" }]} onChange={setChannel} />
            <FilterGroup<OfferFilter> label="Offer" value={offer} options={[{ value: "all", label: "All" }, { value: "techseed", label: "TechSeed" }, { value: "shift", label: "SHIFT" }]} onChange={setOffer} />
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-white/[0.07] bg-black/10">
          <div className="hidden grid-cols-[4rem_1fr_7rem_7rem_7.5rem_3rem] gap-4 border-b border-white/[0.07] px-4 py-3 font-space-mono text-[9px] uppercase tracking-[0.15em] text-white/30 lg:grid"><span>Stage</span><span>Content</span><span>Owner</span><span>Offer</span><span>Status</span><span>Edit</span></div>
          <AnimatePresence mode="popLayout" initial={false}>
            {filteredIdeas.map((idea) => {
              const source = workspace.items.find((item) => item.id === idea.id) ?? null;
              return (
                <motion.article layout key={idea.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className={`${styles.contentRow} grid gap-3 border-b border-white/[0.06] px-4 py-4 last:border-b-0 lg:grid-cols-[4rem_1fr_7rem_7rem_7.5rem_3rem] lg:items-center lg:gap-4`}>
                  <span className="font-space-mono text-[10px] font-bold tracking-wider text-orange-300/70">{stageLabels[idea.stage]}</span>
                  <div className="min-w-0"><h3 className="break-words text-sm font-semibold text-white">{idea.title}</h3><p className="mt-1 break-words text-xs leading-5 text-stone-500">{idea.hook}</p><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-white/35"><span>{channelLabels[idea.channel]}</span><span>{idea.format}</span><span>CTA: {idea.cta}</span>{idea.dueOn && <span>Due {idea.dueOn}</span>}</div></div>
                  <span className="text-xs text-stone-400">{idea.owner}</span><span className="text-xs text-stone-400">{offerLabels[idea.offer]}</span>
                  <select aria-label={`Status for ${idea.title}`} value={idea.status} disabled={!canEdit || workspace.savingId === idea.id} onChange={(event) => void changeStatus(idea.id, event.target.value as ContentStatus)} className={`${styles.statusSelect} ${statusStyles[idea.status]}`}>
                    {(["idea", "draft", "ready", "published"] as const).map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                  <button type="button" disabled={!canEdit || !source} onClick={() => openEditor(source)} className={styles.editButton} aria-label={`Edit ${idea.title}`}><Pencil className="h-3.5 w-3.5" aria-hidden="true" /></button>
                </motion.article>
              );
            })}
          </AnimatePresence>
          {filteredIdeas.length === 0 && <div className="px-5 py-12 text-center"><p className="text-sm text-stone-300">Nothing matches this view.</p><button type="button" onClick={() => { setStage("all"); setChannel("all"); setOffer("all"); }} className="mt-3 min-h-11 text-xs font-semibold text-orange-200">Clear filters</button></div>}
        </div>
      </section>

      <section className={`${styles.section} mt-12`}>
        <div className="grid gap-8 xl:grid-cols-[0.72fr_1.28fr]">
          <div><p className={styles.eyebrow}>Weekly rhythm</p><h2 className="mt-2 font-kodchasan text-xl font-semibold text-white">A repeatable publishing week</h2><p className="mt-3 max-w-md text-sm leading-6 text-stone-400">One project conversation should produce reach, teaching, proof, a parent handoff, and an offer.</p></div>
          <div className="divide-y divide-white/[0.07] border-y border-white/[0.07]">{weekPlan.map(([day, job, content, stageName]) => <div key={day} className="grid grid-cols-[3rem_4.5rem_1fr_auto] items-center gap-3 py-3 text-xs sm:grid-cols-[4rem_6rem_1fr_auto]"><span className="font-space-mono text-[10px] text-orange-300/55">{day}</span><span className="text-stone-500">{job}</span><span className="text-stone-200">{content}</span><span className="font-space-mono text-[9px] uppercase tracking-wider text-white/25">{stageName}</span></div>)}</div>
        </div>
      </section>

      <section className={`${styles.section} mt-12`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className={styles.eyebrow}>Measurement</p><h2 className="mt-2 font-kodchasan text-xl font-semibold text-white">Measure the handoff, not vanity reach</h2></div><div className="flex flex-wrap items-center gap-2 text-xs text-stone-400">{["Reach", "PORT comments", "Qualified", "Offered", "Priced", "Paid"].map((label, index, list) => <div key={label} className="flex items-center gap-2"><span className="rounded-md border border-white/[0.07] bg-white/[0.02] px-2.5 py-2">{label}</span>{index < list.length - 1 && <ArrowRight className="h-3 w-3 text-white/20" aria-hidden="true" />}</div>)}</div></div>
      </section>

      <WorkItemEditor area="marketing" item={editingItem} open={editorOpen} disabled={!canEdit} saving={workspace.savingId !== null} onOpenChange={setEditorOpen} onCreate={workspace.create} onUpdate={workspace.update} />
    </div>
  );
}
