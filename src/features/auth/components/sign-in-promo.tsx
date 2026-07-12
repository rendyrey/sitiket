import { TicketIcon } from "@/components/site/icons";

export default function SignInPromo() {
  return (
    <section className="relative hidden overflow-hidden bg-lime p-16 lg:flex lg:flex-col lg:justify-between">
      <div className="absolute -right-16 top-1/2 -translate-y-1/2 rotate-[-12deg] text-[260px] font-black leading-none text-black/[.08]">ST</div>
      <TicketIcon className="h-14 w-14" />
      <div className="relative"><span className="section-index">YOUR NIGHT, SORTED.</span><h1 className="mt-5 text-7xl font-black uppercase leading-[.88]">ALL YOUR<br />TICKETS.<br />ONE PLACE.</h1></div>
      <p className="max-w-sm text-sm font-semibold leading-6 text-black/55">Sign in to access tickets, transfer them to friends, and keep track of what’s next.</p>
    </section>
  );
}
