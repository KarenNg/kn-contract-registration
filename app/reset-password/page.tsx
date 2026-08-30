import Link from "next/link";
import { updatePassword } from "@/app/reset-password/actions";
import { createClient } from "@/lib/supabase/server";
import { errorBanner, input, label, panel, primaryButton } from "@/components/theme";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-wider text-slate-900">
          Contract<span className="text-teal-600">Ops</span>
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
          Choose a new password
        </h1>
      </div>

      {error && <p className={`mb-4 ${errorBanner}`}>{error}</p>}

      {user ? (
        <div className={`p-6 ${panel}`}>
          <form action={updatePassword} className="space-y-5">
            <div>
              <label className={label}>New password</label>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                className={input}
              />
            </div>
            <div>
              <label className={label}>Confirm new password</label>
              <input
                type="password"
                name="confirm_password"
                required
                minLength={6}
                className={input}
              />
            </div>
            <button type="submit" className={`w-full ${primaryButton}`}>
              Update password
            </button>
          </form>
        </div>
      ) : (
        <div className={`p-6 ${panel}`}>
          <p className="text-sm text-slate-600">
            Your password reset link is invalid or has expired.
          </p>
          <Link
            href="/forgot-password"
            className="mt-4 inline-block font-medium text-teal-600 hover:underline"
          >
            Request a new link
          </Link>
        </div>
      )}
    </div>
  );
}
