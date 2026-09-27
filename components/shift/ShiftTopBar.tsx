import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Floating top bar for the /shift pages: the logo goes home, the back pill
 * goes one level up (round page to gallery, apply form to round page).
 * Both sit on dark glass so they stay legible over every round's hero, from
 * the pale pixel sky to the riso night.
 */

const PILL =
  "inline-flex items-center gap-2 rounded-full border border-white/15 bg-[rgba(12,8,24,0.55)] px-3 py-1.5 text-sm font-semibold text-[#f8f5ec] backdrop-blur-md transition-colors hover:bg-[rgba(12,8,24,0.75)]";

export function ShiftTopBar({
  back,
}: {
  /** Where the back pill goes; omit to hide it. */
  back?: { href: string; label: string };
}) {
  return (
    <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-3 px-4 pt-4 sm:px-8 sm:pt-6">
      <Link
        href="/"
        aria-label="PassionSeed หน้าแรก"
        className={`${PILL} !pl-1.5`}
      >
        <Image
          src="/passion-seed-logo.png"
          alt=""
          width={28}
          height={28}
          unoptimized
          className="shrink-0"
        />
        <span className="font-kodchasan">PassionSeed</span>
      </Link>
      {back && (
        <Link href={back.href} className={PILL}>
          <ArrowLeft className="h-4 w-4" />
          {back.label}
        </Link>
      )}
    </div>
  );
}
