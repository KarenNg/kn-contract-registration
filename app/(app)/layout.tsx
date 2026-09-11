import { Nav } from "@/components/Nav";
import { InvitationsBanner, type PendingInvite } from "@/components/InvitationsBanner";
import { requireProfile } from "@/lib/auth";
import { switchActiveOrganization } from "@/lib/auth-actions";
import { createClient } from "@/lib/supabase/server";
import { sweepExpiredContracts } from "@/lib/contracts";
import { isExpiringSoon, isInForce, isPastEndDate, type Contract, type ContractDocument } from "@/lib/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const supabase = await createClient();
  await sweepExpiredContracts(supabase);

  const [{ data: contracts }, { data: documents }, { data: invites }] = await Promise.all([
    supabase
      .from("contracts")
      .select("status, end_date, alert_acknowledged_at")
      .in("status", ["active", "renewed", "expired"]),
    supabase
      .from("contract_documents")
      .select("expires_on, expiry_acknowledged_at")
      .not("expires_on", "is", null)
      .is("superseded_at", null),
    profile.email
      ? supabase
          .from("organization_invites")
          .select("id, role, organizations(name)")
          .ilike("email", profile.email)
      : Promise.resolve({ data: [] as PendingInvite[] }),
  ]);

  const contractAlertCount = ((contracts as Pick<Contract, "status" | "end_date" | "alert_acknowledged_at">[] | null) ?? []).filter(
    (c) => (c.status === "expired" || (isInForce(c.status) && isExpiringSoon(c.end_date))) && !c.alert_acknowledged_at,
  ).length;
  const documentAlertCount = ((documents as Pick<ContractDocument, "expires_on" | "expiry_acknowledged_at">[] | null) ?? []).filter(
    (d) => (isPastEndDate(d.expires_on) || isExpiringSoon(d.expires_on)) && !d.expiry_acknowledged_at,
  ).length;
  const alertCount = contractAlertCount + documentAlertCount;

  return (
    <>
      <Nav
        organizationName={profile.organizationName}
        organizationSlug={profile.organizationSlug}
        email={profile.email}
        isPlatformAdmin={profile.isPlatformAdmin}
        isAdmin={profile.role === "admin"}
        alertCount={alertCount}
        memberships={profile.memberships}
        activeOrganizationId={profile.organizationId}
        switchOrganization={switchActiveOrganization}
      />
      <InvitationsBanner invites={(invites as PendingInvite[] | null) ?? []} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </>
  );
}
