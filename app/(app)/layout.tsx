import { Nav } from "@/components/Nav";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sweepExpiredContracts } from "@/lib/contracts";
import { isExpiringSoon, isInForce, type Contract } from "@/lib/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const supabase = await createClient();
  await sweepExpiredContracts(supabase);

  const { data: contracts } = await supabase
    .from("contracts")
    .select("status, end_date, alert_acknowledged_at")
    .in("status", ["active", "renewed", "expired"]);

  const alertCount = ((contracts as Pick<Contract, "status" | "end_date" | "alert_acknowledged_at">[] | null) ?? []).filter(
    (c) => (c.status === "expired" || (isInForce(c.status) && isExpiringSoon(c.end_date))) && !c.alert_acknowledged_at,
  ).length;

  return (
    <>
      <Nav
        organizationName={profile.organizationName}
        organizationSlug={profile.organizationSlug}
        email={profile.email}
        isPlatformAdmin={profile.isPlatformAdmin}
        alertCount={alertCount}
      />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </>
  );
}
