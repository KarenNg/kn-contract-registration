import type { ApplicationStatus, ContractStatus, PerformanceRating, RiskTier, StrategicTier, VendorStatus } from "@/lib/types";

const CONTRACT_COLORS: Record<ContractStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  active: "bg-emerald-100 text-emerald-700",
  renewed: "bg-blue-100 text-blue-700",
  terminated: "bg-red-100 text-red-700",
  expired: "bg-red-600 text-white",
};

const VENDOR_COLORS: Record<VendorStatus, string> = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-slate-100 text-slate-600",
};

const RISK_COLORS: Record<RiskTier, string> = {
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-700",
};

const STRATEGIC_COLORS: Record<StrategicTier, string> = {
  strategic: "bg-purple-100 text-purple-700",
  tactical: "bg-blue-100 text-blue-700",
  commodity: "bg-slate-100 text-slate-600",
};

const PERFORMANCE_COLORS: Record<PerformanceRating, string> = {
  excellent: "bg-emerald-100 text-emerald-700",
  good: "bg-blue-100 text-blue-700",
  fair: "bg-yellow-100 text-yellow-800",
  poor: "bg-red-100 text-red-700",
};

const APPLICATION_COLORS: Record<ApplicationStatus, string> = {
  submitted: "bg-sky-100 text-sky-700",
  under_review: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

const chip =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide";

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  return <span className={`${chip} ${CONTRACT_COLORS[status]}`}>{status}</span>;
}

export function VendorStatusBadge({ status }: { status: VendorStatus }) {
  return <span className={`${chip} ${VENDOR_COLORS[status]}`}>{status}</span>;
}

export function RiskTierBadge({ tier }: { tier: RiskTier | null }) {
  if (!tier) return <span className="text-xs text-slate-400">Not rated</span>;
  return <span className={`${chip} ${RISK_COLORS[tier]}`}>{tier}</span>;
}

export function StrategicTierBadge({ tier }: { tier: StrategicTier | null }) {
  if (!tier) return <span className="text-xs text-slate-400">Not segmented</span>;
  return <span className={`${chip} ${STRATEGIC_COLORS[tier]}`}>{tier}</span>;
}

export function PerformanceRatingBadge({ rating }: { rating: PerformanceRating | null }) {
  if (!rating) return <span className="text-xs text-slate-400">Not rated</span>;
  return <span className={`${chip} ${PERFORMANCE_COLORS[rating]}`}>{rating}</span>;
}

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className={`${chip} ${APPLICATION_COLORS[status]}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function ExpiringBadge() {
  return (
    <span className={`${chip} bg-red-600 text-white`}>⚠ Expiring soon</span>
  );
}
