import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import type { MemberClaimCode } from "@/lib/supabase/elemental-claims";

/**
 * Each member's Elemental /join code on the registrant's paid page (E26),
 * beside the name the registrant typed in, plus the one step to use it.
 * Server-rendered, no client code: the page is token-gated and already holds
 * these names. Codes are 8 characters; they are shown as ABCD-EFGH, which the
 * bot accepts because /join strips anything that is not a letter or digit.
 *
 * Functional placeholders only: every Thai line waits for a native review
 * before the event ([TH-REVIEW]).
 */

export const DISCORD_CLAIM_COPY = {
  // [TH-REVIEW] heading of the codes block on the paid page.
  heading: "รหัสเข้า Discord ของแต่ละคน",
  // [TH-REVIEW] step 1: open the invite staff send.
  stepInvite: "เข้า Discord ของงานจากลิงก์ที่ทีมงานส่งให้",
  // [TH-REVIEW] step 2: type /join with your own code in #start-here.
  stepJoin: "ในห้อง #start-here พิมพ์คำสั่งในบรรทัดของตัวเอง",
  // [TH-REVIEW] step 3: one code per person, used once.
  stepOwn: "รหัสใช้ได้ครั้งเดียว คนละรหัส ใช้รหัสของตัวเองเท่านั้น",
  // [TH-REVIEW] shown while staff have not issued the codes yet.
  notIssued: "รหัสจะขึ้นที่หน้านี้ก่อนวันงาน",
  // [TH-REVIEW] a member position without a code (more than 5 people, or not issued yet).
  noCode: "ทีมงานจะส่งรหัสให้",
  // [TH-REVIEW] a code a Discord account already used.
  claimed: "ใช้แล้ว",
  // [TH-REVIEW] fallback label when the registrant left a member's name empty.
  memberFallback: (position: number) => `คนที่ ${position}`,
} as const;

/** ABCDEFGH as ABCD-EFGH, easier to read and type on a phone. */
export function formatClaimCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

export function DiscordClaim({
  memberNames,
  codes,
}: {
  /** The names the registrant entered, in member position order (position 1 first). */
  memberNames: readonly string[];
  /** Codes by position; null when they could not be read, which shows nothing. */
  codes: readonly MemberClaimCode[] | null;
}) {
  if (codes === null) return null;
  const byPosition = new Map(codes.map((c) => [c.position, c]));
  const count = Math.max(memberNames.length, ...codes.map((c) => c.position), 0);
  const positions = Array.from({ length: count }, (_, i) => i + 1);

  return (
    <section
      aria-labelledby="discord-claim-heading"
      data-testid="discord-claim"
      className="space-y-4 rounded-md border p-4 sm:p-5"
      style={{ borderColor: EL.ash }}
    >
      <h2 id="discord-claim-heading" className="text-2xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
        {DISCORD_CLAIM_COPY.heading}
      </h2>
      <ol className="list-decimal space-y-1 pl-5 text-sm" style={{ color: EL.inkSoft }}>
        <li>{DISCORD_CLAIM_COPY.stepInvite}</li>
        <li>{DISCORD_CLAIM_COPY.stepJoin}</li>
        <li>{DISCORD_CLAIM_COPY.stepOwn}</li>
      </ol>

      {codes.length === 0 ? (
        <p className="text-sm" style={{ color: EL.inkSoft }}>
          {DISCORD_CLAIM_COPY.notIssued}
        </p>
      ) : (
        <ul>
          {positions.map((position) => {
            const name = memberNames[position - 1]?.trim() || DISCORD_CLAIM_COPY.memberFallback(position);
            const claim = byPosition.get(position);
            return (
              <li
                key={position}
                data-position={position}
                className="flex flex-col gap-1 border-t py-3 first:border-t-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                style={{ borderColor: EL.ash }}
              >
                <span className="text-base">{name}</span>
                {claim ? (
                  <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <code
                      data-testid="claim-command"
                      className="select-all break-all text-sm"
                      style={{ fontFamily: EL_FONT.mono }}
                    >
                      /join code:{formatClaimCode(claim.code)}
                    </code>
                    {claim.claimed && (
                      <span className="text-xs" style={{ color: EL.inkSoft }}>
                        {DISCORD_CLAIM_COPY.claimed}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-sm" style={{ color: EL.inkSoft }}>
                    {DISCORD_CLAIM_COPY.noCode}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
