// Shared design tokens — enterprise console styling in the spirit of the SAP and
// AWS web properties: light gray canvas, squid-ink header, SAP-blue links, AWS-orange
// primary actions. Keep every screen pulling from here so the app reads as one product.

export const panel = "rounded border border-slate-200 bg-white shadow-sm";
export const panelHeader = "border-b border-slate-200 bg-slate-50 px-6 py-3";

export const input =
  "mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-[#0972D3] focus:outline-none focus:ring-1 focus:ring-[#0972D3]";
export const label = "block text-sm font-medium text-slate-700";

export const primaryButton =
  "rounded bg-[#EC7211] px-4 py-2 text-sm font-semibold text-white hover:bg-[#C05601]";
export const secondaryButton =
  "rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";
export const dangerLink = "text-sm font-semibold text-red-600 hover:underline";

export const tableWrap = `overflow-hidden ${panel}`;
export const th =
  "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50";
export const td = "px-4 py-3 text-slate-600";
export const tr = "border-t border-slate-100 hover:bg-slate-50";
export const code = "font-mono text-xs text-slate-500";

export const errorBanner =
  "rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700";

/** Left border stripe encoding contract severity at a glance — red flags anything urgent. */
export function severityStripe(status: string, expiringSoon: boolean): string {
  if (expiringSoon || status === "expired") return "border-l-4 border-l-red-600";
  if (status === "active" || status === "renewed") return "border-l-4 border-l-emerald-500";
  if (status === "terminated") return "border-l-4 border-l-red-300";
  return "border-l-4 border-l-slate-200";
}
