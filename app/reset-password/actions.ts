"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!password || password.length < 6) {
    redirect(
      `/reset-password?error=${encodeURIComponent("Password must be at least 6 characters")}`,
    );
  }

  if (password !== confirmPassword) {
    redirect(`/reset-password?error=${encodeURIComponent("Passwords do not match")}`);
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/forgot-password?error=${encodeURIComponent("Your reset link has expired. Please request a new one.")}`,
    );
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.auth.signOut();

  redirect(
    `/login?notice=${encodeURIComponent("Your password has been updated. Please log in.")}`,
  );
}
