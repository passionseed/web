import type { CompanionToday } from "@/lib/shift/companion-contract";
import { bangkokTime } from "./CompanionRoster";

function safeLink(value: string | null) {
  if (!value) return null;
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}

export function CompanionUpdates({ today }: { today: CompanionToday }) {
  return (
    <section aria-labelledby="updates-heading">
      <h2 id="updates-heading" className="text-xl font-semibold">Today’s updates</h2>
      <p className="mt-2 text-sm text-slate-300">{today.today} · Bangkok · Visible to the author and cohort staff.</p>
      {today.updates.length === 0 && <p className="py-8 text-slate-300">No updates submitted today. Refresh to check again.</p>}
      <div className="divide-y divide-white/10">
        {today.updates.map((u) => {
          const link = safeLink(u.link);
          return <article key={u.id} className="space-y-4 py-6">
            <header>
              <h3 className="break-words font-semibold">{u.author_name}</h3>
              <p className="mt-1 text-sm text-slate-300">Submitted {bangkokTime(u.submitted_at)}{u.revision > 1 ? ` · Edited ${bangkokTime(u.updated_at)}` : ""}</p>
            </header>
            <dl className="space-y-4">
              {[["What they tried", u.tried], ["What they learned", u.learned], ["Where they need help", u.help]].map(([label, value]) => <div key={label}>
                <dt className="text-sm font-medium text-amber-200">{label}</dt>
                <dd className="mt-1 whitespace-pre-wrap break-words text-slate-200">{value || "Not added"}</dd>
              </div>)}
            </dl>
            {link && <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center break-all text-sm text-amber-200 underline underline-offset-4">Open project link</a>}
            {u.image_path && (u.image_url
              // Private Supabase URLs expire and must bypass the public image optimizer.
              // eslint-disable-next-line @next/next/no-img-element
              ? <a href={u.image_url} target="_blank" rel="noopener noreferrer"><img src={u.image_url} alt={`Photo attached to ${u.author_name}’s update`} loading="lazy" referrerPolicy="no-referrer" className="max-h-96 w-full rounded-xl object-contain" /></a>
              : <p className="text-sm text-slate-300">Photo unavailable. Refresh to try again.</p>)}
          </article>;
        })}
      </div>
    </section>
  );
}
