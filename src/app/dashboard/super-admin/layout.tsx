import { redirect } from "next/navigation";
import DashboardShell from "@/components/ui/dashboard-shell";
import { getCurrentUser } from "@/lib/session";

const NAV_ITEMS = [
  { href: "/dashboard/super-admin", label: "Applications" },
  { href: "/dashboard/super-admin/users", label: "Users" },
  { href: "/dashboard/super-admin/event-categories", label: "Event categories" },
  { href: "/dashboard/super-admin/ticket-categories", label: "Ticket categories" },
];

export default async function SuperAdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/dashboard/super-admin");
  if (user.role !== "super_admin") redirect("/account");

  return (
    <DashboardShell navItems={NAV_ITEMS} title="Super Admin" user={user}>
      {children}
    </DashboardShell>
  );
}
