import { panel } from "@/components/theme";
import { formatCurrency } from "@/lib/format";

interface Segment {
  label: string;
  value: number;
  color: string;
}

interface VendorSpend {
  id: string;
  code: string;
  name: string;
  value: number;
  count: number;
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

/** Ranked list of the top vendors by contract value, with each vendor's share of the total. */
export function VendorConcentrationChart({
  vendors,
  totalValue,
  currency,
}: {
  vendors: VendorSpend[];
  totalValue: number;
  currency: string;
}) {
  const max = Math.max(1, ...vendors.map((v) => v.value));
  const topSum = vendors.reduce((sum, v) => sum + v.value, 0);
  const share = totalValue > 0 ? Math.round((topSum / totalValue) * 100) : 0;

  return (
    <div className={`${panel} flex flex-col p-5`}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Vendor concentration</p>
      <p className="text-xs text-slate-400">top vendors by contract value on file</p>

      <div className="mt-4 flex-1 space-y-3">
        {vendors.map((v, i) => (
          <div key={v.id} className="grid grid-cols-[20px_1fr_auto] items-center gap-2.5">
            <span className="text-[11px] font-bold tabular-nums text-slate-400">{String(i + 1).padStart(2, "0")}</span>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5 text-xs">
                <span className="font-mono text-[10px] text-slate-400">{v.code}</span>
                <span className="truncate font-semibold text-slate-900">{v.name}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#0972D3]"
                  style={{ width: `${(v.value / max) * 100}%` }}
                />
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold tabular-nums text-slate-900">{formatCurrency(v.value, currency)}</p>
              <p className="text-[10px] font-medium tabular-nums text-slate-400">
                {v.count} contract{v.count === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        ))}
        {vendors.length === 0 && <p className="text-sm text-slate-400">No contract value on file yet.</p>}
      </div>

      {totalValue > 0 && vendors.length > 0 && (
        <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
          Top {vendors.length} vendor{vendors.length === 1 ? "" : "s"} account for{" "}
          <span className="font-bold text-slate-900">{share}%</span> of the{" "}
          <span className="font-bold text-slate-900">{formatCurrency(totalValue, currency)}</span> on file.
        </p>
      )}
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

      <div className="-mx-1 mt-5 overflow-x-auto px-1">
        <div className="flex items-end gap-2.5" style={{ height: 120 }}>
          {segments.map((s) => (
            <div
              key={s.label}
              className="flex w-14 shrink-0 sm:shrink flex-col items-center gap-2 sm:w-auto sm:flex-1"
              title={`${s.label}: ${s.value} contract${s.value === 1 ? "" : "s"}`}
            >
              <span className="text-base font-bold tabular-nums text-slate-900">{s.value}</span>
              <div
                style={{ height: `${Math.max(6, (s.value / max) * 88)}px` }}
                className={`w-full max-w-[44px] rounded-t ${s.color}`}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2.5">
          {segments.map((s) => (
            <div
              key={s.label}
              className="w-14 shrink-0 sm:shrink text-center text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-500 sm:w-auto sm:flex-1"
            >
              {s.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
