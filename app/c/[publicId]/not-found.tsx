import { t } from "@/lib/shift-round/certificate/copy";

/** web.not_found (HTTP 404). */
export default function CertificateNotFound() {
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
        <h1 className="mt-6 text-2xl font-bold leading-snug">
          <span lang="th" className="block">
            {t("th", "web.not_found")}
          </span>
          <span lang="en" className="mt-1 block text-lg font-medium" style={{ color: "#45405E" }}>
            {t("en", "web.not_found")}
          </span>
        </h1>
      </div>
    </main>
  );
}
