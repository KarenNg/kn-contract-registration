import { panel } from "@/components/theme";

export const dynamic = "force-dynamic";

export default async function ApplyThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  return (
    <div className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-16">
      <div className={`w-full space-y-4 p-8 text-center ${panel}`}>
        <p className="text-4xl">✅</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Application submitted</h1>
        {code && (
          <p className="text-sm text-slate-400">
            Your reference number is <span className="font-mono text-teal-400">{code}</span>. Keep
            it handy if you follow up.
          </p>
        )}
        <p className="text-sm text-slate-400">
          A contract administrator will review your application shortly. You can close this page.
        </p>
      </div>
    </div>
  );
}
