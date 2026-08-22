"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { respondStaffInvitationAction } from "@/features/account/lib/actions";
import type { StaffInvitation } from "@/lib/api/types";

const formatEventDate = (iso: string) =>
  `${new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso))} WIB`;

/**
 * The invitee's gate-staff invitations: pending ones are accepted/declined
 * here (the links in the invitation email land on this page), accepted ones
 * link straight to the scanner.
 */
export default function GateStaffInvitations({ invitations }: { invitations: StaffInvitation[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const respond = async (invitation: StaffInvitation, decision: "accept" | "decline") => {
    setBusyId(invitation.id);
    const result = await respondStaffInvitationAction(invitation.id, decision);
    setBusyId(null);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(decision === "accept" ? "Invitation accepted — you can scan tickets now." : "Invitation declined.");
    router.refresh();
  };

  if (invitations.length === 0) {
    return (
      <p className="border-2 border-ink bg-white p-6 text-sm font-semibold text-black/40">
        No gate staff invitations yet. When an event organizer invites you to scan tickets, it shows up here.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {invitations.map((invitation) => {
        const place = [invitation.eventVenueName, invitation.eventCity].filter(Boolean).join(", ");
        const busy = busyId === invitation.id;
        return (
          <li key={invitation.id} className="border-2 border-ink bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-black uppercase leading-tight">{invitation.eventName}</h2>
                <p className="mt-1 text-xs font-semibold text-black/50">
                  {formatEventDate(invitation.eventStartDate)}
                  {place ? ` · ${place}` : ""}
                </p>
                {invitation.inviterName && (
                  <p className="mt-1 text-xs text-black/40">Invited by {invitation.inviterName}</p>
                )}
              </div>
              {invitation.status === "accepted" && (
                <span className="bg-lime px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-ink">Accepted</span>
              )}
              {invitation.status === "declined" && (
                <span className="border border-red-300 bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-red-700">
                  Declined
                </span>
              )}
            </div>

            {invitation.status === "pending" && (
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void respond(invitation, "accept")}
                  className="button button-lime disabled:opacity-50"
                >
                  {busy ? "Working…" : "Accept invitation"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void respond(invitation, "decline")}
                  className="button border-black/25 bg-transparent text-black hover:border-black disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            )}
            {invitation.status === "accepted" && (
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/dashboard/scan" className="button button-dark">
                  Open the ticket scanner
                </Link>
                <Link
                  href={`/account/gate-staff/${invitation.eventId}`}
                  className="button border-black/25 bg-transparent text-black hover:border-black"
                >
                  View attendance
                </Link>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
