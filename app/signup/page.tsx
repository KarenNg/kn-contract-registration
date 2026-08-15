import Link from "next/link";
import { redirect } from "next/navigation";
import { signUp } from "@/app/signup/actions";
import { createClient } from "@/lib/supabase/server";
import { errorBanner, input, label, panel, primaryButton } from "@/components/theme";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

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
        <p className="text-sm font-bold uppercase tracking-wider text-slate-900">
          Contract<span className="text-teal-600">Ops</span>
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
          Create your workspace
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Your own private space for vendors, contracts, and vendor applications.
        </p>
      </div>

      {error && <p className={`mb-4 ${errorBanner}`}>{error}</p>}

      <div className={`p-6 ${panel}`}>
        <form action={signUp} className="space-y-5">
          <div>
            <label className={label}>Company name</label>
            <input name="company_name" required className={input} />
          </div>
          <div>
            <label className={label}>Your name</label>
            <input name="full_name" className={input} />
          </div>
          <div>
            <label className={label}>Email</label>
            <input type="email" name="email" required className={input} />
          </div>
          <div>
            <label className={label}>Password</label>
            <input type="password" name="password" required minLength={6} className={input} />
          </div>
          <button type="submit" className={`w-full ${primaryButton}`}>
            Create workspace
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have a workspace?{" "}
        <Link href="/login" className="font-medium text-teal-600 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
