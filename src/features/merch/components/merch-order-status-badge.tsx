import type { MerchOrderStatus } from "@/lib/api/types";

const STATUS_STYLES: Record<MerchOrderStatus, { className: string; label: string }> = {
  pending_payment: { className: "bg-yellow-300 text-black", label: "Awaiting payment" },
  awaiting_verification: { className: "bg-blue-200 text-black", label: "Verifying payment" },
  paid: { className: "bg-lime text-black", label: "Paid" },
  expired: { className: "bg-black/10 text-black/50", label: "Expired" },
  cancelled: { className: "bg-black/10 text-black/50", label: "Cancelled" },
};

export default function MerchOrderStatusBadge({ status }: { status: MerchOrderStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span className={`inline-block px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${style.className}`}>
      {style.label}
    </span>
  );
}
