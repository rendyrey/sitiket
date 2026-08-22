import { redirect } from "next/navigation";
import DashboardShell from "@/components/ui/dashboard-shell";
import { listMyStaffInvitationsAction } from "@/features/account/lib/actions";
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

  // "Gate staff" only appears once the user has been invited somewhere —
  // most buyers never are, and an always-on empty page would just be noise.
  const invitations = await listMyStaffInvitationsAction();
  const navItems =
    invitations.ok && invitations.data.length > 0
      ? [...NAV_ITEMS, { href: "/account/gate-staff", label: "Gate staff" }]
      : NAV_ITEMS;

  return (
    <DashboardShell navItems={navItems} title="My account" user={user}>
      {children}
    </DashboardShell>
  );
}
