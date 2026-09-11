import type { Role } from "@/lib/auth";

/** Management is read-only everywhere; admin and contract_owner can create/edit. */
export function canMutate(role: Role): boolean {
  return role !== "management";
}

/** Admin can manage any contract; contract_owner only the ones assigned to them. */
export function canManageContract(
  role: Role,
  userId: string,
  contractOwnerUserId: string | null,
): boolean {
  if (role === "admin") return true;
  if (role === "contract_owner") return contractOwnerUserId === userId;
  return false;
}

const READ_ONLY_MESSAGE = "Your role (Management) is read-only and can't make this change.";

export function assertCanMutate(role: Role): void {
  if (!canMutate(role)) {
    throw new Error(READ_ONLY_MESSAGE);
  }
}

export function assertCanManageContract(
  role: Role,
  userId: string,
  contractOwnerUserId: string | null,
): void {
  if (!canManageContract(role, userId, contractOwnerUserId)) {
    throw new Error(
      role === "management"
        ? READ_ONLY_MESSAGE
        : "You can only manage contracts assigned to you. Ask an admin to reassign this contract first.",
    );
  }
}

export function assertIsAdmin(role: Role): void {
  if (role !== "admin") {
    throw new Error("Only a Contract Administrator can do this.");
  }
}
