import type { Metadata } from "next";
import Link from "next/link";
import { OrderStatusView } from "@/features/orders/components";
import { getOrderForViewer, getPaymentInstructions } from "@/features/orders/lib/api";

export const metadata: Metadata = { title: "Your order" };

export default async function OrderStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { id } = await params;
  const { email } = await searchParams;

  const result = await getOrderForViewer(id, email);

  if (!result) {
    return (
      <div className="bg-paper py-20">
        <div className="site-container max-w-lg text-center">
          <h1 className="text-3xl font-black uppercase">Order not found</h1>
          <p className="mt-4 text-black/50">
            We couldn&apos;t find that order, or you don&apos;t have access to it. If you checked out as a guest, use
            the confirmation link from your checkout session (it includes your email).
          </p>
          <Link href="/login" className="text-link mt-6 inline-flex">
            Sign in to see your orders
          </Link>
        </div>
      </div>
    );
  }

  const { order, isGuest } = result;
  const paymentInstructions =
    order.status === "pending_payment" ? await getPaymentInstructions(id, isGuest ? email : undefined) : null;

  return (
    <div className="bg-paper py-10 sm:py-16">
      <div className="site-container">
        <span className="section-index">ORDER STATUS</span>
        <h1 className="mt-4 text-4xl font-black uppercase leading-none xs:text-5xl">Your order.</h1>
        <div className="mt-8 sm:mt-10">
          <OrderStatusView order={order} isGuest={isGuest} guestEmail={isGuest ? email : undefined} paymentInstructions={paymentInstructions} />
        </div>
      </div>
    </div>
  );
}
