import { redirect } from "next/navigation";
import DashboardShell from "@/components/ui/dashboard-shell";
import { getCurrentUser } from "@/lib/session";

const NAV_ITEMS = [
  { href: "/dashboard/admin", label: "Events" },
  { href: "/dashboard/admin/merch", label: "Merch" },
  { href: "/dashboard/admin/merch/orders", label: "Merch orders" },
  { href: "/dashboard/admin/bank-accounts", label: "Bank accounts" },
  { href: "/dashboard/admin/qris", label: "QRIS" },
  { href: "/dashboard/admin/email-settings", label: "Email settings" },
  { href: "/dashboard/admin/refunds", label: "Refunds" },
  { href: "/dashboard/scan", label: "Scan tickets" },
];

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/dashboard/admin");
  if (user.role !== "admin" && user.role !== "super_admin") redirect("/account");

  return (
    <DashboardShell navItems={NAV_ITEMS} title="Admin" user={user}>
      {children}
    </DashboardShell>
  );
}
