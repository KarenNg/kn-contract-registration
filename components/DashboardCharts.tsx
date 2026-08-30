import { panel } from "@/components/theme";

interface Segment {
  label: string;
  value: number;
  color: string;
}

/** Part-to-whole status breakdown: one stacked bar + a legend with counts and percentages. */
export function ContractStatusChart({ total, segments }: { total: number; segments: Segment[] }) {
  const shown = segments.filter((s) => s.value > 0);

  return (
    <div className={`${panel} p-5`}>
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Contract portfolio</p>
        <p className="text-2xl font-bold tabular-nums text-slate-900">{total}</p>
      </div>
      <p className="text-xs text-slate-400">total contracts registered</p>

      <div className="mt-4 flex h-4 w-full overflow-hidden rounded-full bg-slate-100" role="img" aria-label={shown.map((s) => `${s.label}: ${s.value}`).join(", ")}>
        {total === 0 ? null : (
          shown.map((s, i) => (
            <div
              key={s.label}
              style={{ width: `${(s.value / total) * 100}%` }}
              className={`h-full ${s.color} ${i > 0 ? "ml-0.5" : ""}`}
              title={`${s.label}: ${s.value} (${Math.round((s.value / total) * 100)}%)`}
            />
          ))
        )}
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3">
        {segments.map((s) => (
          <div key={s.label}>
            <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${s.color}`} />
              {s.label}
            </dt>
            <dd className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">
              {s.value}
              <span className="ml-1 text-xs font-medium text-slate-400">
                {total > 0 ? `${Math.round((s.value / total) * 100)}%` : "—"}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Sequential bar chart for active contracts expiring within widening horizons. */
export function ExpiringHorizonChart({ segments }: { segments: Segment[] }) {
  const max = Math.max(1, ...segments.map((s) => s.value));

  return (
    <div className={`${panel} p-5`}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Contract expiry outlook</p>
      <p className="text-xs text-slate-400">
        by end date, from today — Draft hasn&apos;t started, Expired and Terminated are already closed; the remaining bars are exclusive ranges covering every active contract
      </p>

      <div className="mt-5 flex items-end gap-2.5 px-1" style={{ height: 120 }}>
        {segments.map((s) => (
          <div key={s.label} className="flex flex-1 flex-col items-center gap-2" title={`${s.label}: ${s.value} contract${s.value === 1 ? "" : "s"}`}>
            <span className="text-base font-bold tabular-nums text-slate-900">{s.value}</span>
            <div
              style={{ height: `${Math.max(6, (s.value / max) * 88)}px` }}
              className={`w-full max-w-[44px] rounded-t ${s.color}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2.5 px-1">
        {segments.map((s) => (
          <div key={s.label} className="flex-1 text-center text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-500">
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}
