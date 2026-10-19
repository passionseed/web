"use client";

import { t } from "@/lib/shift-round/certificate/copy";

/**
 * Service failure on the verify page (spec 6.1 / 5.4): web.error, never
 * "not found" or "revoked". The failed render already returned a 5xx.
 */
export default function CertificateError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main
      className="min-h-screen w-full bg-white"
      style={{
        color: "#14112A",
        fontFamily: "var(--font-libre-franklin), var(--font-bai-jamjuree), 'Bai Jamjuree', system-ui, sans-serif",
      }}
    >
      <div className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-8 sm:py-16 [overflow-wrap:anywhere]">
        <p className="text-base font-bold" style={{ color: "#5B2FD6" }}>
          Passion Seed
        </p>
        <div role="alert" className="mt-6 rounded-2xl px-4 py-4 sm:px-5" style={{ background: "#FFF3E0", color: "#8A4B00" }}>
          <p lang="th" className="text-lg font-bold leading-snug">
            {t("th", "web.error")}
          </p>
          <p lang="en" className="mt-1 text-base font-medium leading-snug">
            {t("en", "web.error")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 inline-flex min-h-11 items-center rounded-full px-5 font-bold outline-none focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#5B2FD6]"
          style={{ background: "#F1ECFF", color: "#5B2FD6" }}
        >
          <span lang="th">{t("th", "web.retry")}</span>
          <span aria-hidden="true">&nbsp;·&nbsp;</span>
          <span lang="en">{t("en", "web.retry")}</span>
        </button>
      </div>
    </main>
  );
}
