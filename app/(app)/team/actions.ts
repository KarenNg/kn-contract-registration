"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, type Role } from "@/lib/auth";
import { assertIsAdmin } from "@/lib/permissions";

const ROLES: Role[] = ["admin", "contract_owner", "management"];

async function assertNotLastAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  excludingUserId: string,
) {
  const { count } = await supabase
    .from("memberships")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("role", "admin")
    .neq("user_id", excludingUserId);

  if (!count) {
    throw new Error("This organization needs at least one admin — assign another admin first.");
  }
}

export async function inviteMember(formData: FormData) {
  const profile = await requireProfile();
  assertIsAdmin(profile.role);

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "") as Role;

  if (!email) throw new Error("Email is required");
  if (!ROLES.includes(role)) throw new Error("Choose a valid role");

  const supabase = await createClient();
  const { error } = await supabase.from("organization_invites").insert({
    organization_id: profile.organizationId,
    email,
    role,
    invited_by: profile.userId,
  });

  if (error) {
    throw new Error(
      error.code === "23505"
        ? "That email already has a pending invite to this company."
        : error.message,
    );
  }

  revalidatePath("/team");
}

export async function cancelInvite(inviteId: string) {
  const profile = await requireProfile();
  assertIsAdmin(profile.role);

  const supabase = await createClient();
  const { error } = await supabase.from("organization_invites").delete().eq("id", inviteId);

  if (error) throw new Error(error.message);

  revalidatePath("/team");
}

export async function changeMemberRole(memberUserId: string, formData: FormData) {
  const profile = await requireProfile();
  assertIsAdmin(profile.role);

  const role = String(formData.get("role") ?? "") as Role;
  if (!ROLES.includes(role)) throw new Error("Choose a valid role");

  const supabase = await createClient();

  if (role !== "admin") {
    await assertNotLastAdmin(supabase, profile.organizationId, memberUserId);
  }

  const { error } = await supabase
    .from("memberships")
    .update({ role })
    .eq("user_id", memberUserId)
    .eq("organization_id", profile.organizationId);
  if (error) throw new Error(error.message);

  revalidatePath("/team");
}

/** Removes this person from THIS company only — they may still belong to others. */
export async function removeMember(memberUserId: string) {
  const profile = await requireProfile();
  assertIsAdmin(profile.role);

  const supabase = await createClient();
  await assertNotLastAdmin(supabase, profile.organizationId, memberUserId);

  const { error } = await supabase
    .from("memberships")
    .delete()
    .eq("user_id", memberUserId)
    .eq("organization_id", profile.organizationId);
  if (error) throw new Error(error.message);

  revalidatePath("/team");
}
