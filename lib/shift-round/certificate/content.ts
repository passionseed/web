import { TRACK_LABELS, t, type Lang } from "./copy";
import { verifyUrl, verifyUrlText } from "./config";
import { missionTitle, toMissionSource } from "./missions";
import { TEXT_CAPS, truncateAtSegment } from "./thai";
import type { CertificateSnapshotV1, MissionKey } from "./types";

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

export interface CertificateMission {
  key: MissionKey;
  done: boolean;
  label: Bilingual;
}

/** Mission title cap on the certificate (titles can come from round config). */
const MISSION_TITLE_CAP = 60;

/**
 * The snapshot's missions, in order, any count (v2: per-round config). Each is
 * a key or `{key, title_th?, title_en?, complete?}`; titles from the snapshot
 * win over the known-key copy. A certificate is issued only when every mission
 * is complete, so a mission is done unless the snapshot says otherwise.
 */
export function certificateMissions(snapshot: Pick<CertificateSnapshotV1, "missions">): CertificateMission[] {
  const out: CertificateMission[] = [];
  for (const raw of snapshot.missions) {
    const source = toMissionSource(raw);
    if (!source) continue;
    const title = missionTitle(source);
    const complete = typeof raw === "object" && raw !== null && "complete" in raw ? raw.complete : undefined;
    out.push({
      key: source.key,
      done: complete !== false,
      label: {
        th: truncateAtSegment(title.th, MISSION_TITLE_CAP),
        en: truncateAtSegment(title.en, MISSION_TITLE_CAP),
      },
    });
  }
  return out;
}

function statementKey(count: number) {
  return count === 1 ? "web.statement_one" : count > 1 ? "web.statement" : "web.statement_any";
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
  missions: CertificateMission[];
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
  const missions = certificateMissions(snapshot);
  const count = missions.length;
  const statement = statementKey(count);
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
    missions,
    statement: {
      th: t("th", statement, { name: holder, n, count, dates: dates.th }),
      en: t("en", statement, { name: holder, n, count, dates: dates.en }),
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
