import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import AttendanceReport from "@/features/admin/components/attendance-report";
import EventTabs from "@/features/admin/components/event-tabs";
import { getEventAttendance } from "@/features/admin/lib/api";
import { getEventBySlug } from "@/features/events/lib/api";
import OnsiteSalesPanel from "@/features/scanner/components/onsite-sales-panel";
import { listGateTicketTypes } from "@/features/scanner/lib/api";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Attendance" };

export default async function AdminEventAttendancePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirect=/dashboard/admin`);
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const [report, ticketTypes] = await Promise.all([getEventAttendance(event.id), listGateTicketTypes(event.id)]);

  return (
    <div>
      <h1 className="text-3xl font-black uppercase">{event.name}</h1>
      <div className="mt-6">
        <EventTabs slug={slug} activeSegment="/attendance" />
      </div>
      <div className="mt-8 max-w-6xl space-y-8">
        <AttendanceReport report={report} />
        <OnsiteSalesPanel eventId={event.id} ticketTypes={ticketTypes} canDeleteAll viewerId={user.id} />
      </div>
    </div>
  );
}
