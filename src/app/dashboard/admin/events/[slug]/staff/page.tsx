import { notFound } from "next/navigation";
import EventTabs from "@/features/admin/components/event-tabs";
import StaffManager from "@/features/admin/components/staff-manager";
import { listEventStaff } from "@/features/admin/lib/api";
import { getEventBySlug } from "@/features/events/lib/api";

export default async function AdminEventStaffPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const staff = await listEventStaff(event.id);

  return (
    <div>
      <h1 className="text-3xl font-black uppercase">{event.name}</h1>
      <div className="mt-6">
        <EventTabs slug={slug} activeSegment="/staff" />
      </div>
      <div className="mt-8 max-w-3xl">
        <StaffManager eventId={event.id} staff={staff} />
      </div>
    </div>
  );
}
