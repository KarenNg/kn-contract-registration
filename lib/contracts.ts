import { createClient } from "@/lib/supabase/server";
import type { ContractEventType } from "@/lib/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Flips any in-force contract past its end date to "expired". Called at the
 * top of read paths (dashboard, contracts list) instead of a cron job, since
 * every visit is a chance to catch up — the status a viewer sees is always
 * derived fresh from end_date rather than trusted as stored fact.
 */
export async function sweepExpiredContracts(supabase: SupabaseServerClient): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: expired } = await supabase
    .from("contracts")
    .update({ status: "expired" })
    .in("status", ["active", "renewed"])
    .lt("end_date", today)
    .select("id, contract_code, title");

  if (!expired || expired.length === 0) return;

  await supabase.from("contract_events").insert(
    expired.map((contract) => ({
      contract_id: contract.id,
      event_type: "status_changed" as ContractEventType,
      summary: "Contract expired",
      detail: "End date passed with no renewal on file — status auto-set to expired.",
    })),
  );
}

export async function logContractEvent(
  supabase: SupabaseServerClient,
  contractId: string,
  eventType: ContractEventType,
  summary: string,
  detail?: string | null,
  actorName?: string | null,
): Promise<void> {
  const { error } = await supabase.from("contract_events").insert({
    contract_id: contractId,
    event_type: eventType,
    summary,
    detail: detail ?? null,
    actor_name: actorName ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }
}
