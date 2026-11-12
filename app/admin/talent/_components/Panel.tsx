import type { ReactNode } from "react";

/**
 * A titled section on /admin/talent, styled with the admin shell's semantic
 * tokens. Server component, no interactivity needed.
 */
interface PanelProps {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  /** Filter links or other controls under the heading. */
  toolbar?: ReactNode;
  children: ReactNode;
}

export function Panel({ id, eyebrow, title, description, toolbar, children }: PanelProps) {
  return (
    <section aria-labelledby={id} className="overflow-hidden rounded-lg border">
      <header className="space-y-1 border-b px-4 py-4 sm:px-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{eyebrow}</p>
        <h2 id={id} className="text-lg font-semibold">
          {title}
        </h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        {toolbar && <div className="pt-2">{toolbar}</div>}
      </header>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}
