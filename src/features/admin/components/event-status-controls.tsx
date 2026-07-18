"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { changeEventStatusAction, setEventVisibilityAction } from "@/features/admin/lib/actions";
import type { Event, EventStatus } from "@/lib/api/types";

const NEXT_STATUSES: Record<EventStatus, EventStatus[]> = {
  draft: ["published", "cancelled"],
  published: ["completed", "cancelled"],
  cancelled: [],
  completed: [],
};

export default function EventStatusControls({ event }: { event: Event }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = async (status: EventStatus) => {
    setError(null);
    setPending(true);
    const result = await changeEventStatusAction(event.id, status);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  };

  const handleVisibilityToggle = async () => {
    setError(null);
    setPending(true);
    const result = await setEventVisibilityAction(event.id, !event.isVisible);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  };

  const nextStatuses = NEXT_STATUSES[event.status];

  return (
    <div className="border-2 border-ink bg-white p-5 sm:p-7">
      <span className="tag">Status</span>
      <div className="mt-5 flex flex-wrap gap-3">
        {nextStatuses.map((status) => (
          <button
            key={status}
            type="button"
            disabled={pending}
            onClick={() => void handleStatusChange(status)}
            className="button button-dark disabled:opacity-50"
          >
            Move to {status}
          </button>
        ))}
        {nextStatuses.length === 0 && <span className="text-sm text-black/40">No further status changes available.</span>}
      </div>
      <div className="mt-5 flex items-center gap-3 border-t border-black/10 pt-5">
        <button
          type="button"
          disabled={pending}
          onClick={() => void handleVisibilityToggle()}
          className={`button ${event.isVisible ? "button-dark" : "button-lime"} disabled:opacity-50`}
        >
          {event.isVisible ? "Hide from catalog" : "Show in catalog"}
        </button>
        <span className="text-xs text-black/40">
          {event.isVisible ? "Currently visible in the public catalog." : "Currently hidden from buyers."}
        </span>
      </div>
      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
    </div>
  );
}
