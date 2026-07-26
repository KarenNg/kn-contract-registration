import Link from "next/link";

export function Nav() {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-neutral-900">
          Contract Registration
        </Link>
        <nav className="flex gap-6 text-sm font-medium text-neutral-600">
          <Link href="/" className="hover:text-neutral-900">
            Dashboard
          </Link>
          <Link href="/vendors" className="hover:text-neutral-900">
            Vendors
          </Link>
          <Link href="/contracts" className="hover:text-neutral-900">
            Contracts
          </Link>
        </nav>
      </div>
    </header>
  );
}
