import type { Metadata } from "next";
import ApplicationsManager from "@/features/super-admin/components/applications-manager";
import { listAdminApplications } from "@/features/super-admin/lib/api";

export const metadata: Metadata = { title: "Admin applications" };

export default async function SuperAdminApplicationsPage() {
  const applications = await listAdminApplications("pending");

  return (
    <div>
      <h1 className="text-3xl font-black uppercase">Admin applications</h1>
      <p className="mt-2 max-w-xl text-sm text-black/50">Approve or reject requests to become an event organizer.</p>
      <div className="mt-8 max-w-3xl">
        <ApplicationsManager applications={applications} />
      </div>
    </div>
  );
}
