import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type Role = "admin" | "contract_owner" | "management";

export interface MembershipSummary {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: Role;
}

export interface CurrentProfile {
  userId: string;
  email: string | null;
  fullName: string | null;
  role: Role;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  isPlatformAdmin: boolean;
  /** Every company this person belongs to — lets them switch without a separate account per company. */
  memberships: MembershipSummary[];
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
 * Creates the profile + first membership for a signed-in user who doesn't
 * have a profile yet. Needed both right after signup and as a self-heal
 * fallback: when the Supabase project requires email confirmation,
 * signUp() returns no session, so nothing can be created until the user
 * actually logs in later.
 *
 * If an admin invited this email address first, join that org (as a new
 * membership) with the invited role instead of creating a brand-new one.
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
      .select("id, organization_id, role")
      .ilike("email", user.email)
      .maybeSingle();

    if (invite) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: user.id,
        active_organization_id: invite.organization_id,
        full_name: fullName,
        email: user.email,
      });

      if (profileError && profileError.code !== "23505") {
        throw new Error(profileError.message);
      }

      const { error: membershipError } = await supabase.from("memberships").insert({
        user_id: user.id,
        organization_id: invite.organization_id,
        role: invite.role,
      });

      if (membershipError && membershipError.code !== "23505") {
        throw new Error(membershipError.message);
      }

      await supabase.from("organization_invites").delete().eq("id", invite.id);
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
    active_organization_id: organizationId,
    full_name: fullName,
    email: user.email ?? null,
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

  const { error: membershipError } = await supabase.from("memberships").insert({
    user_id: user.id,
    organization_id: organizationId,
    role: "admin",
  });

  if (membershipError) {
    throw new Error(membershipError.message);
  }
}

interface RawMembershipRow {
  organization_id: string;
  role: Role;
  organizations: { id: string; name: string; slug: string } | null;
}

export async function requireProfile(): Promise<CurrentProfile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const fetchProfileAndMemberships = async () => {
    const [{ data: profile }, { data: memberships }] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, is_platform_admin, active_organization_id")
        .eq("id", user.id)
        .single(),
      supabase
        .from("memberships")
        .select("organization_id, role, organizations(id, name, slug)")
        .eq("user_id", user.id),
    ]);
    return { profile, memberships: (memberships as RawMembershipRow[] | null) ?? [] };
  };

  let { profile, memberships } = await fetchProfileAndMemberships();

  if (!profile || memberships.length === 0) {
    await provisionOrganization(supabase, user);
    ({ profile, memberships } = await fetchProfileAndMemberships());
  }

  if (!profile || memberships.length === 0) {
    redirect("/login");
  }

  const membershipSummaries: MembershipSummary[] = memberships
    .filter((m) => m.organizations)
    .map((m) => ({
      organizationId: m.organization_id,
      organizationName: m.organizations!.name,
      organizationSlug: m.organizations!.slug,
      role: m.role,
    }));

  const active =
    membershipSummaries.find((m) => m.organizationId === profile.active_organization_id) ??
    membershipSummaries[0];

  if (!active) {
    redirect("/login");
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    fullName: profile.full_name,
    role: active.role,
    organizationId: active.organizationId,
    organizationName: active.organizationName,
    organizationSlug: active.organizationSlug,
    isPlatformAdmin: profile.is_platform_admin ?? false,
    memberships: membershipSummaries,
  };
}
