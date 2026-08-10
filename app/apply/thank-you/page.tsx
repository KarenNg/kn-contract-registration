import Link from "next/link";
import { panel, primaryButton } from "@/components/theme";

export default async function ApplyThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  return (
    <div className={`max-w-xl space-y-4 p-8 text-center ${panel}`}>
      <p className="text-4xl">✅</p>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Application submitted</h1>
      {code && (
        <p className="text-sm text-slate-400">
          Your reference number is <span className="font-mono text-teal-400">{code}</span>. Keep it
          handy if you follow up with us.
        </p>
      )}
      <p className="text-sm text-slate-400">
        A contract administrator will review your application shortly.
      </p>
      <div className="pt-2">
        <Link href="/" className={primaryButton}>
          Back to home
        </Link>
      </div>
    </div>
  );
}
