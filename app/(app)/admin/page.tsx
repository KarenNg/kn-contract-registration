import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { code, panel, tableWrap, td, th, tr } from "@/components/theme";

export const dynamic = "force-dynamic";

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

interface MemberRow {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  organization_id: string;
}

interface StatsRow {
  organization_id: string;
  vendor_count: number;
  contract_count: number;
  application_count: number;
}

export default async function PlatformAdminPage() {
  const profile = await requireProfile();
  if (!profile.isPlatformAdmin) {
    notFound();
  }

  const supabase = await createClient();

  const [{ data: organizations }, { data: members }, { data: stats }] = await Promise.all([
    supabase.from("organizations").select("id, name, slug, created_at").order("created_at"),
    supabase.from("profiles").select("id, email, full_name, role, organization_id"),
    supabase.rpc("platform_admin_org_stats"),
  ]);

  const membersByOrg = new Map<string, MemberRow[]>();
  for (const member of (members as MemberRow[] | null) ?? []) {
    const list = membersByOrg.get(member.organization_id) ?? [];
    list.push(member);
    membersByOrg.set(member.organization_id, list);
  }

  const statsByOrg = new Map<string, StatsRow>();
  for (const row of (stats as StatsRow[] | null) ?? []) {
    statsByOrg.set(row.organization_id, row);
  }

  const orgs = (organizations as OrgRow[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-sm font-bold uppercase tracking-wider text-slate-500">Platform admin</h1>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
          Every company workspace signed up to ContractOps.
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {orgs.length} {orgs.length === 1 ? "company" : "companies"} · visible only to platform
          admins, never to org members
        </p>
      </div>

      <div className={tableWrap}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className={th}>Company</th>
                <th className={`${th} hidden sm:table-cell`}>Slug</th>
                <th className={th}>Members</th>
                <th className={th}>Vendors</th>
                <th className={th}>Contracts</th>
                <th className={th}>Requests</th>
                <th className={`${th} hidden sm:table-cell`}>Signed up</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => {
                const orgMembers = membersByOrg.get(org.id) ?? [];
                const orgStats = statsByOrg.get(org.id);
                return (
                  <tr key={org.id} className={tr}>
                    <td className="px-4 py-3 font-medium text-slate-900">{org.name}</td>
                    <td className={`px-4 py-3 ${code} hidden sm:table-cell`}>{org.slug}</td>
                    <td className="px-4 py-3">
                      {orgMembers.length === 0 ? (
                        <span className="font-semibold text-amber-600">0 — orphaned</span>
                      ) : (
                        <ul className="space-y-0.5">
                          {orgMembers.map((member) => (
                            <li key={member.id} className="text-slate-700">
                              {member.email ?? "—"}
                              {member.full_name && (
                                <span className="text-slate-500"> ({member.full_name})</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className={`${td} tabular-nums`}>{orgStats?.vendor_count ?? 0}</td>
                    <td className={`${td} tabular-nums`}>{orgStats?.contract_count ?? 0}</td>
                    <td className={`${td} tabular-nums`}>{orgStats?.application_count ?? 0}</td>
                    <td className={`${td} hidden sm:table-cell`}>{formatDateTime(org.created_at)}</td>
                  </tr>
                );
              })}
              {orgs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No companies yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className={`p-4 text-xs text-slate-500 ${panel}`}>
        Platform-admin access is granted manually in the database and is not self-service — it does
        not grant read or write access to any company&apos;s vendors, contracts, or documents, only
        this aggregate signup view.
      </p>
    </div>
  );
}
