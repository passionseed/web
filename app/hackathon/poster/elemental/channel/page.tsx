import type { Metadata } from "next";

import { ElementalKeyPoster } from "@/components/hackathon/poster/elemental/ElementalKeyPoster";
import { ElementalInfoPoster } from "@/components/hackathon/poster/elemental/info/ElementalInfoPoster";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { normalizeSource } from "@/lib/hackathon/elemental/registration";

/**
 * The Elemental key poster and details poster for one listing site or channel
 * (Big, 2026-11-28: "need diff qr and link for each"). Both QR codes open the
 * hackathon page with ?src=<channel>, so the admin's sign-ups by source show
 * which site brought each sign-up. Nothing else on the posters changes.
 *
 *   /hackathon/poster/elemental/channel?src=dekd
 *
 * Export the two sheets as images:
 *   node scripts/render-poster.mjs --route "/hackathon/poster/elemental/channel?src=dekd" \
 *        --ids elemental-key-blue-dekd,elemental-info-dekd --out <dir>
 */

export const metadata: Metadata = {
  title: `${ELEMENTAL.edition} Hackathon posters for one channel`,
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ElementalChannelPosterPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  // The same clean-up the sign-up form gives ?src=, so the tag on the code is the tag that gets counted.
  const src = normalizeSource(first(params.src));

  return (
    <main style={{ background: "#111", padding: "24px 0", minHeight: "100vh" }}>
      <p style={{ maxWidth: 1080, margin: "0 auto 24px", padding: "0 16px", color: "#ddd", font: "15px/1.5 ui-monospace, monospace" }}>
        {src ? (
          <>
            Posters for <code>{src}</code>. Both QR codes open the hackathon page with <code>?src={src}</code>.
          </>
        ) : (
          <>
            Add a channel to the address, for example <code>?src=dekd</code>. Lower-case letters, digits, - and _ only.
          </>
        )}
      </p>
      {src ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
          <ElementalKeyPoster id={`elemental-key-blue-${src}`} sky="blue" src={src} />
          <ElementalInfoPoster id={`elemental-info-${src}`} src={src} />
        </div>
      ) : null}
    </main>
  );
}
