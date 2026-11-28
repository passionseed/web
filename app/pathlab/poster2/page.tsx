import type { Metadata } from "next";
import {
  HERO,
  NOTES,
  POSTER,
  FIELDS,
  PRICE_TIERS,
  type PriceTier,
} from "@/lib/content/pathlab-page";
import { SocialCardDownload } from "@/components/pathlab/SocialCardDownload";
import { Wordmark } from "@/components/brand/Wordmark";

export const metadata: Metadata = {
  title: "Pathlab Poster v2 — Passion Seed",
  /** A print artifact, not a landing page — keep it out of search results. */
  robots: { index: false, follow: false },
};

/**
 * v2 of the A4 poster, rebuilt around a four-tier type hierarchy so the
 * reader's eye lands on "Pathlab" first, the price second, and the proof
 * last. Same paper size, same palette, same data sources as v1; only the
 * composition changes.
 *
 * The single rule that drives every decision here: the next thing you read
 * must be the next-biggest thing on the page. That is why "Pathlab" is the
 * only tier-1 word, why the price is the only tier-2 number, and why the
 * perks sit quiet under a thin divider.
 *
 * Server component: a poster has nothing to hydrate, and the print path must
 * not depend on client JS.
 */

/* Same four-tilt rotation set as v1, so a field label never looks stamped
   from a mould. "" keeps the base .pathlab-note tilt. */
const FIELD_TILTS = [
  "",
  "pathlab-note--tilt-r",
  "pathlab-note--tilt-l-sm",
  "pathlab-note--tilt-r-sm",
] as const;

/** A tiny check chip rendered before each perk. Decorative for the perk
    glyph, so the chip itself stays a separate, accessible row. */
function CheckMark() {
  return (
    <svg
      className="pathlab-poster2__check"
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M3.5 8.4 6.6 11.5 12.5 4.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A four-point sparkle for the single quiet corner decoration. */
function Sparkle() {
  return (
    <svg
      className="pathlab-poster2__sparkle"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M12 1.5c.9 6.1 4 9.4 10.5 10.5-6.5 1.1-9.6 4.4-10.5 10.5-.9-6.1-4-9.4-10.5-10.5C8 10.9 11.1 7.6 12 1.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Rounds (o - p) / o to the nearest whole percent. Returns null when the
    inputs are missing or the math would lie, so the chip disappears rather
    than printing "ลด NaN%". */
function discountPercent(
  original: string | undefined,
  promo: string | undefined,
): number | null {
  if (!original || !promo) return null;
  const o = Number(original);
  const p = Number(promo);
  if (!Number.isFinite(o) || !Number.isFinite(p) || o <= 0 || p <= 0)
    return null;
  if (p >= o) return null;
  return Math.round(((o - p) / o) * 100);
}

export default function PathlabPosterV2Page() {
  /* The poster sells paid rounds only, so the free Micro Pathlab tier stays
     on the website. */
  const posterPrices = PRICE_TIERS.filter(
    (tier): tier is PriceTier & { tone: "solo" | "featured" | "group" } =>
      tier.tone !== "free",
  );

  /* Picked by label so a renamed field in FIELDS shows up here too rather
     than forking the name. */
  const posterFields = POSTER.fieldLabels
    .map((label) => FIELDS.find((f) => f.label === label))
    .filter((f) => f !== undefined);

  /* The featured "Pathlab รอบเต็ม" tier carries the price block, the perks
     and the discount. If there is ever no featured tier, the block falls
     back to the first paid tier so the sheet never ends without a price. */
  const featured =
    posterPrices.find((tier) => tier.tone === "featured") ?? posterPrices[0];

  /* The discount lives next to the original/promo pair so it can never be
     printed without both numbers above it. */
  const discount = featured
    ? discountPercent(featured.originalAmount, featured.amount)
    : null;

  return (
    <main className="pathlab-poster2-stage">
      <article
        id="pathlab-poster2-sheet"
        className="pathlab-poster2"
        aria-label="โปสเตอร์ Pathlab (v2)"
      >
        {/* Tier 4: brand row. Quiet, small, and left-aligned so the eye
            does not stop here — it confirms the sheet belongs to us and
            moves on. */}
        <header className="pathlab-poster2__brand">
          {/* plain img, not next/image: keeps html-to-image export reliable */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/passion-seed-logo.png"
            alt="Passion Seed"
            className="pathlab-poster2__logo"
          />
          <Wordmark className="pathlab-poster2__brand-name" />
        </header>

        {/* Single margin note: a senior's aside in the corner. One only —
            more would clutter the v1 feel of three competing sticky notes. */}
        <p className="pathlab-poster2__note pathlab-note pathlab-note--tilt-r">
          {NOTES.hero}
        </p>

        {/* Tier 1: THE name. The single biggest element on the sheet, set
            tight and bold so it reads from across the room. */}
        <h1 className="pathlab-poster2__title">Pathlab</h1>

        {/* Tier 3: the promise, in three short lines that answer "what is
            this" before "how much". Centered, single column, generous
            leading. */}
        <p className="pathlab-poster2__promise">
          ทำ Project จริง 1 ชิ้น
          <br />
          ผ่านการทำ Professional Project
          <br />
          จบใน 4-6 วัน มีผลงานลง Port ทันที
        </p>

        <Sparkle />

        {/* Divider before the price. A thin warm line, not a heavy rule,
            gives the buy-decision its own band without cutting the sheet
            in two. */}
        <hr className="pathlab-poster2__rule" />

        {/* Tier 2: the price. The only large number on the sheet, paired
            with the original (struck) so the discount reads instantly. */}
        {featured ? (
          <section className="pathlab-poster2__price" aria-label="ราคา Pathlab รอบเต็ม">
            <span className="pathlab-poster2__price-eyebrow">
              {featured.label}
            </span>

            <div className="pathlab-poster2__price-row">
              {featured.originalAmount ? (
                <span className="pathlab-poster2__price-original">
                  <span className="pathlab-poster2__price-currency">
                    {featured.currency}
                  </span>
                  {featured.originalAmount}
                </span>
              ) : null}
              <span className="pathlab-poster2__price-promo">
                <span className="pathlab-poster2__price-currency">
                  {featured.currency}
                </span>
                {featured.amount}
              </span>
              {discount !== null ? (
                <span className="pathlab-poster2__price-discount">
                  ลด {discount}%
                </span>
              ) : null}
            </div>

            <p className="pathlab-poster2__price-unit">{featured.unit}</p>

            {featured.blurb ? (
              <p className="pathlab-poster2__price-blurb">{featured.blurb}</p>
            ) : null}
          </section>
        ) : null}

        {/* Perks: tier 4 detail. The most persuasive copy on the sheet,
            but still tier-4 — read after the price, never before. */}
        {featured?.perks && featured.perks.length > 0 ? (
          <ul className="pathlab-poster2__perks">
            {featured.perks.map((perk) => (
              <li key={perk} className="pathlab-poster2__perk">
                <CheckMark />
                <span>{perk}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <hr className="pathlab-poster2__rule" />

        {/* Proof: the four paths and the round dates. Small tier-4, but
            left here so the eye lands on the price first. */}
        <section className="pathlab-poster2__proof">
          <h2 className="pathlab-poster2__proof-heading">
            สายที่เปิดตอนนี้
          </h2>
          <ul className="pathlab-poster2__fields">
            {posterFields.map((field, i) => (
              <li key={field.label} className="pathlab-poster2__field">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={field.src as string}
                  alt={field.alt ?? ""}
                  className="pathlab-poster2__field-img"
                />
                <span
                  className={`pathlab-poster2__field-label pathlab-note ${FIELD_TILTS[i % FIELD_TILTS.length]}`}
                >
                  {field.label}
                </span>
              </li>
            ))}
          </ul>
          <p className="pathlab-poster2__schedule">{POSTER.schedule}</p>
        </section>

        {/* Next step: the one CTA on the sheet. Quiet, hand-set, so the
            reader knows exactly what to do after reading everything above. */}
        <footer className="pathlab-poster2__cta">
          <span className="pathlab-poster2__cta-eyebrow">สนใจทักมาคุยกันได้เลย</span>
          <span className="pathlab-poster2__cta-handle">IG @passion_seed.th</span>
        </footer>
      </article>

      {/* Captured at 2x so the A4 sheet is usable in print, not just on
          screen. Never inside the article, so it cannot leak into the PNG. */}
      <SocialCardDownload
        targetId="pathlab-poster2-sheet"
        fileName="pathlab-poster-v2-a4"
        scale={2}
        label="ดาวน์โหลด PNG (A4)"
      />
    </main>
  );
}
