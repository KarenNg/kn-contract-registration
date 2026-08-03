// Shared "Control Room" design tokens — dark, KPI-first, severity-striped.
// Keep every screen pulling from here so the app reads as one product.

export const panel = "rounded-lg border border-slate-800 bg-slate-900";
export const panelHeader = "border-b border-slate-800 bg-slate-800/40 px-6 py-3";

export const input =
  "mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500";
export const label = "block text-sm font-medium text-slate-300";

export const primaryButton =
  "rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500";
export const secondaryButton =
  "rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800";
export const dangerLink = "text-sm font-medium text-red-400 hover:underline";

export const tableWrap = `overflow-hidden ${panel}`;
export const th =
  "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500";
export const td = "px-4 py-3 text-slate-400";
export const tr = "border-t border-slate-800 hover:bg-slate-800/50";
export const code = "font-mono text-xs text-slate-500";

export const errorBanner =
  "rounded-md border border-red-900/50 bg-red-950/50 px-4 py-3 text-sm text-red-300";

/** Left border stripe encoding contract severity at a glance. */
export function severityStripe(status: string, expiringSoon: boolean): string {
  if (expiringSoon) return "border-l-4 border-l-amber-500";
  if (status === "active" || status === "renewed") return "border-l-4 border-l-emerald-500";
  if (status === "terminated") return "border-l-4 border-l-red-500";
  return "border-l-4 border-l-slate-700";
}
