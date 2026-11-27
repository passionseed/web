import { Badge } from "@/components/ui/badge";
import { formatBangkokDateTime } from "@/lib/admin/queue-tools/format";
import { STORY_PROOF_MIN_VIEWS } from "@/lib/hackathon/elemental/story-proof";
import type { AdminStoryProof } from "@/lib/supabase/hackathon-story-proofs";

import { StoryProofRevoke } from "./StoryProofRevoke";

/**
 * Instagram Story proofs: each live one already unlocked every team-name
 * style for its team, with no check first (it's only cosmetic). Staff
 * spot-check that the screenshot is the poster with STORY_PROOF_MIN_VIEWS+
 * views and revoke the ones that aren't; revoking deletes the screenshot
 * straight away. Thumbnails are signed URLs that stop working after a few
 * minutes: refresh to see them again. Every remaining proof is deleted after
 * Demo Day (scripts/delete-story-proofs.mjs).
 */
export function StoryProofsPanel({ proofs, names }: { proofs: AdminStoryProof[]; names: Map<string, string> }) {
  if (proofs.length === 0) return null;
  const live = proofs.filter((p) => !p.revokedAt).length;
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">Story proofs</h2>
      <p className="text-xs text-muted-foreground">
        {live} live, {proofs.length - live} revoked. A live proof unlocks every style for the team right away: check it shows the poster with{" "}
        {STORY_PROOF_MIN_VIEWS}+ views, and revoke it if not (or if it shows other students&apos; names). Revoking deletes the screenshot.
      </p>
      <ul className="space-y-2">
        {proofs.map((p) => (
          <li key={p.id} className="flex flex-wrap items-start gap-3 rounded-lg border p-3 text-sm">
            {p.imageUrl ? (
              <a href={p.imageUrl} target="_blank" rel="noopener noreferrer" title="Open the full screenshot">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.imageUrl} alt="Instagram Story screenshot" className="h-32 w-20 rounded-md border object-cover" />
              </a>
            ) : (
              <span className="flex h-32 w-20 items-center justify-center rounded-md border text-center text-xs text-muted-foreground">
                {p.revokedAt ? "deleted" : "no image"}
              </span>
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <p>
                <span className="font-medium">{names.get(p.registrationId) ?? "?"}</span>{" "}
                <span className="text-muted-foreground">code {p.code.toUpperCase()}</span>
              </p>
              <p className="text-muted-foreground">uploaded {formatBangkokDateTime(p.uploadedAt, { year: false })}</p>
              {p.revokedAt ? (
                <Badge variant="outline">revoked {formatBangkokDateTime(p.revokedAt, { year: false })}</Badge>
              ) : (
                <Badge variant="secondary">live: all styles unlocked</Badge>
              )}
            </div>
            {!p.revokedAt && <StoryProofRevoke id={p.id} />}
          </li>
        ))}
      </ul>
    </section>
  );
}
