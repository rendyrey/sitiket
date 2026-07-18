import { notFound } from "next/navigation";
import EventTabs from "@/features/admin/components/event-tabs";
import OrderReviewPanel, { type OrderWithReview } from "@/features/admin/components/order-review-panel";
import { listEventOrders, listOrderPayments, listOrderRefundRequests } from "@/features/admin/lib/api";
import { getEventBySlug } from "@/features/events/lib/api";

export default async function AdminEventOrdersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const orders = await listEventOrders(event.id);
  const enriched: OrderWithReview[] = await Promise.all(
    orders.map(async (order) => ({
      order,
      payments: await listOrderPayments(order.id),
      refundRequests: await listOrderRefundRequests(order.id),
    })),
  );

  return (
    <div>
      <h1 className="text-3xl font-black uppercase">{event.name}</h1>
      <div className="mt-6">
        <EventTabs slug={slug} activeSegment="/orders" />
      </div>
      <div className="mt-8 max-w-3xl">
        <OrderReviewPanel orders={enriched} />
      </div>
    </div>
  );
}
