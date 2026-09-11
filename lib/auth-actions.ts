"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

/** Switches which company's data you're looking at — every page reads the active org from here. */
export async function switchActiveOrganization(formData: FormData) {
  const organizationId = String(formData.get("organization_id") ?? "");
  const profile = await requireProfile();
  if (!profile.memberships.some((m) => m.organizationId === organizationId)) {
    throw new Error("You're not a member of that company.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ active_organization_id: organizationId })
    .eq("id", profile.userId);

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}

/** Joins the invited company as a new membership (on top of any others you already have) and switches into it. */
export async function acceptInvite(inviteId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: invite, error: fetchError } = await supabase
    .from("organization_invites")
    .select("id, organization_id, role")
    .eq("id", inviteId)
    .single();

  if (fetchError || !invite) {
    throw new Error(fetchError?.message ?? "That invite no longer exists.");
  }

  const { error: membershipError } = await supabase.from("memberships").insert({
    user_id: profile.userId,
    organization_id: invite.organization_id,
    role: invite.role,
  });

  if (membershipError && membershipError.code !== "23505") {
    throw new Error(membershipError.message);
  }

  const { error: switchError } = await supabase
    .from("profiles")
    .update({ active_organization_id: invite.organization_id })
    .eq("id", profile.userId);

  if (switchError) throw new Error(switchError.message);

  await supabase.from("organization_invites").delete().eq("id", invite.id);

  revalidatePath("/", "layout");
}

export async function declineInvite(inviteId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("organization_invites").delete().eq("id", inviteId);

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}
