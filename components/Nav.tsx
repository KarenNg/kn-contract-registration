"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/logout-action";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/vendors", label: "Vendors" },
  { href: "/contracts", label: "Contracts" },
  { href: "/requests", label: "Requests" },
  { href: "/alerts", label: "Alerts" },
];

export function Nav({
  organizationName,
  organizationSlug,
  email,
  isPlatformAdmin,
  alertCount,
}: {
  organizationName: string;
  organizationSlug: string;
  email: string | null;
  isPlatformAdmin: boolean;
  alertCount?: number;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-[#232F3E]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/" className="shrink-0 text-base font-bold tracking-tight text-white">
            Contract<span className="text-[#EC7211]">Ops</span>
          </Link>
          <span className="hidden truncate border-l border-white/20 pl-4 text-xs font-medium text-slate-300 sm:inline">
            {organizationName}
          </span>
        </div>

        <nav className="hidden items-center gap-1 text-sm font-medium md:flex">
          {LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-1.5 transition-colors ${
                  active
                    ? "border-[#EC7211] text-white"
                    : "border-transparent text-slate-300 hover:border-white/30 hover:text-white"
                }`}
              >
                {link.label}
                {link.href === "/alerts" && !!alertCount && (
                  <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                    {alertCount}
                  </span>
                )}
              </Link>
            );
          })}
          {isPlatformAdmin && (
            <Link
              href="/admin"
              className={`border-b-2 px-3 py-1.5 transition-colors ${
                pathname.startsWith("/admin")
                  ? "border-[#EC7211] text-white"
                  : "border-transparent text-slate-300 hover:border-white/30 hover:text-white"
              }`}
            >
              Admin
            </Link>
          )}
          <Link
            href={`/apply/${organizationSlug}`}
            className="ml-2 rounded border border-[#0972D3] px-3 py-1.5 text-[#7CC5FF] transition-colors hover:bg-white/10 hover:text-white"
          >
            Apply as a vendor →
          </Link>
          <div className="ml-3 flex items-center gap-2 border-l border-white/20 pl-3">
            {email && <span className="hidden text-xs font-medium text-slate-300 lg:inline">{email}</span>}
            <form action={logout}>
              <button
                type="submit"
                className="rounded px-3 py-1.5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                Log out
              </button>
            </form>
          </div>
        </nav>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded text-slate-200 hover:bg-white/10 md:hidden"
        >
          {menuOpen ? (
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
              <path d="M3 5.5h14M3 10h14M3 14.5h14" strokeLinecap="round" />
            </svg>
          )}
          {!!alertCount && !menuOpen && (
            <span className="absolute right-0.5 top-0.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-extrabold text-white">
              {alertCount}
            </span>
          )}
        </button>
      </div>

      {menuOpen && (
        <nav id="mobile-nav" className="border-t border-white/10 px-4 pb-4 pt-2 text-sm font-medium md:hidden">
          <p className="truncate px-1 pb-2 text-xs font-medium text-slate-400">{organizationName}</p>
          <div className="flex flex-col gap-0.5">
            {LINKS.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center justify-between rounded px-3 py-2.5 ${
                    active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {link.label}
                  {link.href === "/alerts" && !!alertCount && (
                    <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                      {alertCount}
                    </span>
                  )}
                </Link>
              );
            })}
            {isPlatformAdmin && (
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                className={`rounded px-3 py-2.5 ${
                  pathname.startsWith("/admin") ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                Admin
              </Link>
            )}
            <Link
              href={`/apply/${organizationSlug}`}
              onClick={() => setMenuOpen(false)}
              className="mt-2 rounded border border-[#0972D3] px-3 py-2.5 text-center text-[#7CC5FF] hover:bg-white/10 hover:text-white"
            >
              Apply as a vendor →
            </Link>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
            {email && <span className="truncate text-xs font-medium text-slate-300">{email}</span>}
            <form action={logout} className="shrink-0">
              <button type="submit" className="rounded px-3 py-2 text-slate-300 hover:bg-white/10 hover:text-white">
                Log out
              </button>
            </form>
          </div>
        </nav>
      )}
    </header>
  );
}
