import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type Role = "admin" | "contract_owner" | "management";

export interface CurrentProfile {
  userId: string;
  email: string | null;
  fullName: string | null;
  role: Role;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  isPlatformAdmin: boolean;
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
 *
 * If an admin invited this email address first, join that org with the
 * invited role instead of creating a brand-new one — the DB trigger deletes
 * the consumed invite row once the profile insert succeeds.
 */
export async function provisionOrganization(
  supabase: SupabaseServerClient,
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> },
  overrides?: { companyName?: string; fullName?: string | null },
): Promise<void> {
  const metaFullName = user.user_metadata?.full_name;
  const fullName =
    overrides?.fullName?.trim() ||
    (typeof metaFullName === "string" ? metaFullName.trim() : "") ||
    null;

  if (user.email) {
    const { data: invite } = await supabase
      .from("organization_invites")
      .select("organization_id, role")
      .ilike("email", user.email)
      .maybeSingle();

    if (invite) {
      const { error: joinError } = await supabase.from("profiles").insert({
        id: user.id,
        organization_id: invite.organization_id,
        full_name: fullName,
        email: user.email,
        role: invite.role,
      });

      if (joinError && joinError.code !== "23505") {
        throw new Error(joinError.message);
      }
      return;
    }
  }

  const metaCompanyName = user.user_metadata?.company_name;
  const companyName =
    overrides?.companyName?.trim() ||
    (typeof metaCompanyName === "string" ? metaCompanyName.trim() : "") ||
    (user.email ? user.email.split("@")[0] : "") ||
    "My Company";

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
    email: user.email ?? null,
    role: "admin",
  });

  if (profileError) {
    if (profileError.code === "23505") {
      // A concurrent request (e.g. two near-simultaneous page loads) already
      // created this user's profile first. Drop the now-unused organization
      // we just created and let the caller re-fetch the real one.
      await supabase.from("organizations").delete().eq("id", organizationId);
      return;
    }
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
    .select("full_name, role, is_platform_admin, organizations(id, name, slug)")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.organizations) {
    await provisionOrganization(supabase, user);
    ({ data: profile } = await supabase
      .from("profiles")
      .select("full_name, role, is_platform_admin, organizations(id, name, slug)")
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
    role: (profile.role as Role) ?? "management",
    organizationId: organization.id,
    organizationName: organization.name,
    organizationSlug: organization.slug,
    isPlatformAdmin: profile.is_platform_admin ?? false,
  };
}
