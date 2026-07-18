"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { approveAdminApplicationAction, rejectAdminApplicationAction } from "@/features/super-admin/lib/actions";
import type { AdminApplication } from "@/lib/api/types";

export default function ApplicationsManager({ applications }: { applications: AdminApplication[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (id: string, action: () => Promise<{ ok: boolean; message?: string }>) => {
    setError(null);
    setPending(id);
    const result = await action();
    setPending(null);
    if (!result.ok) {
      setError(result.message ?? "Something went wrong.");
      return;
    }
    router.refresh();
  };

  if (applications.length === 0) {
    return <p className="border-2 border-black/15 bg-white p-6 text-sm font-semibold text-black/50">No pending applications.</p>;
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      {applications.map((application) => (
        <div key={application.id} className="border-2 border-ink bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-black uppercase">{application.businessName}</p>
              <p className="text-xs text-black/40">{application.contactPhone}</p>
            </div>
            <span className="text-xs font-black uppercase">{application.status}</span>
          </div>
          {application.businessDescription && <p className="mt-3 text-sm text-black/60">{application.businessDescription}</p>}
          {application.status === "pending" && (
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={pending === application.id}
                onClick={() => void run(application.id, () => approveAdminApplicationAction(application.id))}
                className="button button-lime"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={pending === application.id}
                onClick={() => void run(application.id, () => rejectAdminApplicationAction(application.id))}
                className="button button-dark"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
