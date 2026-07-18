import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatPrice } from "@/data/events";
import ApplyAdminForm from "@/features/account/components/apply-admin-form";
import { listMyOrders, listMyTickets } from "@/features/account/lib/api";
import { OrderStatusBadge, TicketsList } from "@/features/orders/components";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "My tickets" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/account");

  const [orders, tickets] = await Promise.all([listMyOrders(), listMyTickets()]);
  const upcomingTickets = tickets.filter((ticket) => ticket.status !== "void");

  return (
    <div className="bg-paper py-10 sm:py-16">
      <div className="site-container">
        <span className="section-index">MY ACCOUNT</span>
        <h1 className="mt-4 text-4xl font-black uppercase leading-none xs:text-5xl">
          {user.name.split(" ")[0]}&apos;s tickets.
        </h1>
        <p className="mt-3 text-black/50">{user.email}</p>

        <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_360px]">
          <div className="space-y-12">
            <section>
              <h2 className="text-xl font-black uppercase">Your tickets</h2>
              <div className="mt-5">
                {upcomingTickets.length === 0 ? (
                  <p className="border-2 border-black/15 bg-white p-6 text-sm font-semibold text-black/50">
                    No tickets yet.{" "}
                    <Link href="/events" className="text-black underline decoration-lime decoration-2 underline-offset-4">
                      Find something to go to
                    </Link>
                    .
                  </p>
                ) : (
                  <TicketsList tickets={upcomingTickets} />
                )}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-black uppercase">Order history</h2>
              <div className="mt-5 space-y-3">
                {orders.length === 0 && <p className="text-sm text-black/50">No orders yet.</p>}
                {orders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 border-2 border-ink bg-white p-4 transition-colors hover:bg-paper"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">#{order.id}</p>
                      <p className="text-xs text-black/40">{new Date(order.createdAt).toLocaleDateString("en-GB")}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <strong>{formatPrice(order.totalAmount)}</strong>
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <div className="h-fit">{user.role === "user" && <ApplyAdminForm />}</div>
        </div>
      </div>
    </div>
  );
}
