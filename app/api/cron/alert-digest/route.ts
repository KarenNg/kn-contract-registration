import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { alertsAreEmpty, getOrgAlerts, renderDigestEmail, scopeAlertsToOwner } from "@/lib/alerts";
import { sendEmail } from "@/lib/email";

interface MemberRow {
  user_id: string;
  role: string;
  profiles: { email: string | null } | null;
}

/**
 * Triggered daily by Vercel Cron (see vercel.json). For each org with at
 * least one unacknowledged expiring/expired item: admins and management get
 * the full org-wide digest, contract_owners get one scoped to the contracts
 * assigned to them. Recipients with nothing in their scoped digest are
 * skipped rather than sent an empty email.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: organizations, error } = await supabase.from("organizations").select("id, name");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;

  for (const org of organizations ?? []) {
    const orgAlerts = await getOrgAlerts(supabase, org.id);
    if (alertsAreEmpty(orgAlerts)) continue;

    const { data: members } = await supabase
      .from("memberships")
      .select("user_id, role, profiles(email)")
      .eq("organization_id", org.id);

    for (const member of (members as MemberRow[] | null) ?? []) {
      const email = member.profiles?.email;
      if (!email) continue;

      const scoped = member.role === "contract_owner" ? scopeAlertsToOwner(orgAlerts, member.user_id) : orgAlerts;
      if (alertsAreEmpty(scoped)) {
        skipped++;
        continue;
      }

      const { subject, html } = renderDigestEmail(org.name, scoped);
      const result = await sendEmail({ to: email, subject, html });
      if (result.sent) sent++;
      else skipped++;
    }
  }

  return NextResponse.json({ sent, skipped, orgsChecked: organizations?.length ?? 0 });
}
