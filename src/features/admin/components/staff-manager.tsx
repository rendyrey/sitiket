"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import FormField from "@/components/ui/form-field";
import { inviteEventStaffAction, removeEventStaffAction } from "@/features/admin/lib/actions";
import type { EventStaff } from "@/lib/api/types";

export default function StaffManager({ eventId, staff }: { eventId: string; staff: EventStaff[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInvite = async () => {
    setError(null);
    if (!email.trim()) {
      setError("Enter the email of someone who has already signed in to SiTIKET with Google.");
      return;
    }
    setSubmitting(true);
    const result = await inviteEventStaffAction(eventId, { email: email.trim() });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setEmail("");
    router.refresh();
  };

  const handleRemove = async (staffId: string) => {
    await removeEventStaffAction(eventId, staffId);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {staff.length === 0 && <p className="text-sm text-black/50">No gate staff invited yet.</p>}
        {staff.map((member) => (
          <div key={member.id} className="flex flex-wrap items-center justify-between gap-4 border-2 border-ink bg-white p-4">
            <div className="min-w-0">
              <p className="font-black uppercase">{member.userName ?? member.userId}</p>
              <p className="text-xs text-black/40">{member.userEmail} · scanner</p>
            </div>
            <button type="button" onClick={() => void handleRemove(member.id)} className="text-xs font-black uppercase text-red-600 hover:underline">
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="border-2 border-ink bg-white p-5 sm:p-7">
        <span className="tag">Invite gate staff</span>
        <p className="mt-3 text-xs leading-5 text-black/45">
          The person must have already signed in with Google at least once — there is no separate scanner credential.
        </p>
        <div className="mt-4">
          <FormField label="Email" name="staffEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usher@example.com" />
        </div>
        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
        <button type="button" onClick={() => void handleInvite()} disabled={submitting} className="button button-dark mt-5 disabled:opacity-50">
          {submitting ? "Inviting…" : "Invite"}
        </button>
      </div>
    </div>
  );
}
