import dayjs from "dayjs";
import { notFound } from "next/navigation";
import PrintButton from "@/features/admin/components/print-button";
import { getMerchOrderForSeller } from "@/features/admin/lib/api";
import { ApiError } from "@/lib/api/errors";

export const metadata = { title: "Packing label" };

/**
 * Standalone packing-label view for a single merch order — buyer name,
 * email, shipping address, and items, formatted to print (or "Save as PDF")
 * at packing time. Deliberately outside `/dashboard` so nothing but the
 * label itself ends up on paper; `print:hidden` on the site header/footer
 * hides the rest of the page chrome when this prints.
 */
export default async function MerchOrderLabelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const order = await getMerchOrderForSeller(id).catch((error) => {
    if (error instanceof ApiError) notFound();
    throw error;
  });

  const shippingLine = [
    order.shippingAddress,
    order.shippingDistrict,
    order.shippingVillage,
    order.shippingCity,
    order.shippingProvince,
    order.shippingPostalCode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto max-w-xl px-6 py-10 print:max-w-none print:p-0">
      <div className="mb-6 flex justify-end print:hidden">
        <PrintButton />
      </div>

      <div className="border-2 border-ink p-8">
        <div className="flex items-baseline justify-between border-b-2 border-ink pb-4">
          <span className="text-xl font-black uppercase">SiTIKET Merch — Packing Label</span>
          <span className="text-xs font-bold uppercase text-black/50">Order #{order.id.slice(0, 8)}</span>
        </div>

        <div className="mt-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-black/40">Ship to</p>
          <p className="mt-1 text-2xl font-black">{order.buyerName}</p>
          <p className="mt-1 text-sm">{order.buyerPhone}</p>
          <p className="text-sm">{order.buyerEmail}</p>
          <p className="mt-3 text-base leading-6">{shippingLine}</p>
          {order.courierName && (
            <p className="mt-2 text-sm font-bold uppercase">
              {order.courierName}
              {order.shippingEstimation ? ` — ${order.shippingEstimation}` : ""}
            </p>
          )}
        </div>

        <div className="mt-6 border-t-2 border-dashed border-black/20 pt-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-black/40">Items</p>
          <ul className="mt-2 space-y-1 text-sm">
            {(order.items ?? []).map((item) => (
              <li key={item.id} className="flex justify-between gap-4">
                <span>
                  {item.productName}
                  {item.variantLabel ? ` (${item.variantLabel})` : ""}
                </span>
                <span className="font-bold">x{item.quantity}</span>
              </li>
            ))}
          </ul>
        </div>

        {order.buyerNote && (
          <div className="mt-6 border-t-2 border-dashed border-black/20 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-black/40">Buyer note</p>
            <p className="mt-1 text-sm">{order.buyerNote}</p>
          </div>
        )}

        <p className="mt-6 border-t-2 border-dashed border-black/20 pt-4 text-xs text-black/40">
          Placed {dayjs(order.createdAt).format("D MMMM YYYY, HH:mm")}
        </p>
      </div>
    </div>
  );
}
