import Link from "next/link";
import { redirect } from "next/navigation";
import { login } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";
import { errorBanner, input, label, panel, primaryButton } from "@/components/theme";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { error, notice } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-wider text-slate-100">
          Contract<span className="text-teal-400">Ops</span>
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-100">
          Log in to your workspace
        </h1>
      </div>

      {notice && <p className="mb-4 rounded-md border border-teal-900/50 bg-teal-950/50 px-4 py-3 text-sm text-teal-300">{notice}</p>}
      {error && <p className={`mb-4 ${errorBanner}`}>{error}</p>}

      <div className={`p-6 ${panel}`}>
        <form action={login} className="space-y-5">
          <div>
            <label className={label}>Email</label>
            <input type="email" name="email" required className={input} />
          </div>
          <div>
            <label className={label}>Password</label>
            <input type="password" name="password" required className={input} />
          </div>
          <button type="submit" className={`w-full ${primaryButton}`}>
            Log in
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-slate-400">
        New company?{" "}
        <Link href="/signup" className="font-medium text-teal-400 hover:underline">
          Create a workspace
        </Link>
      </p>
    </div>
  );
}
