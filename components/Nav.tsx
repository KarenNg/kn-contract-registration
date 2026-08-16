"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/logout-action";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/vendors", label: "Vendors" },
  { href: "/contracts", label: "Contracts" },
  { href: "/applications", label: "Applications" },
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

  return (
    <header className="bg-[#1B2A6E]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-base font-extrabold uppercase tracking-wider text-white">
            Contract<span className="text-teal-300">Ops</span>
          </Link>
          <span className="hidden text-xs font-semibold text-indigo-200 sm:inline">
            {organizationName}
          </span>
        </div>
        <nav className="flex items-center gap-1 text-sm font-bold">
          {LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
                  active
                    ? "bg-white/15 text-white"
                    : "text-indigo-200 hover:text-white"
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
              className={`rounded-md px-3 py-1.5 transition-colors ${
                pathname.startsWith("/admin")
                  ? "bg-white/15 text-white"
                  : "text-indigo-200 hover:text-white"
              }`}
            >
              Admin
            </Link>
          )}
          <Link
            href={`/apply/${organizationSlug}`}
            className="ml-2 rounded-md border border-teal-300 px-3 py-1.5 text-teal-200 transition-colors hover:bg-white/10 hover:text-white"
          >
            Apply as a vendor →
          </Link>
          <div className="ml-3 flex items-center gap-2 border-l border-white/20 pl-3">
            {email && <span className="hidden text-xs font-medium text-indigo-200 lg:inline">{email}</span>}
            <form action={logout}>
              <button
                type="submit"
                className="rounded-md px-3 py-1.5 text-indigo-200 transition-colors hover:bg-white/10 hover:text-white"
              >
                Log out
              </button>
            </form>
          </div>
        </nav>
      </div>
    </header>
  );
}
