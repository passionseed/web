import type { ReactNode } from "react";

/** The staff workspace look (as the SHIFT Companion's staff page), for the staff canvas pages. */
export function StaffShell({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <main className="dusk-theme dark min-h-screen bg-[var(--dusk-space-950)] px-4 py-8 font-bai-jamjuree text-foreground sm:px-8 sm:py-12">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="text-sm text-amber-200">Staff workspace</p>
          <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
          {description && <div className="mt-2 max-w-3xl text-sm text-muted-foreground">{description}</div>}
        </header>
        {children}
      </div>
    </main>
  );
}

/** Shown to signed-in people without a SHIFT role. */
export function NoCanvasAccess() {
  return (
    <StaffShell title="Staff access required">
      <p className="max-w-xl text-sm">
        SHIFT canvases are for SHIFT staff and mentors. Ask a SHIFT admin to add you as staff or as a round&apos;s mentor in
        Admin, SHIFT, Rounds, Settings.
      </p>
    </StaffShell>
  );
}
