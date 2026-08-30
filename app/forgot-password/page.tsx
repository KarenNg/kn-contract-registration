import Link from "next/link";
import { requestPasswordReset } from "@/app/forgot-password/actions";
import { errorBanner, input, label, panel, primaryButton } from "@/components/theme";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-wider text-slate-900">
          Contract<span className="text-blue-600">Ops</span>
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
          Reset your password
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      {error && <p className={`mb-4 ${errorBanner}`}>{error}</p>}

      <div className={`p-6 ${panel}`}>
        <form action={requestPasswordReset} className="space-y-5">
          <div>
            <label className={label}>Email</label>
            <input type="email" name="email" required className={input} />
          </div>
          <button type="submit" className={`w-full ${primaryButton}`}>
            Send reset link
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href="/login" className="font-medium text-blue-600 hover:underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
