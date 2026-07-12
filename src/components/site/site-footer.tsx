import Link from "next/link";
import Logo from "./logo";
import { InstagramIcon, MailIcon } from "./icons";

export default function SiteFooter() {
  return (
    <footer className="border-t-4 border-lime bg-ink text-white">
      <div className="site-container grid gap-12 py-14 md:grid-cols-[1.3fr_1fr_1fr] md:py-20">
        <div><Logo /><p className="mt-5 max-w-sm text-sm leading-6 text-white/55">Your shortcut to unforgettable moments. Discover local events, secure your spot, and show up ready.</p></div>
        <div><p className="footer-label">Explore</p><div className="mt-5 flex flex-col gap-3 text-sm font-semibold"><Link href="/events">All events</Link><Link href="/events?category=music">Music</Link><Link href="/events?category=community">Community</Link><Link href="/login">My tickets</Link></div></div>
        <div><p className="footer-label">Stay in the loop</p><p className="mt-5 text-sm text-white/55">Event drops, presales, and city picks. No noise.</p><div className="mt-5 flex gap-3"><a className="social-button" href="mailto:hello@sitiket.id" aria-label="Email"><MailIcon className="h-5 w-5"/></a><a className="social-button" href="#" aria-label="Instagram"><InstagramIcon className="h-5 w-5"/></a></div></div>
      </div>
      <div className="border-t border-white/10"><div className="site-container flex flex-col gap-2 py-5 text-xs uppercase tracking-wider text-white/40 sm:flex-row sm:justify-between"><span>© 2026 SiTIKET</span><span>Built for good times</span></div></div>
    </footer>
  );
}
