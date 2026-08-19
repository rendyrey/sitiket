import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AttendanceReport from "@/features/admin/components/attendance-report";
import EventTabs from "@/features/admin/components/event-tabs";
import { getEventAttendance } from "@/features/admin/lib/api";
import { getEventBySlug } from "@/features/events/lib/api";

export const metadata: Metadata = { title: "Attendance" };

export default async function AdminEventAttendancePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const report = await getEventAttendance(event.id);

  return (
    <div>
      <h1 className="text-3xl font-black uppercase">{event.name}</h1>
      <div className="mt-6">
        <EventTabs slug={slug} activeSegment="/attendance" />
      </div>
      <div className="mt-8 max-w-6xl">
        <AttendanceReport report={report} />
      </div>
    </div>
  );
}
