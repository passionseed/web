import type { CSSProperties, ReactNode } from "react";
import { t, type WebCopyKey } from "@/lib/shift-round/certificate/copy";
import { buildCertificateContent, formatDate } from "@/lib/shift-round/certificate/content";
import { verifyUrlText } from "@/lib/shift-round/certificate/config";
import { TEXT_CAPS, truncateAtSegment } from "@/lib/shift-round/certificate/thai";
import {
  SUMMARY_COUNT_KEYS,
  type CertificateLookup,
  type PublicSummary,
} from "@/lib/shift-round/certificate/types";

/**
 * Public verification view (spec 6.1, DS11, DS16). Calm light credential
 * style from DESIGN.md v3: white page, ink text, violet-700 accents, Libre
 * Franklin for Latin with Bai Jamjuree for Thai. Bilingual, Thai first.
 * All text goes through React escaping; no raw HTML.
 */

const C = {
  ink: "#14112A",
  ink2: "#45405E",
  ink3: "#625C7D",
  violet50: "#F1ECFF",
  violet700: "#5B2FD6",
  line: "#E7E2F4",
  success: "#0F7A4D",
  successBg: "#E8F6EF",
  error: "#B91C1C",
  errorBg: "#FDECEC",
  warning: "#8A4B00",
  warningBg: "#FFF3E0",
};

const FONT: CSSProperties = {
  fontFamily: "var(--font-libre-franklin), var(--font-bai-jamjuree), 'Bai Jamjuree', system-ui, sans-serif",
};

const focusRing =
  "rounded-sm underline underline-offset-4 outline-none focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#5B2FD6]";

type Lookup = Exclude<CertificateLookup, { kind: "not_found" }>;

function Bi({ th, en, thClass = "", enClass = "" }: { th: ReactNode; en: ReactNode; thClass?: string; enClass?: string }) {
  return (
    <>
      <span lang="th" className={`block ${thClass}`}>
        {th}
      </span>
      <span lang="en" className={`block ${enClass}`} style={{ color: C.ink2 }}>
        {en}
      </span>
    </>
  );
}

function biCopy(key: WebCopyKey, params?: Record<string, string | number>) {
  return { th: t("th", key, params), en: t("en", key, params) };
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main
      className="min-h-screen w-full bg-white"
      style={{ ...FONT, color: C.ink }}
      data-testid="shift-certificate-page"
    >
      <div className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-8 sm:py-16 [overflow-wrap:anywhere]">
        <p className="text-base font-bold" style={{ color: C.violet700 }}>
          Passion Seed
        </p>
        {children}
      </div>
    </main>
  );
}

function StatusBanner({
  tone,
  copy,
}: {
  tone: "valid" | "revoked" | "error";
  copy: { th: string; en: string };
}) {
  const colors =
    tone === "valid"
      ? { fg: C.success, bg: C.successBg }
      : tone === "revoked"
        ? { fg: C.error, bg: C.errorBg }
        : { fg: C.warning, bg: C.warningBg };
  return (
    <div
      role="status"
      className="mt-6 flex items-start gap-3 rounded-2xl px-4 py-4 sm:px-5"
      style={{ background: colors.bg, color: colors.fg }}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        {tone === "valid" ? (
          <>
            <circle cx="12" cy="12" r="10" />
            <path d="M7.5 12.5l3 3 6-6.5" />
          </>
        ) : (
          <>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 7v6M12 16.5v.5" />
          </>
        )}
      </svg>
      <p className="text-lg font-bold leading-snug">
        <span lang="th" className="block">
          {copy.th}
        </span>
        <span lang="en" className="block text-base font-medium">
          {copy.en}
        </span>
      </p>
    </div>
  );
}

/** "SHIFT[N]" (v2 D2): one name in both languages. */
function RoundTag({ n }: { n: number }) {
  const th = t("th", "round.tag", { n });
  const en = t("en", "round.tag", { n });
  return (
    <span
      className="inline-block rounded-lg px-2.5 py-1 text-sm font-bold"
      style={{ background: C.violet50, color: C.violet700 }}
    >
      {th === en ? (
        th
      ) : (
        <>
          <span lang="th">{th}</span>
          <span aria-hidden="true"> · </span>
          <span lang="en">{en}</span>
        </>
      )}
    </span>
  );
}

function Field({ label, children }: { label: { th: string; en: string }; children: ReactNode }) {
  return (
    <div className="border-t py-4" style={{ borderColor: C.line }}>
      <dt className="text-sm font-medium" style={{ color: C.ink3 }}>
        <span lang="th">{label.th}</span> · <span lang="en">{label.en}</span>
      </dt>
      <dd className="mt-1 text-base leading-relaxed">{children}</dd>
    </div>
  );
}

function isHttpsUrl(value: string | null | undefined): value is string {
  if (!value || !/^https:\/\/[^\s]{4,490}$/.test(value)) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function SummaryBlock({ summary, missionsTotal }: { summary: PublicSummary; missionsTotal: number }) {
  const counts = summary.counts ?? {};
  const shown = SUMMARY_COUNT_KEYS.filter((key) => typeof counts[key] === "number");
  return (
    <section aria-labelledby="shift-cert-summary" className="mt-10 rounded-2xl p-5 sm:p-6" style={{ background: C.violet50 }}>
      <h2 id="shift-cert-summary" className="text-lg font-bold" style={{ color: C.violet700 }}>
        <Bi th={t("th", "web.summary")} en={t("en", "web.summary")} enClass="text-sm font-medium" />
      </h2>
      <p className="mt-4 text-xl font-bold leading-snug">{summary.title}</p>
      <p className="mt-2 whitespace-pre-line text-base leading-relaxed" style={{ color: C.ink2 }}>
        {summary.description}
      </p>
      {shown.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {shown.map((key) => (
            <li key={key} className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium">
              <span lang="th">{t("th", `count.${key}` as WebCopyKey, { n: counts[key], total: missionsTotal })}</span>
              <span aria-hidden="true"> · </span>
              <span lang="en">{t("en", `count.${key}` as WebCopyKey, { n: counts[key], total: missionsTotal })}</span>
            </li>
          ))}
        </ul>
      )}
      {isHttpsUrl(summary.demo_url) && (
        <p className="mt-4">
          <a
            href={summary.demo_url}
            target="_blank"
            rel="noopener nofollow ugc"
            className={`inline-flex min-h-11 items-center font-bold ${focusRing}`}
            style={{ color: C.violet700 }}
          >
            <span lang="th">{t("th", "web.demo")}</span>
            <span aria-hidden="true">&nbsp;·&nbsp;</span>
            <span lang="en">{t("en", "web.demo")}</span>
          </a>
        </p>
      )}
    </section>
  );
}

function LiveLine({ publicId, baseUrl }: { publicId: string; baseUrl: string }) {
  return (
    <footer className="mt-10 border-t pt-6 text-sm leading-relaxed" style={{ borderColor: C.line, color: C.ink3 }}>
      <Bi th={t("th", "web.live")} en={t("en", "web.live")} enClass="text-sm" />
      <p className="mt-2 font-medium" style={{ color: C.ink2 }}>
        {verifyUrlText(publicId, baseUrl)}
      </p>
    </footer>
  );
}

export function VerifyView({ lookup, baseUrl }: { lookup: Lookup; baseUrl: string }) {
  if (lookup.kind === "error") {
    return (
      <Shell>
        <StatusBanner tone="error" copy={biCopy("web.error")} />
      </Shell>
    );
  }

  if (lookup.kind === "tombstone") {
    const n = lookup.data.round_number;
    return (
      <Shell>
        <h1 className="sr-only">SHIFT certificate</h1>
        {n ? (
          <div className="mt-6">
            <RoundTag n={n} />
          </div>
        ) : null}
        <StatusBanner tone="revoked" copy={biCopy("web.tombstone")} />
        <LiveLine publicId={lookup.publicId} baseUrl={baseUrl} />
      </Shell>
    );
  }

  if (lookup.kind === "revoked") {
    // Holder name stays hidden on a revoked certificate (6.1); the RPC strips it too.
    const { round } = lookup.snapshot;
    const when = lookup.data.revoked_at;
    const copy = when
      ? { th: t("th", "web.revoked", { date: formatDate(when, "th") }), en: t("en", "web.revoked", { date: formatDate(when, "en") }) }
      : biCopy("web.tombstone");
    return (
      <Shell>
        <div className="mt-6">
          <RoundTag n={round.number} />
        </div>
        <h1 className="mt-4 text-2xl font-bold leading-snug sm:text-3xl">
          <Bi
            th={truncateAtSegment(round.title_th, TEXT_CAPS.title)}
            en={truncateAtSegment(round.title_en, TEXT_CAPS.title)}
            enClass="mt-1 text-lg font-medium"
          />
        </h1>
        <StatusBanner tone="revoked" copy={copy} />
        <LiveLine publicId={lookup.publicId} baseUrl={baseUrl} />
      </Shell>
    );
  }

  const content = buildCertificateContent(lookup.snapshot, lookup.publicId, baseUrl);

  return (
    <Shell>
      <StatusBanner tone="valid" copy={biCopy("web.valid")} />

      <p className="mt-8 text-sm font-medium" style={{ color: C.ink3 }}>
        <span lang="th">ผู้ถือ</span> · <span lang="en">Holder</span>
      </p>
      <h1 className="mt-1 text-3xl font-bold leading-snug sm:text-4xl">{content.holder}</h1>

      <dl className="mt-6">
        <Field label={{ th: "รอบ", en: "Round" }}>
          <RoundTag n={content.roundNumber} />
          <Bi th={content.title.th} en={content.title.en} thClass="mt-2 font-bold" />
        </Field>
        <Field label={biCopy("web.dates")}>
          <Bi th={content.dates.th} en={content.dates.en} />
        </Field>
        <Field label={biCopy("web.track")}>
          <Bi th={content.track.th} en={content.track.en} />
        </Field>
        <Field label={biCopy("web.issuer")}>
          <span className="block">Passion Seed</span>
          <Bi th={content.issuedOn.th} en={content.issuedOn.en} thClass="text-sm" enClass="text-sm" />
        </Field>
        <Field label={biCopy("web.missions")}>
          <ul className="mt-1 grid gap-2">
            {content.missions.map((mission, index) => (
              <li key={`${index}-${mission.key}`} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                  style={{ background: mission.done ? C.violet50 : "#FFFFFF", border: `1.5px solid ${mission.done ? "#E4DEF7" : C.line}`, color: C.violet700 }}
                >
                  {mission.done ? (
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  ) : null}
                </span>
                <span>
                  <span lang="th" className="font-medium">
                    {mission.label.th}
                  </span>
                  {mission.label.en !== mission.label.th && (
                    <>
                      <span aria-hidden="true"> · </span>
                      <span lang="en" style={{ color: C.ink2 }}>
                        {mission.label.en}
                      </span>
                    </>
                  )}
                  <span className="sr-only">{mission.done ? " (done)" : " (not done)"}</span>
                </span>
              </li>
            ))}
          </ul>
        </Field>
      </dl>

      <div className="mt-8 border-t pt-6 text-base leading-relaxed" style={{ borderColor: C.line }}>
        <p lang="th">{content.statement.th}</p>
        <p lang="en" className="mt-2" style={{ color: C.ink2 }}>
          {content.statement.en}
        </p>
        <p lang="th" className="mt-4 text-sm" style={{ color: C.ink2 }}>
          {content.disclaimer.th}
        </p>
        <p lang="en" className="mt-1 text-sm" style={{ color: C.ink2 }}>
          {content.disclaimer.en}
        </p>
      </div>

      {lookup.data.summary ? <SummaryBlock summary={lookup.data.summary} missionsTotal={content.missions.length} /> : null}

      <LiveLine publicId={lookup.publicId} baseUrl={baseUrl} />
    </Shell>
  );
}
