import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AttendanceReport from "@/features/admin/components/attendance-report";
import { getEventAttendance } from "@/features/admin/lib/api";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Attendance" };

/**
 * The gate-staff view of an event's attendance — same report the organizer
 * sees (minus revenue, withheld by the backend), reachable from an accepted
 * invitation on the Gate staff page.
 */
export default async function GateStaffAttendancePage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirect=/account/gate-staff/${eventId}`);

  // 403 (not staff for this event) and 404 both land on the not-found page.
  let report;
  try {
    report = await getEventAttendance(eventId);
  } catch {
    notFound();
  }

  return (
    <div>
      <Link href="/account/gate-staff" className="text-xs font-black uppercase text-black/50 hover:underline">
        ← Gate staff
      </Link>
      <h1 className="mt-3 text-3xl font-black uppercase">{report.eventName}</h1>
      <p className="mt-2 max-w-xl text-sm text-black/50">Live turnout for the event you&apos;re scanning.</p>
      <div className="mt-8 max-w-6xl">
        <AttendanceReport report={report} />
      </div>
    </div>
  );
}
