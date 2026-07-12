"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Logo from "./logo";
import { MenuIcon, TicketIcon } from "./icons";

const links = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
  { href: "/events?category=music", label: "Music" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b-4 border-lime bg-ink text-white">
      <div className="site-container flex h-[84px] items-center justify-between sm:h-[96px]">
        <Logo />
        <nav className="hidden items-center gap-9 md:flex" aria-label="Main navigation">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={`nav-link ${pathname === link.href ? "text-lime" : ""}`}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="button button-ghost">Sign in</Link>
          <Link href="/events" className="button button-lime"><TicketIcon className="h-4 w-4" /> Buy ticket</Link>
        </div>
        <button onClick={() => setOpen(!open)} className="grid h-11 w-11 place-items-center border border-white/30 md:hidden" aria-label="Toggle menu" aria-expanded={open}>
          <MenuIcon className="h-6 w-6" />
        </button>
      </div>
      {open && (
        <div className="border-t border-white/15 bg-ink px-5 py-5 md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="border-b border-white/10 py-3 text-lg font-bold uppercase">{link.label}</Link>)}
            <Link href="/login" onClick={() => setOpen(false)} className="py-3 text-lg font-bold uppercase text-lime">Sign in</Link>
          </nav>
        </div>
      )}
    </header>
  );
}
