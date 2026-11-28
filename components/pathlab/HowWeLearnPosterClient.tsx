"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  HERO,
  POSTER_HOW,
  FIELDS,
} from "@/lib/content/pathlab-page";
import {
  FALLBACK_SPRITE,
  TRAIL_ROW_PX,
  toTrailStops,
  trailPathD,
  type JourneyPreview,
  type TrailStop,
} from "@/components/pathlab/journey-map-utils";
import { PosterScaler } from "@/components/plans/PosterScaler";
import { SocialCardDownload } from "@/components/pathlab/SocialCardDownload";
import { Wordmark } from "@/components/brand/Wordmark";

/**
 * "เรียนยังไง?" — IG Feed variant, 4:5 (1080×1350).
 *
 * Same hand-markered cream paper as /pathlab/poster/teachers, reflowed into
 * a fixed 1080×1350 px canvas so the export lands directly as an IG-ready
 * PNG. The mm-based A4 layout from /pathlab/poster's siblings lives behind
 * `.pathlab-how--ig` overrides in globals.css — those overrides assert the
 * pixel canvas and re-size type/spacing so the island trail + three example
 * days still fit.
 *
 * Centerpiece is a live zigzag trail of island sprites fetched from
 * /api/maps/public-preview, so the islands are real PathLab nodes rather
 * than a hand-illustration: the IG artefact can never drift away from the
 * product.
 *
 * Below the trail, three example days from the Web Dev path show what
 * "ทำ Project จริง" actually looks like day by day. The days are pulled
 * from FIELDS so the copy can never drift away from the path's real copy.
 *
 * Falls back to the static screenshot from JOURNEY when the fetch fails or
 * is still loading, so the PNG export always has something to capture.
 *
 * Client component: the trail needs `fetch` and `useState`, and the
 * download button is a client component anyway.
 */

const DEMO_MAP_ID = "00000000-0000-0000-0000-000000000020";
const SPRITE_PX = 96;
/**
 * Static fallback for the island trail. We point at the WebP build of the
 * MapView screenshot (`journey.webp`, 79KB, 4:3) instead of the full
 * `pathlabmap.png` (795KB, 16:9) so the A4 island slot gets a tighter,
 * cheaper picture that fills the box without huge whitespace.
 */
const JOURNEY_FALLBACK = "/pathlab/journey.webp";

/* Three example days, chosen by index in POSTER_HOW.daysIndices so editorial
   selection lives next to the rest of the poster copy. Pulled from the Web
   Dev path (first item with a `detail` block); falls back to the first path
   with detail if Web Dev ever loses one. */
function pickWebDevDetail() {
  const webdev = FIELDS.find((f) => f.label === "Web Dev" && f.detail);
  const fallback = FIELDS.find((f) => f.detail);
  const field = webdev ?? fallback;
  return field?.detail ?? null;
}

/** The zigzag island trail in fixed pixel space (700px tall by default), so
    it sits cleanly inside the A4 sheet without depending on container query
    sizing. The static fallback takes the same slot. */
function IslandTrail({
  preview,
  failed,
}: {
  preview: JourneyPreview | null;
  failed: boolean;
}) {
  const stops: TrailStop[] = useMemo(
    () => (preview ? toTrailStops(preview) : []),
    [preview],
  );

  /* On the IG canvas the trail needs to fit inside 1080×1350 alongside the
     title, three stacked day cards, and the CTA footer. Six zigzag rows
     would overflow vertically, so we cap the IG variant at four rows —
     enough to read the path shape (setup → first working → mid → late)
     without crowding the rest of the layout. The fallback path (no
     preview fetched) is unaffected. */
  const igMaxStops = 4;
  const stopsForRender = useMemo(
    () => (preview ? stops.slice(0, igMaxStops) : []),
    [preview, stops],
  );
  const pathD = useMemo(
    () => (stopsForRender.length > 0 ? trailPathD(stopsForRender) : ""),
    [stopsForRender],
  );

  if (failed || !preview || stopsForRender.length === 0) {
    /* Same image as PathlabJourney's fallback: a real PathLab screenshot,
       so even the print export stays truthful. */
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={JOURNEY_FALLBACK}
          alt="ตัวอย่าง PathLab learning map"
          className="pathlab-how__fallback"
        />
      </>
    );
  }

  const height = stopsForRender.length * TRAIL_ROW_PX;

  return (
    <div
      className="pathlab-how__trail"
      style={{ height }}
      aria-label={preview.map.title}
    >
      <svg
        className="pathlab-how__trail-path"
        viewBox={`0 0 100 ${stopsForRender.length * 12}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d={pathD}
          fill="none"
          stroke="rgba(196, 62, 29, 0.45)"
          strokeWidth={2.2}
          strokeDasharray="8 8"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {stopsForRender.map((stop) => (
        <div
          key={stop.id}
          className="pathlab-how__stop"
          style={{
            left: `${stop.xPct}%`,
            top:
              stop.row * TRAIL_ROW_PX +
              (TRAIL_ROW_PX - SPRITE_PX) / 2,
          }}
        >
          {/* Plain <img> keeps html-to-image export reliable. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={stop.spriteUrl || FALLBACK_SPRITE}
            alt=""
            className="pathlab-how__stop-sprite"
          />
          <span className="pathlab-how__stop-title">{stop.title}</span>
        </div>
      ))}
    </div>
  );
}

export function HowWeLearnPosterClient() {
  const [preview, setPreview] = useState<JourneyPreview | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/maps/public-preview/${DEMO_MAP_ID}`)
      .then((res) => {
        if (!res.ok) throw new Error(`preview ${res.status}`);
        return res.json();
      })
      .then((data: JourneyPreview) => {
        if (!cancelled) setPreview(data);
      })
      .catch((err) => {
        console.error("how-we-learn preview failed:", err);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* Three example days. If the field's detail somehow disappears, the
     section quietly hides rather than printing broken cards. */
  const detail = pickWebDevDetail();
  const exampleDays = detail
    ? POSTER_HOW.daysIndices
        .map((i) => detail.days[i])
        .filter((d): d is NonNullable<typeof d> => Boolean(d))
    : [];

  return (
    <main className="pathlab-how-stage">
      <nav className="pathlab-ig-nav" aria-label="เลือกรูปแบบโปสเตอร์">
        <span className="pathlab-ig-nav__tab pathlab-ig-nav__tab--active">
          How We Learn
        </span>
        <span className="pathlab-ig-nav__divider" aria-hidden="true" />
        <Link href="/pathlab/poster/teachers" className="pathlab-ig-nav__link">
          Who Teaches
        </Link>
        <Link href="/pathlab/poster" className="pathlab-ig-nav__link">
          A4 Print
        </Link>
        <Link href="/pathlab/poster/instagram" className="pathlab-ig-nav__link">
          Instagram
        </Link>
        <Link
          href="/pathlab/poster/instagram-hero"
          className="pathlab-ig-nav__link"
        >
          IG Hero (10x)
        </Link>
        <Link href="/pathlab/poster/social" className="pathlab-ig-nav__link">
          Social Card
        </Link>
        <Link href="/pathlab/poster/certificate" className="pathlab-ig-nav__link">
          Certificate
        </Link>
      </nav>

      <PosterScaler designWidth={1080}>
        <article
          id="pathlab-how-sheet"
          className="pathlab-how pathlab-how--ig"
          aria-label="โปสเตอร์ Pathlab เรียนยังไง (4:5 IG)"
        >
          {/* Tier 4 brand row: quiet confirmation of who made the sheet. */}
          <header className="pathlab-how__brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/passion-seed-logo.png"
            alt="Passion Seed"
            className="pathlab-how__logo"
          />
          <Wordmark className="pathlab-how__brand-name" />
          <span className="pathlab-how__brand-path">{HERO.title}</span>
        </header>

        {/* Tier 1: the name of this sheet. Reads from across the room. */}
        <h1 className="pathlab-how__title">{POSTER_HOW.title}</h1>

        {/* Tier 2: the promise. Centered, one sentence, sets up the rest. */}
        <p className="pathlab-how__promise">{POSTER_HOW.promise}</p>

        {/* Single margin note tucked into the top-right corner, the seasoning
            for the title block. */}
        <p className="pathlab-how__note">
          <span className="pathlab-note pathlab-note--tilt-r">
            {POSTER_HOW.note}
          </span>
        </p>

        {/* Tier 3: the live island trail. Fetches the same allowlisted demo
            map as PathlabJourneyMap, so the islands are real PathLab nodes. */}
        <section
          className="pathlab-how__islands"
          aria-label="แผนที่ PathLab ที่นักเรียนกำลังเดินอยู่"
        >
          <p className="pathlab-how__eyebrow">
            <span className="pathlab-how__eyebrow-chip">
              {POSTER_HOW.islandEyebrow}
            </span>{" "}
            {preview?.map.title ?? "Web Dev · เว็บ Flashcard ทบทวนบทเรียน"}
          </p>
          <IslandTrail preview={preview} failed={failed} />
          <p className="pathlab-how__hint">
            <span className="pathlab-note pathlab-note--tilt-l-sm">
              {POSTER_HOW.islandHint}
            </span>
          </p>
        </section>

        {/* Tier 4: three example days from the Web Dev path. Picked by
            index so the editorial arc (setup → first working thing → ship)
            is obvious at a glance. */}
        {exampleDays.length > 0 ? (
          <section
            className="pathlab-how__days"
            aria-label="ตัวอย่าง 3 วันจากสาย Web Dev"
          >
            <p className="pathlab-how__eyebrow pathlab-how__eyebrow--center">
              {POSTER_HOW.daysEyebrow}
            </p>
            <ol className="pathlab-how__days-list">
              {exampleDays.map((day, i) => (
                <li key={day.title} className="pathlab-how__day">
                  <span className="pathlab-how__day-number">
                    {`วันที่ ${POSTER_HOW.daysIndices[i] + 1}`}
                  </span>
                  <h3 className="pathlab-how__day-title">{day.title}</h3>
                  <p className="pathlab-how__day-doing">{day.doing}</p>
                  <span className="pathlab-how__day-gets">{day.gets}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {/* Tier 5 footer: the single next step. Quiet but present. */}
        <footer className="pathlab-how__cta">
          <span className="pathlab-how__cta-eyebrow">
            {POSTER_HOW.ctaEyebrow}
          </span>
          <span className="pathlab-how__cta-handle">
            {POSTER_HOW.ctaHandle}
          </span>
        </footer>
      </article>
    </PosterScaler>

      {/* Captured at 1× because the canvas is already a fixed 1080×1350 px
          grid — no need to multiply. Never inside the article, so it cannot
          leak into the PNG. */}
      <SocialCardDownload
        targetId="pathlab-how-sheet"
        fileName="pathlab-how-we-learn-ig-1080x1350"
        width={1080}
        height={1350}
        scale={1}
        label="ดาวน์โหลด PNG (1080×1350)"
      />
    </main>
  );
}
