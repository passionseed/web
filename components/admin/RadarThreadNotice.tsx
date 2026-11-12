/**
 * Shown instead of the reply box on a Radar-origin DM thread (spec 5.6).
 * Students who asked for a Career Radar link only ever get the fixed Radar
 * templates; the server refuses free text to these threads anyway.
 */
export function RadarThreadNotice() {
  return (
    <p className="rounded border border-sky-500/30 bg-sky-500/10 px-2 py-1.5 text-xs text-sky-800 dark:text-sky-300">
      Radar thread: read-only. Students who asked for a Career Radar link only get the fixed Radar
      replies, so free-text replies, scripts and drafts are off here.
    </p>
  );
}
