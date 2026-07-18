import type { EventStatus } from "@/lib/api/types";

const TONES: Record<EventStatus, string> = {
  draft: "bg-black/10 text-black/60",
  published: "bg-lime text-black",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-black/10 text-black/50",
};

export default function EventStatusBadge({ status }: { status: EventStatus }) {
  return <span className={`inline-flex px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${TONES[status]}`}>{status}</span>;
}
