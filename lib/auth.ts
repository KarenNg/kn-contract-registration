import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface CurrentProfile {
  userId: string;
  email: string | null;
  fullName: string | null;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
}

export async function requireProfile(): Promise<CurrentProfile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, organizations(id, name, slug)")
    .eq("id", user.id)
    .single();

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
