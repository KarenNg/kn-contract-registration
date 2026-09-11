import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { cancelInvite, changeMemberRole, inviteMember, removeMember } from "@/app/(app)/team/actions";
import { formatDateTime } from "@/lib/format";
import { input, label, panel, panelHeader, primaryButton, td, th, tr } from "@/components/theme";

export const dynamic = "force-dynamic";

const ROLES = [
  { value: "admin", label: "Contract Administrator", hint: "Full access — vendors, contracts, team, everything." },
  { value: "contract_owner", label: "Contract Owner", hint: "Full access, scoped to the contracts assigned to them." },
  { value: "management", label: "Management", hint: "Read-only — dashboard, contracts, alerts, requests." },
] as const;

interface MemberRow {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
}

interface InviteRow {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export default async function TeamPage() {
  const profile = await requireProfile();
  if (profile.role !== "admin") {
    notFound();
  }

  const supabase = await createClient();

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("organization_id", profile.organizationId)
      .order("created_at"),
    supabase
      .from("organization_invites")
      .select("id, email, role, created_at")
      .eq("organization_id", profile.organizationId)
      .order("created_at"),
  ]);

  const typedMembers = (members as MemberRow[] | null) ?? [];
  const typedInvites = (invites as InviteRow[] | null) ?? [];
  const roleLabel = (value: string) => ROLES.find((r) => r.value === value)?.label ?? value;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-sm font-bold uppercase tracking-wider text-slate-500">Team</h1>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
          Who has access to {profile.organizationName}, and what they can do.
        </p>
      </div>

      <div className={panel}>
        <div className={panelHeader}>
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Members ({typedMembers.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className={th}>Name</th>
                <th className={th}>Email</th>
                <th className={th}>Role</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {typedMembers.map((member) => {
                const updateRole = changeMemberRole.bind(null, member.id);
                const remove = removeMember.bind(null, member.id);
                const isSelf = member.id === profile.userId;
                return (
                  <tr key={member.id} className={tr}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {member.full_name ?? "—"} {isSelf && <span className="text-slate-400">(you)</span>}
                    </td>
                    <td className={td}>{member.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <form action={updateRole} className="flex items-center gap-2">
                        <select name="role" defaultValue={member.role} className={`${input} mt-0 w-auto`}>
                          {ROLES.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className="text-xs font-semibold text-blue-600 hover:underline">
                          Save
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={remove}>
                        <ConfirmSubmitButton
                          confirmMessage={`Remove ${member.full_name ?? member.email} from this organization?`}
                          className="text-xs font-medium text-red-600 hover:underline"
                        >
                          Remove
                        </ConfirmSubmitButton>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className={panel}>
        <div className={panelHeader}>
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Pending invites ({typedInvites.length})
          </h2>
        </div>
        {typedInvites.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className={th}>Email</th>
                  <th className={th}>Role</th>
                  <th className={th}>Invited</th>
                  <th className={th} />
                </tr>
              </thead>
              <tbody>
                {typedInvites.map((invite) => {
                  const cancel = cancelInvite.bind(null, invite.id);
                  return (
                    <tr key={invite.id} className={tr}>
                      <td className="px-4 py-3 font-medium text-slate-900">{invite.email}</td>
                      <td className={td}>{roleLabel(invite.role)}</td>
                      <td className={td}>{formatDateTime(invite.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <form action={cancel}>
                          <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
                            Cancel invite
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <form action={inviteMember} className="flex flex-wrap items-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div className="min-w-[220px] flex-1">
            <label className={label}>Email to invite</label>
            <input type="email" name="email" required placeholder="teammate@company.com" className={input} />
          </div>
          <div>
            <label className={label}>Role</label>
            <select name="role" defaultValue="contract_owner" className={input}>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={primaryButton}>
            Send invite
          </button>
        </form>
        <p className="border-t border-slate-100 px-6 py-3 text-xs text-slate-400">
          Invites are consumed automatically the moment that email address signs up — no email is sent yet, so
          share the signup link with them directly.
        </p>
      </div>

      <div className={`p-4 text-xs text-slate-500 ${panel}`}>
        {ROLES.map((r) => (
          <p key={r.value} className="py-0.5">
            <span className="font-semibold text-slate-700">{r.label}:</span> {r.hint}
          </p>
        ))}
      </div>
    </div>
  );
}
