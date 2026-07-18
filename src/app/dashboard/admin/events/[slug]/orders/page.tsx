import { notFound } from "next/navigation";
import EventTabs from "@/features/admin/components/event-tabs";
import OrderReviewPanel from "@/features/admin/components/order-review-panel";
import { getEventBySlug } from "@/features/events/lib/api";

export default async function AdminEventOrdersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  return (
    <div>
      <h1 className="text-3xl font-black uppercase">{event.name}</h1>
      <div className="mt-6">
        <EventTabs slug={slug} activeSegment="/orders" />
      </div>
      <div className="mt-8">
        <OrderReviewPanel eventId={event.id} />
      </div>
    </div>
  );
}
