import { acceptInvite, declineInvite } from "@/lib/auth-actions";
import { primaryButton, secondaryButton } from "@/components/theme";

export interface PendingInvite {
  id: string;
  role: string;
  organizations: { name: string } | null;
}

export function InvitationsBanner({ invites }: { invites: PendingInvite[] }) {
  if (invites.length === 0) return null;

  return (
    <div className="border-b border-blue-200 bg-blue-50 px-4 py-3 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-2">
        {invites.map((invite) => {
          const accept = acceptInvite.bind(null, invite.id);
          const decline = declineInvite.bind(null, invite.id);
          return (
            <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <p className="text-blue-900">
                You&apos;ve been invited to join <strong>{invite.organizations?.name ?? "a company"}</strong> as{" "}
                <strong className="capitalize">{invite.role.replace(/_/g, " ")}</strong>.
              </p>
              <div className="flex gap-2">
                <form action={accept}>
                  <button type="submit" className={primaryButton}>
                    Accept
                  </button>
                </form>
                <form action={decline}>
                  <button type="submit" className={secondaryButton}>
                    Decline
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
