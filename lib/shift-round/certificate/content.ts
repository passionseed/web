import { MISSION_LABELS, TRACK_LABELS, t, type Lang } from "./copy";
import { verifyUrl, verifyUrlText } from "./config";
import { TEXT_CAPS, truncateAtSegment } from "./thai";
import { MISSION_KEYS, type CertificateSnapshotV1, type MissionKey } from "./types";

/**
 * One content model shared by the verify page and the image renderer, so the
 * two never disagree on wording, name choice or caps.
 */

const TZ = "Asia/Bangkok";
type Bilingual = { th: string; en: string };

function dateFromIso(value: string): Date {
  // Plain dates are ICT calendar days; timestamps keep their own offset.
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00+07:00`) : new Date(value);
}

const LOCALES: Record<Lang, string> = { th: "th-TH", en: "en-GB" };

export function formatDate(value: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALES[lang], {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  })
    .format(dateFromIso(value))
    .replace(/[\u2009\u202F\u00A0]/g, " ");
}

export function formatDateRange(start: string, end: string, lang: Lang): string {
  const fmt = new Intl.DateTimeFormat(LOCALES[lang], {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  // ICU uses thin/narrow spaces that vary by version; plain spaces keep output stable.
  return fmt.formatRange(dateFromIso(start), dateFromIso(end)).replace(/[\u2009\u202F\u00A0]/g, " ");
}

/**
 * Handle by default; the legal name only when the holder opted in (A38) and a
 * legal name exists. Caps from spec 6.2.
 */
export function holderName(snapshot: CertificateSnapshotV1): string {
  const { holder } = snapshot;
  if (holder.display === "legal" && holder.legal_name && holder.legal_name.trim()) {
    return truncateAtSegment(holder.legal_name, TEXT_CAPS.legal_name);
  }
  return truncateAtSegment(holder.handle, TEXT_CAPS.handle);
}

export interface CertificateContent {
  publicId: string;
  issuer: string;
  holder: string;
  roundNumber: number;
  roundTag: Bilingual;
  title: Bilingual;
  dates: Bilingual;
  track: Bilingual;
  missions: { key: MissionKey; done: boolean; label: Bilingual }[];
  statement: Bilingual;
  disclaimer: Bilingual;
  issuedOn: Bilingual;
  verifyUrl: string;
  verifyUrlText: string;
}

export function buildCertificateContent(
  snapshot: CertificateSnapshotV1,
  publicId: string,
  baseUrl?: string
): CertificateContent {
  const holder = holderName(snapshot);
  const n = snapshot.round.number;
  const dates = {
    th: formatDateRange(snapshot.round.starts_on, snapshot.round.closes_on, "th"),
    en: formatDateRange(snapshot.round.starts_on, snapshot.round.closes_on, "en"),
  };
  const done = new Set(snapshot.missions);
  return {
    publicId,
    issuer: "Passion Seed",
    holder,
    roundNumber: n,
    roundTag: { th: t("th", "round.tag", { n }), en: t("en", "round.tag", { n }) },
    title: {
      th: truncateAtSegment(snapshot.round.title_th, TEXT_CAPS.title),
      en: truncateAtSegment(snapshot.round.title_en, TEXT_CAPS.title),
    },
    dates,
    track: TRACK_LABELS[snapshot.track],
    missions: MISSION_KEYS.map((key) => ({ key, done: done.has(key), label: MISSION_LABELS[key] })),
    statement: {
      th: t("th", "web.statement", { name: holder, n, dates: dates.th }),
      en: t("en", "web.statement", { name: holder, n, dates: dates.en }),
    },
    disclaimer: { th: t("th", "web.disclaimer"), en: t("en", "web.disclaimer") },
    issuedOn: {
      th: t("th", "web.issued_on", { date: formatDate(snapshot.issued_at, "th") }),
      en: t("en", "web.issued_on", { date: formatDate(snapshot.issued_at, "en") }),
    },
    verifyUrl: verifyUrl(publicId, baseUrl),
    verifyUrlText: verifyUrlText(publicId, baseUrl),
  };
}
