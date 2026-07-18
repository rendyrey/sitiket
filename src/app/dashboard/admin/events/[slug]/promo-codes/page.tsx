import { notFound } from "next/navigation";
import EventTabs from "@/features/admin/components/event-tabs";
import PromoCodeManager from "@/features/admin/components/promo-code-manager";
import { listPromoCodes } from "@/features/admin/lib/api";
import { getEventBySlug } from "@/features/events/lib/api";

export default async function AdminEventPromoCodesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const promoCodes = await listPromoCodes(event.id);

  return (
    <div>
      <h1 className="text-3xl font-black uppercase">{event.name}</h1>
      <div className="mt-6">
        <EventTabs slug={slug} activeSegment="/promo-codes" />
      </div>
      <div className="mt-8 max-w-3xl">
        <PromoCodeManager eventId={event.id} promoCodes={promoCodes} />
      </div>
    </div>
  );
}
