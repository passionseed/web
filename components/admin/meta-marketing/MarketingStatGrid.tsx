export interface MarketingStat {
  label: string;
  value: string;
  note?: string;
}

export function MarketingStatGrid({ stats, label }: { stats: MarketingStat[]; label: string }) {
  return (
    <dl aria-label={label} className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-lg border p-3">
          <dt className="text-xs text-muted-foreground">{stat.label}</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums">{stat.value}</dd>
          {stat.note && <dd className="text-xs text-muted-foreground">{stat.note}</dd>}
        </div>
      ))}
    </dl>
  );
}
