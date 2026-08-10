import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface CurrentProfile {
  userId: string;
  email: string | null;
  fullName: string | null;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
}

export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return base || "company";
}

/**
 * Creates the organization + profile for a signed-in user who doesn't have one
 * yet. Needed both right after signup and as a self-heal fallback: when the
 * Supabase project requires email confirmation, signUp() returns no session,
 * so the org can't be created until the user actually logs in later.
 */
export async function provisionOrganization(
  supabase: SupabaseServerClient,
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> },
  overrides?: { companyName?: string; fullName?: string | null },
): Promise<void> {
  const metaCompanyName = user.user_metadata?.company_name;
  const metaFullName = user.user_metadata?.full_name;

  const companyName =
    overrides?.companyName?.trim() ||
    (typeof metaCompanyName === "string" ? metaCompanyName.trim() : "") ||
    (user.email ? user.email.split("@")[0] : "") ||
    "My Company";

  const fullName =
    overrides?.fullName?.trim() ||
    (typeof metaFullName === "string" ? metaFullName.trim() : "") ||
    null;

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
    id: user.id,
    organization_id: organizationId,
    full_name: fullName,
    role: "owner",
  });

  if (profileError) {
    throw new Error(profileError.message);
  }
}

export async function requireProfile(): Promise<CurrentProfile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let { data: profile } = await supabase
    .from("profiles")
    .select("full_name, organizations(id, name, slug)")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.organizations) {
    await provisionOrganization(supabase, user);
    ({ data: profile } = await supabase
      .from("profiles")
      .select("full_name, organizations(id, name, slug)")
      .eq("id", user.id)
      .single());
  }

  if (!profile || !profile.organizations) {
    redirect("/login");
  }

  const organization = profile.organizations as unknown as {
    id: string;
    name: string;
    slug: string;
  };

  return {
    userId: user.id,
    email: user.email ?? null,
    fullName: profile.full_name,
    organizationId: organization.id,
    organizationName: organization.name,
    organizationSlug: organization.slug,
  };
}
