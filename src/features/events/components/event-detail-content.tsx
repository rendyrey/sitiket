export default function EventDetailContent() {
  return (
    <section className="section-space">
      <div className="site-container grid gap-14 lg:grid-cols-[1fr_360px]">
        <div>
          <span className="section-index">THE DETAILS</span>
          <h2 className="mt-4 text-4xl font-black uppercase sm:text-6xl">KNOW BEFORE<br />YOU GO.</h2>
          <div className="prose-copy mt-8">
            <p>Doors open 60 minutes before the event begins. Please have your digital ticket ready on your phone when you arrive.</p>
            <p>Each ticket is valid for one person and one entry. Tickets are non-refundable, but may be transferred to another attendee before the event date.</p>
            <h3>What’s included</h3>
            <ul><li>General admission to the full event</li><li>Digital QR ticket delivered instantly</li><li>Access to all public program areas</li></ul>
          </div>
        </div>
        <EventRequirements />
      </div>
    </section>
  );
}

function EventRequirements() {
  return (
    <aside className="h-fit border-2 border-ink bg-white p-7 shadow-[9px_9px_0_#111]">
      <span className="tag">Important</span>
      <h3 className="mt-5 text-2xl font-black uppercase">Bring the essentials.</h3>
      <ul className="mt-5 space-y-3 text-sm font-semibold text-black/60">
        <li>Valid photo identification</li>
        <li>Your digital ticket QR code</li>
        <li>A refillable water bottle</li>
      </ul>
      <div className="mt-7 border-t border-black/10 pt-5 text-xs leading-5 text-black/45">By purchasing, you agree to the organizer’s entry policy and SiTIKET terms.</div>
    </aside>
  );
}
