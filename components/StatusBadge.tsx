import type { ContractStatus, VendorStatus } from "@/lib/types";

const CONTRACT_COLORS: Record<ContractStatus, string> = {
  draft: "bg-neutral-100 text-neutral-700",
  active: "bg-green-100 text-green-800",
  renewed: "bg-blue-100 text-blue-800",
  terminated: "bg-red-100 text-red-800",
  expired: "bg-neutral-200 text-neutral-600",
};

const VENDOR_COLORS: Record<VendorStatus, string> = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-neutral-200 text-neutral-600",
};

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${CONTRACT_COLORS[status]}`}
    >
      {status}
    </span>
  );
}

export function VendorStatusBadge({ status }: { status: VendorStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${VENDOR_COLORS[status]}`}
    >
      {status}
    </span>
  );
}

export function ExpiringBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
      Expiring soon
    </span>
  );
}
