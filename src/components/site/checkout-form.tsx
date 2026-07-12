"use client";

import { useState } from "react";
import type { EventItem } from "@/data/events";
import { formatPrice } from "@/data/events";
import { TicketIcon } from "./icons";

export default function CheckoutForm({ event }: { event: EventItem }) {
  const [quantity, setQuantity] = useState(1);
  const fee = 5000 * quantity;
  const total = event.price * quantity + fee;
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
      <div className="space-y-8">
        <section className="checkout-panel"><span className="checkout-step">01</span><h2>Choose your ticket</h2><div className="mt-7 flex items-center justify-between gap-4 border-2 border-ink bg-paper p-5"><div><strong className="block text-lg uppercase">General Admission</strong><span className="mt-1 block text-sm text-black/50">Entry for one person</span><span className="mt-3 block font-bold">{formatPrice(event.price)}</span></div><div className="flex items-center border-2 border-ink bg-white"><button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="quantity-button" aria-label="Decrease quantity">−</button><span className="w-10 text-center font-black">{quantity}</span><button onClick={() => setQuantity(Math.min(6, quantity + 1))} className="quantity-button" aria-label="Increase quantity">+</button></div></div></section>
        <section className="checkout-panel"><span className="checkout-step">02</span><h2>Your details</h2><div className="mt-7 grid gap-5 sm:grid-cols-2"><label className="field-label">First name<input className="text-field" placeholder="Your first name" /></label><label className="field-label">Last name<input className="text-field" placeholder="Your last name" /></label><label className="field-label sm:col-span-2">Email address<input type="email" className="text-field" placeholder="you@example.com" /></label><label className="field-label sm:col-span-2">Phone number<input type="tel" className="text-field" placeholder="+62 812 3456 7890" /></label></div></section>
        <section className="checkout-panel"><span className="checkout-step">03</span><h2>Payment method</h2><div className="mt-7 grid gap-3 sm:grid-cols-3">{["Virtual Account", "E-Wallet", "QRIS"].map((method, index) => <label key={method} className={`payment-choice ${index === 0 ? "payment-choice-active" : ""}`}><input type="radio" name="payment" defaultChecked={index === 0} className="sr-only"/><span className="block text-sm font-black uppercase">{method}</span><span className="mt-1 block text-xs text-black/45">Fast & secure</span></label>)}</div></section>
      </div>
      <aside className="h-fit border-2 border-ink bg-ink p-7 text-white shadow-[10px_10px_0_#b6ff00] lg:sticky lg:top-32"><span className="text-xs font-bold uppercase tracking-widest text-lime">Order summary</span><h2 className="mt-3 text-2xl font-black uppercase text-white">{event.title}</h2><p className="mt-2 text-sm text-white/50">{event.date} · {event.time}<br/>{event.venue}</p><div className="my-7 border-y border-white/15 py-5 text-sm"><div className="flex justify-between py-2 text-white/65"><span>General Admission × {quantity}</span><span>{formatPrice(event.price * quantity)}</span></div><div className="flex justify-between py-2 text-white/65"><span>Service fee</span><span>{formatPrice(fee)}</span></div></div><div className="flex items-end justify-between"><span className="text-xs font-bold uppercase tracking-widest text-white/45">Total</span><strong className="text-2xl text-lime">{formatPrice(total)}</strong></div><button className="button button-lime button-large mt-7 w-full"><TicketIcon className="h-5 w-5"/> Continue to pay</button><p className="mt-4 text-center text-[11px] leading-4 text-white/35">Demo checkout only. No payment will be processed.</p></aside>
    </div>
  );
}
