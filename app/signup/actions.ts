"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return base || "company";
}

export async function signUp(formData: FormData) {
  const companyName = String(formData.get("company_name") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!companyName || !email || !password) {
    throw new Error("Company name, email, and password are required");
  }

  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });

  if (authError) {
    redirect(`/signup?error=${encodeURIComponent(authError.message)}`);
  }

  if (!authData.user || !authData.session) {
    redirect(
      `/login?notice=${encodeURIComponent("Check your email to confirm your account, then log in.")}`,
    );
  }

  const baseSlug = slugify(companyName);
  let slug = baseSlug;
  let organizationId: string | null = null;

  for (let attempt = 0; attempt < 5 && !organizationId; attempt++) {
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({ name: companyName, slug })
      .select("id")
      .single();

    if (org) {
      organizationId = org.id;
    } else if (orgError?.code === "23505") {
      slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    } else if (orgError) {
      throw new Error(orgError.message);
    }
  }

  if (!organizationId) {
    throw new Error("Could not create your workspace. Please try again.");
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: authData.user.id,
    organization_id: organizationId,
    full_name: fullName || null,
    role: "owner",
  });

  if (profileError) {
    throw new Error(profileError.message);
  }

  redirect("/");
}
