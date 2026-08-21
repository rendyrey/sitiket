import type { Metadata } from "next";
import { CartView } from "@/features/merch/components";

export const metadata: Metadata = { title: "Your cart" };

export default function CartPage() {
  return (
    <div className="bg-paper py-10 sm:py-16">
      <div className="site-container">
        <span className="section-index">MERCH CART</span>
        <h1 className="mt-4 text-4xl font-black uppercase leading-none xs:text-5xl">Your cart.</h1>
        <div className="mt-8 sm:mt-10">
          <CartView />
        </div>
      </div>
    </div>
  );
}
