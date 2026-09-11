import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client for privileged server-only jobs that have no signed-in
 * user to scope RLS to (e.g. the cron-triggered alert digest, which has to
 * read across every organization). Never import this into anything reachable
 * from a request that carries user input without an explicit auth check first.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
