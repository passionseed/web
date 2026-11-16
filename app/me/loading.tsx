/** Same shape as /me: island picture, hero copy and button, then the Radar tiles. */
const BAR = "ei-skeleton animate-pulse rounded-md bg-white/[0.07]";

export default function Loading() {
  return (
    <div
      className="dawn-theme min-h-screen bg-[linear-gradient(180deg,#020617_0%,#0f172a_50%,#0f2942_100%)]"
      role="status"
      aria-label="กำลังโหลด"
      aria-live="polite"
    >
      <span className="sr-only">กำลังโหลด</span>
      <div className="container mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10 lg:py-14">
        <div className="ei-card ei-card--static overflow-hidden p-0">
          <div className={`${BAR} aspect-[1216/704] w-full rounded-none`} />
          <div className="grid gap-4 p-5 sm:p-9">
            <div className={`${BAR} h-3 w-36`} />
            <div className={`${BAR} h-9 w-full max-w-lg`} />
            <div className={`${BAR} h-5 w-full max-w-xl`} />
            <div className={`${BAR} h-10 w-64`} />
            <div className={`${BAR} mt-3 h-12 w-36`} />
          </div>
        </div>
        <div className="mt-12 grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((tile) => (
            <div key={tile} className={`${BAR} h-20 w-full rounded-xl`} />
          ))}
        </div>
      </div>
    </div>
  );
}
