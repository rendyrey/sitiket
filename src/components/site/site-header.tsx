"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ActionLink from "@/components/ui/action-link";
import { mainNavigation } from "@/config/navigation";
import Logo from "./logo";
import { MenuIcon, TicketIcon } from "./icons";

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b-4 border-lime bg-ink text-white">
      <div className="site-container flex h-[72px] items-center justify-between sm:h-[84px] lg:h-[96px]">
        <Logo />
        <nav
          className="hidden items-center gap-6 lg:flex xl:gap-9"
          aria-label="Main navigation"
        >
          {mainNavigation.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link ${pathname === link.href ? "text-lime" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <ActionLink href="/login" variant="ghost">
            Sign in
          </ActionLink>
          <ActionLink href="/events" variant="lime">
            <TicketIcon className="h-4 w-4" /> Buy ticket
          </ActionLink>
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="grid h-11 w-11 shrink-0 place-items-center border border-white/30 transition-colors hover:border-lime hover:text-lime focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime lg:hidden"
          aria-controls="mobile-navigation"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          <MenuIcon className="h-6 w-6" />
        </button>
      </div>
      {open && (
        <div
          id="mobile-navigation"
          className="border-t border-white/15 bg-ink lg:hidden"
        >
          <nav
            className="site-container flex flex-col gap-1 py-4"
            aria-label="Mobile navigation"
          >
            {mainNavigation.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="border-b border-white/10 py-3 text-lg font-bold uppercase"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="py-3 text-lg font-bold uppercase text-lime"
            >
              Sign in
            </Link>
            <ActionLink
              href="/events"
              variant="lime"
              className="mt-2 w-full"
              onClick={() => setOpen(false)}
            >
              <TicketIcon className="h-4 w-4" /> Buy ticket
            </ActionLink>
          </nav>
        </div>
      )}
    </header>
  );
}
