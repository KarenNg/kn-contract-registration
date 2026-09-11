"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { alertsAreEmpty, getOrgAlerts, renderDigestEmail, scopeAlertsToOwner } from "@/lib/alerts";
import { sendEmail } from "@/lib/email";

/** Lets anyone verify the email digest actually works right now, instead of waiting for the daily cron. */
export async function sendMyDigestNow() {
  const profile = await requireProfile();

  if (!profile.email) {
    redirect(`/alerts?digest=error&message=${encodeURIComponent("Your account has no email on file.")}`);
  }

  const supabase = await createClient();
  const orgAlerts = await getOrgAlerts(supabase, profile.organizationId);
  const scoped = profile.role === "contract_owner" ? scopeAlertsToOwner(orgAlerts, profile.userId) : orgAlerts;

  if (alertsAreEmpty(scoped)) {
    redirect(`/alerts?digest=error&message=${encodeURIComponent("Nothing in your digest right now — no alerts to send.")}`);
  }

  const { subject, html } = renderDigestEmail(profile.organizationName, scoped);
  const result = await sendEmail({ to: profile.email, subject, html });

  if (!result.sent) {
    redirect(`/alerts?digest=error&message=${encodeURIComponent(result.reason ?? "Failed to send.")}`);
  }

  redirect("/alerts?digest=sent");
}
