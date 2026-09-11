"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { provisionOrganization } from "@/lib/auth";

export async function signUp(formData: FormData) {
  const companyName = String(formData.get("company_name") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!companyName || !email || !password) {
    throw new Error("Company name, email, and password are required");
  }

  const headerList = await headers();
  const origin =
    headerList.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Stored so provisionOrganization can create the workspace later if
      // this project requires email confirmation and no session comes back
      // below. emailRedirectTo must match wherever this request actually
      // came from (prod domain or a Vercel preview) — without it Supabase
      // falls back to the project's Site URL default, which sends every
      // confirmation link to localhost regardless of where signup happened.
      data: { company_name: companyName, full_name: fullName || null },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (authError) {
    redirect(`/signup?error=${encodeURIComponent(authError.message)}`);
  }

  if (!authData.user || !authData.session) {
    redirect(
      `/login?notice=${encodeURIComponent("Check your email to confirm your account, then log in to finish setting up your workspace.")}`,
    );
  }

  await provisionOrganization(supabase, authData.user, { companyName, fullName });

  redirect("/");
}
