import { redirect } from "next/navigation";
import DashboardShell from "@/components/ui/dashboard-shell";
import { getCurrentUser } from "@/lib/session";

/**
 * The buyer's account area — same shell as the dashboards (sidebar on
 * desktop, nav strip on phones), split into focused sub-pages instead of one
 * long "my tickets" page.
 */
const NAV_ITEMS = [
  { href: "/account", label: "My tickets" },
  { href: "/account/orders", label: "Ticket orders" },
  { href: "/account/merch-orders", label: "Merch orders" },
  { href: "/account/profile", label: "Profile" },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/account");

  return (
    <DashboardShell navItems={NAV_ITEMS} title="My account" user={user}>
      {children}
    </DashboardShell>
  );
}
