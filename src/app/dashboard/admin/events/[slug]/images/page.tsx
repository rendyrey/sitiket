import { notFound } from "next/navigation";
import EventTabs from "@/features/admin/components/event-tabs";
import ImageManager from "@/features/admin/components/image-manager";
import { getEventBySlug, listEventImages } from "@/features/events/lib/api";

export default async function AdminEventImagesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const images = await listEventImages(event.id);

  return (
    <div>
      <h1 className="text-3xl font-black uppercase">{event.name}</h1>
      <div className="mt-6">
        <EventTabs slug={slug} activeSegment="/images" />
      </div>
      <div className="mt-8 max-w-4xl">
        <ImageManager eventId={event.id} images={images} />
      </div>
    </div>
  );
}
