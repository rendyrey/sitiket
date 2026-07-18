import type { OrderStatus } from "@/lib/api/types";

const LABELS: Record<OrderStatus, string> = {
  pending_payment: "Awaiting transfer",
  awaiting_verification: "Verifying payment",
  paid: "Paid",
  expired: "Expired",
  cancelled: "Cancelled",
  refund_requested: "Refund requested",
  refunded: "Refunded",
  refund_rejected: "Refund rejected",
};

const TONES: Record<OrderStatus, string> = {
  pending_payment: "bg-lime text-black",
  awaiting_verification: "bg-lime text-black",
  paid: "bg-lime text-black",
  expired: "bg-black/10 text-black/50",
  cancelled: "bg-black/10 text-black/50",
  refund_requested: "bg-lime text-black",
  refunded: "bg-black/10 text-black/50",
  refund_rejected: "bg-red-100 text-red-700",
};

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex max-w-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${TONES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
