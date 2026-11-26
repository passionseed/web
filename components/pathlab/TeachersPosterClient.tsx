"use client";

import Link from "next/link";
import { HERO, FIELDS } from "@/lib/content/pathlab-page";
import {
  TEACHERS,
  CONTRIBUTION_MODE_LABELS,
  type Teacher,
} from "@/lib/content/pathlab-teachers";
import { PosterScaler } from "@/components/plans/PosterScaler";
import { SocialCardDownload } from "@/components/pathlab/SocialCardDownload";
import { Wordmark } from "@/components/brand/Wordmark";

/**
 * "ใครออกแบบ PathLab?" — IG Feed variant, 4:5 (1080×1350).
 *
 * Same hand-markered cream paper as /pathlab/poster/how-we-learn but reflowed
 * into a fixed 1080×1350 px canvas so the export lands directly as an IG-ready
 * PNG. The mm-based A4 layout from /pathlab/poster's siblings lives behind
 * `.pathlab-teachers--ig` overrides in globals.css — those overrides assert
 * the pixel canvas and re-size the type so the grid still fits.
 *
 * Centerpiece is a 2x2 grid of named experts, each paired with one field
 * via the "ออกแบบโจทย์ร่วมกับ" attribution that /pathlab-page FIELDS use in
 * their detail block. Because the attribution row matches the existing
 * product copy verbatim, the poster never drifts away from the brief an
 * actual reader sees on the website.
 *
 * Each portrait is a hand-drawn SVG avatar tile (initials + eyebrow + role
 * mark), so no stock photo has to live in /public.
 *
 * Falls back to GRID_TILTS rotation so the four tiles never look stamped
 * from a mould, matching the .pathlab-how__day alternating tilts.
 *
 * The component is a thin client island over the TEACHERS content block in
 * lib/content/pathlab-teachers.ts: editorial copy lives there, the layout
 * lives here, and the per-tile portrait SVG is a deterministic function of
 * the teacher's name + field so the same name always renders the same tile.
 */

/* Four-tilt rotation set, same trick as the day cards on the how-we-learn
   poster: each tile sits at its own slight angle so the row looks
   highlighted by hand, not stamped from a mould. */
const GRID_TILTS = [
  "pathlab-teachers__tile--tilt-1",
  "pathlab-teachers__tile--tilt-2",
  "pathlab-teachers__tile--tilt-3",
  "pathlab-teachers__tile--tilt-4",
] as const;

/* Look up the field label in FIELDS so the contribution row reads the same
   word as the field tile on /pathlab. If a teacher points at a field that
   no longer exists, the row silently drops the field name and uses the
   expert's own field string instead. */
function fieldLabel(teacher: Teacher): string {
  const match = FIELDS.find((f) => f.label === teacher.field);
  return match?.label ?? teacher.field;
}

/**
 * A tiny SVG avatar: a 34mm round-corner square with a warm cream fill,
 * a thin terracotta rule, the expert's initials in big Kodchasan, the
 * eyebrow (role + field) tucked in the top-left, and a small mark in the
 * bottom-right. Same hand-drawn feel as the magenta/pink marker swatches
 * elsewhere on the sheet; no stock photo, no external fetch.
 */
function InitialsPortrait({ teacher }: { teacher: Teacher }) {
  /* Short initials, taken from the first two non-space glyphs. Falls back
     to a single character when the name is one word. */
  const initials = teacher.name
    .split(/\s+/)
    .map((part) => Array.from(part)[0] ?? "")
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  return (
    <svg
      className="pathlab-teachers__portrait"
      viewBox="0 0 100 100"
      role="img"
      aria-label={`ภาพวาดตัวแทนของ ${teacher.name}`}
    >
      <rect
        x="2"
        y="2"
        width="96"
        height="96"
        rx="22"
        ry="22"
        fill="#fdf3e6"
        stroke="rgba(196, 62, 29, 0.35)"
        strokeWidth="1.6"
      />
      <text
        x="50"
        y="58"
        textAnchor="middle"
        fontFamily="var(--font-kodchasan), var(--font-bai-jamjuree), sans-serif"
        fontSize="34"
        fontWeight="700"
        fill="#c43e1d"
      >
        {initials}
      </text>
      <text
        x="9"
        y="18"
        fontFamily="var(--font-bai-jamjuree), sans-serif"
        fontSize="6"
        fontWeight="600"
        fill="rgba(82, 71, 70, 0.7)"
      >
        {teacher.portrait.eyebrow}
      </text>
      <text
        x="91"
        y="92"
        textAnchor="end"
        fontFamily="var(--font-kodchasan), var(--font-bai-jamjuree), sans-serif"
        fontSize="6"
        fontWeight="700"
        letterSpacing="0.06em"
        fill="rgba(82, 71, 70, 0.55)"
      >
        {teacher.portrait.mark}
      </text>
    </svg>
  );
}

/* The contribution row under the portrait. Pulled from the existing
   /pathlab-page FIELDS shape so the wording matches the brief. */
function ContributionRow({ teacher }: { teacher: Teacher }) {
  const field = fieldLabel(teacher);
  return (
    <p className="pathlab-teachers__contribution">
      <span className="pathlab-teachers__contribution-prefix">
        ออกแบบโจทย์ร่วมกับ
      </span>{" "}
      <span className="pathlab-teachers__contribution-name">
        {teacher.name}
      </span>{" "}
      <span className="pathlab-teachers__contribution-field">
        · {field}
      </span>
      <span className="pathlab-teachers__contribution-mode">
        {CONTRIBUTION_MODE_LABELS[teacher.contributionMode]}
      </span>
    </p>
  );
}

export function TeachersPosterClient() {
  const teachers = TEACHERS.teachers;

  return (
    <main className="pathlab-teachers-stage">
      <nav className="pathlab-ig-nav" aria-label="เลือกรูปแบบโปสเตอร์">
        <span className="pathlab-ig-nav__tab pathlab-ig-nav__tab--active">
          Who Teaches
        </span>
        <span className="pathlab-ig-nav__divider" aria-hidden="true" />
        <Link href="/pathlab/poster/how-we-learn" className="pathlab-ig-nav__link">
          How We Learn
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
          id="pathlab-teachers-sheet"
          className="pathlab-teachers pathlab-teachers--ig"
          aria-label="โปสเตอร์ Pathlab ใครออกแบบ PathLab (4:5 IG)"
        >
          {/* Tier 4 brand row, same construction as /pathlab/poster/how-we-learn. */}
          <header className="pathlab-teachers__brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/passion-seed-logo.png"
            alt="Passion Seed"
            className="pathlab-teachers__logo"
          />
          <Wordmark className="pathlab-teachers__brand-name" />
          <span className="pathlab-teachers__brand-path">{HERO.title}</span>
        </header>

        {/* Tier 1: the name of this sheet. Reads from across the room. */}
        <h1 className="pathlab-teachers__title">{TEACHERS.title}</h1>

        {/* Tier 2: the promise. Centered, one sentence, sets up the rest. */}
        <p className="pathlab-teachers__promise">{TEACHERS.promise}</p>

        {/* Single margin note tucked into the top-right corner, the seasoning
            for the title block. */}
        <p className="pathlab-teachers__note">
          <span className="pathlab-note pathlab-note--tilt-r">
            {TEACHERS.note}
          </span>
        </p>

        {/* Tier 3: the 2x2 grid of named experts. Each tile pairs the avatar
            with the contribution row, so the reader sees both "who" and
            "what they helped design" without having to scroll. */}
        <section
          className="pathlab-teachers__grid"
          aria-label="ผู้เชี่ยวชาญที่ออกแบบโจทย์ร่วมกับเรา"
        >
          <p className="pathlab-teachers__eyebrow">
            <span className="pathlab-teachers__eyebrow-chip">
              {TEACHERS.gridEyebrow}
            </span>
          </p>
          <ul className="pathlab-teachers__grid-list">
            {teachers.map((teacher, i) => (
              <li
                key={teacher.name}
                className={`pathlab-teachers__tile ${GRID_TILTS[i % GRID_TILTS.length]}`}
              >
                <InitialsPortrait teacher={teacher} />
                <div className="pathlab-teachers__tile-body">
                  <h3 className="pathlab-teachers__tile-name">
                    {teacher.name}
                  </h3>
                  <p className="pathlab-teachers__tile-role">{teacher.role}</p>
                  <p className="pathlab-teachers__tile-insight">
                    {teacher.insight}
                  </p>
                  <ContributionRow teacher={teacher} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Tier 4: the legend so the reader knows what each contribution
            mode means. Lives under the grid, so the modes are explained
            right after the rows that used them. */}
        <section
          className="pathlab-teachers__legend"
          aria-label="แต่ละคนช่วยเรายังไง"
        >
          <p className="pathlab-teachers__eyebrow pathlab-teachers__eyebrow--center">
            {TEACHERS.legendEyebrow}
          </p>
          <ul className="pathlab-teachers__legend-list">
            {TEACHERS.legend.map((entry) => (
              <li
                key={entry.mode}
                className="pathlab-teachers__legend-item"
              >
                <span className="pathlab-teachers__legend-mode">
                  {entry.label}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Tier 5 footer: single next step, quiet but present. */}
        <footer className="pathlab-teachers__cta">
          <span className="pathlab-teachers__cta-eyebrow">
            {TEACHERS.ctaEyebrow}
          </span>
          <span className="pathlab-teachers__cta-handle">
            {TEACHERS.ctaHandle}
          </span>
        </footer>
      </article>
    </PosterScaler>

      {/* Captured at 1× because the canvas is already a fixed 1080×1350 px
          grid — no need to multiply. Never inside the article, so it cannot
          leak into the PNG. */}
      <SocialCardDownload
        targetId="pathlab-teachers-sheet"
        fileName="pathlab-teachers-ig-1080x1350"
        width={1080}
        height={1350}
        scale={1}
        label="ดาวน์โหลด PNG (1080×1350)"
      />
    </main>
  );
}
