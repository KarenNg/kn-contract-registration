import type { ContractStatus, VendorStatus } from "@/lib/types";

const CONTRACT_COLORS: Record<ContractStatus, string> = {
  draft: "bg-slate-500/15 text-slate-300",
  active: "bg-emerald-400/15 text-emerald-400",
  renewed: "bg-teal-400/15 text-teal-400",
  terminated: "bg-red-400/15 text-red-400",
  expired: "bg-slate-600/20 text-slate-400",
};

const VENDOR_COLORS: Record<VendorStatus, string> = {
  active: "bg-emerald-400/15 text-emerald-400",
  inactive: "bg-slate-600/20 text-slate-400",
};

const chip =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide";

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  return <span className={`${chip} ${CONTRACT_COLORS[status]}`}>{status}</span>;
}

export function VendorStatusBadge({ status }: { status: VendorStatus }) {
  return <span className={`${chip} ${VENDOR_COLORS[status]}`}>{status}</span>;
}

export function ExpiringBadge() {
  return (
    <span className={`${chip} bg-amber-400/15 text-amber-400`}>⚠ Expiring soon</span>
  );
}
