import type { Role } from "@/lib/auth";
import { input, label } from "@/components/theme";

export interface MemberOption {
  id: string;
  label: string;
}

/**
 * A contract_owner can only ever be assigned to themselves (enforced by RLS,
 * mirrored here so the field isn't a dead dropdown that would just error on
 * submit). An admin can assign anyone, leave it unassigned, or — for contracts
 * saved before this field existed — keep the old free-text name as-is instead
 * of silently blanking it the next time someone edits an unrelated field.
 */
export function OwnerField({
  members,
  currentRole,
  currentUserId,
  currentOwnerUserId,
  legacyOwnerName,
}: {
  members: MemberOption[];
  currentRole: Role;
  currentUserId: string;
  currentOwnerUserId?: string | null;
  legacyOwnerName?: string | null;
}) {
  if (currentRole === "contract_owner") {
    const self = members.find((m) => m.id === currentUserId);
    return (
      <div>
        <label className={label}>Contract owner</label>
        <p className="mt-1 text-sm text-slate-700">{self?.label ?? "You"} (assigned automatically)</p>
        <input type="hidden" name="owner_user_id" value={currentUserId} />
      </div>
    );
  }

  const hasUnlinkedLegacyName = !currentOwnerUserId && !!legacyOwnerName;
  const defaultValue = currentOwnerUserId ?? (hasUnlinkedLegacyName ? "" : "__clear__");

  return (
    <div>
      <label className={label}>Contract owner</label>
      <select name="owner_user_id" defaultValue={defaultValue} className={input}>
        {hasUnlinkedLegacyName && (
          <option value="">Keep &quot;{legacyOwnerName}&quot; (not linked to an account)</option>
        )}
        <option value="__clear__">Unassigned</option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.label}
          </option>
        ))}
      </select>
    </div>
  );
}
