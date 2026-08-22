"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import DataTable, { type DataTableColumn } from "@/components/ui/data-table";
import FormField from "@/components/ui/form-field";
import { inviteEventStaffAction, removeEventStaffAction } from "@/features/admin/lib/actions";
import type { EventStaff, EventStaffStatus } from "@/lib/api/types";

const STATUS_BADGE: Record<EventStaffStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-ink text-white" },
  accepted: { label: "Accepted", className: "bg-lime text-ink" },
  declined: { label: "Declined", className: "border border-red-300 bg-red-100 text-red-700" },
};

export default function StaffManager({ eventId, staff }: { eventId: string; staff: EventStaff[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<EventStaff | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const handleInvite = async () => {
    setError(null);
    if (!email.trim()) {
      const message = "Enter the email of someone who has already signed in to SiTIKET with Google.";
      setError(message);
      toast.error(message);
      return;
    }
    setSubmitting(true);
    const result = await inviteEventStaffAction(eventId, { email: email.trim() });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      toast.error(result.message);
      return;
    }
    setEmail("");
    router.refresh();
  };

  const handleRemove = async () => {
    if (!removing) return;
    setRemoveBusy(true);
    const result = await removeEventStaffAction(eventId, removing.id);
    setRemoveBusy(false);
    setRemoving(null);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Gate staff removed.");
    router.refresh();
  };

  const columns: DataTableColumn<EventStaff>[] = [
    {
      key: "name",
      header: "Name",
      sortAccessor: (member) => (member.userName ?? member.userId).toLowerCase(),
      searchAccessor: (member) => `${member.userName ?? ""} ${member.userEmail ?? ""}`,
      render: (member) => <span className="font-black uppercase">{member.userName ?? member.userId}</span>,
    },
    {
      key: "email",
      header: "Email",
      sortAccessor: (member) => (member.userEmail ?? "").toLowerCase(),
      render: (member) => <span className="text-black/40">{member.userEmail} · scanner</span>,
    },
    {
      key: "status",
      header: "Status",
      sortAccessor: (member) => member.status,
      render: (member) => {
        const badge = STATUS_BADGE[member.status];
        return (
          <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${badge.className}`}>
            {badge.label}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (member) => (
        <button type="button" onClick={() => setRemoving(member)} className="text-xs font-black uppercase text-red-600 hover:underline">
          Remove
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {staff.length === 0 ? (
        <p className="text-sm text-black/50">No gate staff invited yet.</p>
      ) : (
        <DataTable columns={columns} data={staff} getRowKey={(member) => member.id} searchPlaceholder="Search staff…" />
      )}

      <div className="border-2 border-ink bg-white p-5 sm:p-7">
        <span className="tag">Invite gate staff</span>
        <p className="mt-3 text-xs leading-5 text-black/45">
          The person must have already signed in with Google at least once — there is no separate scanner credential.
        </p>
        <div className="mt-4">
          <FormField
            required
            label="Email *"
            name="staffEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usher@example.com"
          />
        </div>
        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
        <button type="button" onClick={() => void handleInvite()} disabled={submitting} className="button button-dark mt-5 disabled:opacity-50">
          {submitting ? "Inviting…" : "Invite"}
        </button>
      </div>

      <ConfirmDialog
        open={removing !== null}
        tag="Remove gate staff"
        title={`Remove ${removing?.userName ?? "this person"}?`}
        confirmLabel="Remove"
        danger
        busy={removeBusy}
        onConfirm={() => void handleRemove()}
        onCancel={() => setRemoving(null)}
      >
        <p>
          <strong>{removing?.userEmail}</strong> will immediately lose scanner access for this event. You can invite
          them again later.
        </p>
      </ConfirmDialog>
    </div>
  );
}
