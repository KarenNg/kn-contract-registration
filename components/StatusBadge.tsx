import type { ApplicationStatus, ContractStatus, VendorStatus } from "@/lib/types";

const CONTRACT_COLORS: Record<ContractStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  active: "bg-emerald-100 text-emerald-700",
  renewed: "bg-teal-100 text-teal-700",
  terminated: "bg-red-100 text-red-700",
  expired: "bg-red-600 text-white",
};

const VENDOR_COLORS: Record<VendorStatus, string> = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-slate-100 text-slate-600",
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
