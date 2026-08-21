import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MerchCheckoutView } from "@/features/merch/components";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Merch checkout" };

export default async function MerchCheckoutPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/merch/checkout");

  return (
    <div className="bg-paper py-10 sm:py-16">
      <div className="site-container">
        <span className="section-index">MERCH CHECKOUT</span>
        <h1 className="mt-4 text-4xl font-black uppercase leading-none xs:text-5xl">Almost yours.</h1>
        <div className="mt-8 sm:mt-10">
          <MerchCheckoutView user={user} />
        </div>
      </div>
    </div>
  );
}
