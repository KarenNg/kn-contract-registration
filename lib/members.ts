import type { MemberOption } from "@/components/OwnerField";

export function orgMembersToOptions(
  members: { id: string; full_name: string | null; email: string | null }[] | null,
): MemberOption[] {
  return (members ?? []).map((m) => ({
    id: m.id,
    label: m.full_name || m.email || "Unnamed member",
  }));
}
