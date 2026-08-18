import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — SiTIKET",
  description: "The terms that govern using the SiTIKET platform.",
};

const EFFECTIVE_DATE = "18 August 2026";
const CONTACT_EMAIL = "hello@sitiket.id";

export default function TermsOfServicePage() {
  return (
    <div className="bg-paper py-10 sm:py-16">
      <div className="site-container max-w-3xl">
        <span className="section-index">LEGAL</span>
        <h1 className="mt-4 text-4xl font-black uppercase leading-none xs:text-5xl">Terms of Service.</h1>
        <p className="mt-4 text-sm font-semibold text-black/50">Effective date: {EFFECTIVE_DATE}</p>

        <div className="mt-10 space-y-8">
          <Section title="1. Acceptance">
            <p>
              By using <strong>https://sitiket.com</strong> (&quot;SiTIKET&quot;, the &quot;Service&quot;) you agree to
              these Terms and our <Link className="underline" href="/privacy-policy">Privacy Policy</Link>. If you use
              SiTIKET on behalf of an organization, you confirm you are authorized to bind it to these Terms.
            </p>
          </Section>

          <Section title="2. What SiTIKET is">
            <p>
              SiTIKET is a platform that connects <strong>event organizers</strong> with <strong>ticket buyers</strong>.
              Organizers create and publish events, set ticket types and prices, and manage sales. Buyers order tickets
              and pay <strong>the organizer directly</strong> — by bank transfer or QRIS — and the organizer verifies
              the payment before tickets are issued.
            </p>
            <p className="mt-3">
              SiTIKET is <strong>not</strong> a party to the transaction between buyer and organizer, does not hold or
              process funds, and is not a payment processor. Each event is offered and fulfilled by its organizer.
            </p>
          </Section>

          <Section title="3. Accounts">
            <p>
              Signing in uses your Google account. You are responsible for activity under your account and for keeping
              your Google account secure. Provide accurate contact details on orders — tickets and verification codes
              are delivered to the email address you give.
            </p>
          </Section>

          <Section title="4. Buying tickets">
            <ul className="list-disc space-y-2 pl-5">
              <li>An order reserves tickets for a limited payment window; unpaid orders expire and the inventory is released.</li>
              <li>Pay exactly the stated amount, then upload your proof of payment. The organizer reviews it manually — confirmation is not instant.</li>
              <li>Tickets are issued as QR codes after the organizer approves your payment. Each ticket admits one entry and is void after being scanned.</li>
              <li>Refunds are requested through the platform and are decided by the event&apos;s organizer (see section 6).</li>
            </ul>
          </Section>

          <Section title="5. Organizer obligations">
            <ul className="list-disc space-y-2 pl-5">
              <li>Describe events truthfully and honor every validly issued ticket.</li>
              <li>Review payment proofs promptly and in good faith.</li>
              <li>Comply with all laws applicable to the event, including permits, taxes, and consumer protection.</li>
              <li>
                Set up an outgoing email identity (connected Gmail or SMTP) before publishing events — transactional
                email to your buyers is sent from your own address, and you are its sender of record.
              </li>
              <li>Use buyer data only to fulfill the event (ticketing, entry, refunds) — never for unrelated marketing or resale.</li>
            </ul>
          </Section>

          <Section title="6. Payments & refunds">
            <p>
              All payments flow directly from buyer to organizer via the organizer&apos;s bank account or QRIS.
              Refunds, cancellations, and event changes are the organizer&apos;s responsibility; SiTIKET provides the
              tooling (refund requests, status tracking) but does not guarantee, insure, or intermediate payments. If
              an event is cancelled, your remedy is against the organizer.
            </p>
          </Section>

          <Section title="7. Acceptable use">
            <p>You must not:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>upload false payment proofs, forge tickets, or attempt duplicate check-ins;</li>
              <li>list unlawful, fraudulent, or misleading events;</li>
              <li>scrape, overload, probe, or interfere with the Service;</li>
              <li>use the Service to send spam or any email unrelated to your events.</li>
            </ul>
            <p className="mt-3">We may suspend accounts or remove events that violate these Terms.</p>
          </Section>

          <Section title="8. Intellectual property">
            <p>
              The SiTIKET name, brand, and software are ours. Content you upload (event descriptions, images, QRIS
              codes) remains yours; you grant us a license to host and display it to operate the Service, and you
              confirm you have the rights to everything you upload.
            </p>
          </Section>

          <Section title="9. Disclaimers & liability">
            <p>
              The Service is provided <strong>&quot;as is&quot;</strong>. To the maximum extent permitted by law, we
              disclaim warranties of any kind and are not liable for indirect or consequential damages, or for the
              acts, omissions, events, or payment disputes of organizers or buyers. Our total liability for any claim
              is limited to the platform fees you paid us in the preceding 12 months (currently zero).
            </p>
          </Section>

          <Section title="10. Termination, changes & law">
            <p>
              You may stop using the Service at any time; we may suspend or terminate access for violations of these
              Terms. We may update these Terms — material changes will be announced on this page with a new effective
              date. These Terms are governed by the laws of the Republic of Indonesia. Contact:{" "}
              <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
          </Section>

          <p className="border-t-2 border-ink pt-6 text-sm text-black/50">
            See also our <Link className="underline" href="/privacy-policy">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="border-2 border-ink bg-white p-5 text-sm leading-6 text-black/70 sm:p-7">
      <h2 className="mb-4 text-lg font-black uppercase text-ink">{title}</h2>
      {children}
    </section>
  );
}
