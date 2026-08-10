"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/logout-action";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/vendors", label: "Vendors" },
  { href: "/contracts", label: "Contracts" },
  { href: "/applications", label: "Applications" },
];

export function Nav({
  organizationName,
  organizationSlug,
  email,
}: {
  organizationName: string;
  organizationSlug: string;
  email: string | null;
}) {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-800 bg-slate-900">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm font-bold uppercase tracking-wider text-slate-100">
            Contract<span className="text-teal-400">Ops</span>
          </Link>
          <span className="hidden text-xs font-medium text-slate-500 sm:inline">
            {organizationName}
          </span>
        </div>
        <nav className="flex items-center gap-1 text-sm font-medium">
          {LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-1.5 transition-colors ${
                  active
                    ? "bg-slate-800 text-teal-400"
                    : "text-slate-400 hover:text-slate-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href={`/apply/${organizationSlug}`}
            className="ml-2 rounded-md border border-teal-700 px-3 py-1.5 text-teal-400 transition-colors hover:bg-teal-950"
          >
            Apply as a vendor →
          </Link>
          <div className="ml-3 flex items-center gap-2 border-l border-slate-800 pl-3">
            {email && <span className="hidden text-xs text-slate-500 lg:inline">{email}</span>}
            <form action={logout}>
              <button
                type="submit"
                className="rounded-md px-3 py-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
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
