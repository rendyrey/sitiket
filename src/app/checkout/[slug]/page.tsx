import { notFound } from "next/navigation";
import CheckoutForm from "@/components/site/checkout-form";
import { getEvent } from "@/data/events";

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const event = getEvent((await params).slug);
  if (!event) notFound();
  return <div className="bg-paper py-12 sm:py-20"><div className="site-container"><span className="section-index">SECURE CHECKOUT</span><h1 className="mt-4 text-5xl font-black uppercase leading-none sm:text-7xl">GET YOUR TICKET.</h1><p className="mt-4 max-w-xl text-black/50">You’re a few details away from {event.title}.</p><div className="mt-10"><CheckoutForm event={event}/></div></div></div>;
}
