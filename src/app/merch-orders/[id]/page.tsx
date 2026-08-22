import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MerchOrderStatusView } from "@/features/merch/components";
import { getMerchOrderForViewer, getMerchPaymentInstructions } from "@/features/merch/lib/api";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Your merch order" };

export default async function MerchOrderStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirect=/merch-orders/${id}`);

  const order = await getMerchOrderForViewer(id);

  if (!order) {
    return (
      <div className="bg-paper py-20">
        <div className="site-container max-w-lg text-center">
          <h1 className="text-3xl font-black uppercase">Order not found</h1>
          <p className="mt-4 text-black/50">We couldn&apos;t find that merch order, or you don&apos;t have access to it.</p>
          <Link href="/account/merch-orders" className="text-link mt-6 inline-flex">
            See your orders
          </Link>
        </div>
      </div>
    );
  }

  // Only the buyer sees payment instructions; a seller/super_admin viewing
  // the order gets the read-only status view.
  const paymentInstructions =
    order.status === "pending_payment" && order.userId === user.id ? await getMerchPaymentInstructions(id) : null;

  return (
    <div className="bg-paper py-10 sm:py-16">
      <div className="site-container">
        <span className="section-index">MERCH ORDER</span>
        <h1 className="mt-4 text-4xl font-black uppercase leading-none xs:text-5xl">Your merch order.</h1>
        <div className="mt-8 sm:mt-10">
          <MerchOrderStatusView order={order} paymentInstructions={paymentInstructions} />
        </div>
      </div>
    </div>
  );
}
