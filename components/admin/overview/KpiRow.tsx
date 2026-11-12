import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";

import type { AdminKpi } from "@/lib/admin/console";

import {
  formatBaht,
  formatKpiValue,
  formatNumber,
  kpiDelta,
  percentOf,
  type KpiDelta,
} from "./format";
import { describeSeries, Sparkline } from "./Sparkline";

/**
 * The overview's single divided statistics row: one cell per KPI, divided by
 * hairlines, no card or accent colour per metric. Server-renderable.
 */
export function KpiRow({ kpis }: { kpis: readonly AdminKpi[] }) {
  if (kpis.length === 0) {
    return (
      <p className="overview-quiet overview-kpi-empty">
        Key numbers are not available right now. Every tool still works.
      </p>
    );
  }
  return (
    <ul className="overview-kpi-grid">
      {kpis.map((kpi) => (
        <li key={kpi.key} className="overview-kpi-item">
          <KpiCell kpi={kpi} />
        </li>
      ))}
    </ul>
  );
}

function KpiCell({ kpi }: { kpi: AdminKpi }) {
  const value = formatKpiValue(kpi);
  const series = kpi.series ?? [];
  const formatPoint = kpi.format === "baht" ? formatBaht : formatNumber;
  const showMeter = kpi.format === "ratio" && kpi.value !== null && (kpi.total ?? 0) > 0;

  const content = (
    <>
      <span className="overview-kpi-label">{kpi.label}</span>
      <span className="overview-kpi-body">
        <KpiValue value={value} />
        {series.length > 1 && (
          <Sparkline series={series} label={describeSeries(series, formatPoint)} />
        )}
      </span>
      {showMeter && <KpiMeter value={kpi.value ?? 0} total={kpi.total ?? 0} />}
      <KpiDeltaBadge delta={kpiDelta(kpi.value, kpi.previous, kpi.format)} />
    </>
  );

  return <KpiFrame href={kpi.href} hint={kpi.hint}>{content}</KpiFrame>;
}

/** The hint rides on `title`, which also becomes the accessible description. */
function KpiFrame({
  href,
  hint,
  children,
}: {
  href?: string;
  hint?: string;
  children: ReactNode;
}) {
  if (href) {
    return (
      <Link href={href} className="overview-kpi" title={hint}>
        {children}
      </Link>
    );
  }
  return (
    <div className="overview-kpi" title={hint}>
      {children}
    </div>
  );
}

function KpiValue({ value }: { value: ReturnType<typeof formatKpiValue> }) {
  if (!value) {
    return <span className="overview-kpi-value overview-kpi-missing">Unavailable</span>;
  }
  if (!value.spoken) return <span className="overview-kpi-value">{value.text}</span>;
  return (
    <span className="overview-kpi-value">
      <span aria-hidden="true">{value.text}</span>
      <span className="sr-only">{value.spoken}</span>
    </span>
  );
}

function KpiMeter({ value, total }: { value: number; total: number }) {
  return (
    <span className="overview-meter" aria-hidden="true">
      <span style={{ width: `${percentOf(value, total)}%` }} />
    </span>
  );
}

const DELTA_ICON = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: ArrowRight,
} as const;

/** "+12% vs prior period" with an arrow; colour is never the only signal. */
export function KpiDeltaBadge({ delta }: { delta: KpiDelta | null }) {
  if (!delta) return null;
  const Icon = DELTA_ICON[delta.direction];
  return (
    <span className="overview-delta" data-direction={delta.direction}>
      <Icon size={14} strokeWidth={2} aria-hidden="true" />
      <span aria-hidden="true">{delta.label}</span>
      <span className="overview-delta-context" aria-hidden="true">
        vs prior period
      </span>
      <span className="sr-only">{delta.description}</span>
    </span>
  );
}

/** Same grid, same heights: no layout shift when the numbers stream in. */
export function KpiRowSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div aria-busy="true">
      <span className="sr-only" role="status">
        Loading key numbers
      </span>
      <ul className="overview-kpi-grid" aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <li key={i} className="overview-kpi-item">
            <span className="overview-kpi">
              <span className="overview-skeleton" style={{ width: 96, height: 12 }} />
              <span className="overview-skeleton" style={{ width: 120, height: 32 }} />
              <span className="overview-skeleton" style={{ width: 72, height: 12 }} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
