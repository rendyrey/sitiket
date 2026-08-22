import type { Metadata } from "next";
import { redirect } from "next/navigation";
import GateStaffInvitations from "@/features/account/components/gate-staff-invitations";
import { listMyStaffInvitationsAction } from "@/features/account/lib/actions";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Gate staff" };

/**
 * The invitee's side of gate staffing — accept/decline pending invitations
 * (the email's buttons land here) and jump to the scanner for accepted ones.
 */
export default async function AccountGateStaffPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/account/gate-staff");

  const result = await listMyStaffInvitationsAction();
  const invitations = result.ok ? result.data : [];

  return (
    <div>
      <h1 className="text-3xl font-black uppercase">Gate staff</h1>
      <p className="mt-2 max-w-xl text-sm text-black/50">
        Events you&apos;ve been invited to scan tickets for. Accept an invitation to unlock the scanner for that event.
      </p>
      {!result.ok && <p className="mt-6 text-sm font-semibold text-red-600">{result.message}</p>}
      <div className="mt-8 max-w-2xl">
        <GateStaffInvitations invitations={invitations} />
      </div>
    </div>
  );
}
