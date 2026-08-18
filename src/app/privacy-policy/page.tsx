import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — SiTIKET",
  description: "How SiTIKET collects, uses, and protects your data.",
};

const EFFECTIVE_DATE = "18 August 2026";
const CONTACT_EMAIL = "hello@sitiket.id";

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-paper py-10 sm:py-16">
      <div className="site-container max-w-3xl">
        <span className="section-index">LEGAL</span>
        <h1 className="mt-4 text-4xl font-black uppercase leading-none xs:text-5xl">Privacy Policy.</h1>
        <p className="mt-4 text-sm font-semibold text-black/50">Effective date: {EFFECTIVE_DATE}</p>

        <div className="mt-10 space-y-8">
          <Section title="Who we are">
            <p>
              SiTIKET (&quot;we&quot;, &quot;us&quot;) operates <strong>https://sitiket.com</strong>, an event ticketing
              platform where event organizers publish events and sell tickets, and buyers discover events, purchase
              tickets, and check in at the gate. This policy explains what personal data we collect, why, and how we
              handle it. Questions or requests: <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
          </Section>

          <Section title="Data we collect">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Account data</strong> — when you sign in with Google we receive your name, email address, and
                profile picture from your Google account. We do not receive or store your Google password.
              </li>
              <li>
                <strong>Order data</strong> — when you buy a ticket (signed in or as a guest) we collect your name,
                email address, and phone number so the organizer can issue your tickets and contact you about the
                event. Guest buyers verify their email with a one-time code.
              </li>
              <li>
                <strong>Payment proof</strong> — payments go directly from you to the event organizer (bank transfer
                or QRIS). You upload an image of your payment receipt, which we store and show to that event&apos;s
                organizer for manual verification. We never collect card numbers, bank credentials, or e-wallet logins.
              </li>
              <li>
                <strong>Organizer data</strong> — organizers provide business/contact details, payout bank account
                numbers, a QRIS code image, and an outgoing email configuration (see the Google section below, or SMTP
                credentials for other providers).
              </li>
              <li>
                <strong>Check-in data</strong> — when a ticket&apos;s QR code is scanned at the gate we record when and
                by which device it was checked in, to prevent ticket reuse.
              </li>
            </ul>
          </Section>

          <Section title="Google user data">
            <p>SiTIKET uses Google services in two ways:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <strong>Google Sign-In</strong> — used only to authenticate you. We store the basic profile Google
                shares (name, email, avatar) to create your account.
              </li>
              <li>
                <strong>Connect Gmail (organizers only)</strong> — an organizer may authorize SiTIKET to send email on
                their behalf via the Gmail API (<code>gmail.send</code> scope). We use this authorization{" "}
                <strong>solely to send transactional emails</strong> for that organizer&apos;s events — buyer
                verification codes, ticket deliveries, payment and refund updates. We <strong>cannot and do not</strong>{" "}
                read, browse, or delete anything in the organizer&apos;s mailbox; the permission we request only allows
                sending. The authorization token is stored encrypted (AES-256-GCM) and is never shared. Organizers can
                revoke this access at any time at{" "}
                <a className="underline" href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">
                  myaccount.google.com/permissions
                </a>{" "}
                or by reconnecting a different account in their dashboard.
              </li>
            </ul>
            <p className="mt-3">
              SiTIKET&apos;s use and transfer of information received from Google APIs adheres to the{" "}
              <a
                className="underline"
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noreferrer"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements. We do not use Google user data for advertising, do not sell it,
              and do not allow humans to read it except with the account holder&apos;s consent, for security purposes,
              or where required by law.
            </p>
          </Section>

          <Section title="How we use data">
            <ul className="list-disc space-y-2 pl-5">
              <li>Processing orders, issuing QR tickets, and running gate check-in.</li>
              <li>
                Sending transactional email about your orders and tickets. These emails are sent from the event
                organizer&apos;s own email address, so replies reach the organizer directly.
              </li>
              <li>Letting organizers verify payment proofs and handle refund requests for their events.</li>
              <li>Keeping the platform secure (rate limiting, abuse and fraud prevention).</li>
            </ul>
            <p className="mt-3">We do not sell personal data, and we do not use it for third-party advertising.</p>
          </Section>

          <Section title="Sharing">
            <p>
              The organizer of an event you buy tickets for can see your order details (name, email, phone, payment
              proof) — they need them to verify your payment and admit you at the door. Beyond that, we only disclose
              data when required by law. We use no third-party analytics or advertising trackers.
            </p>
          </Section>

          <Section title="Cookies">
            <p>
              We use essential cookies only: a session cookie that keeps you signed in, and a short-lived security
              cookie during the Gmail connection flow. No tracking or advertising cookies.
            </p>
          </Section>

          <Section title="Storage, security & retention">
            <p>
              Data is stored on our servers and transmitted over HTTPS. Sensitive credentials (organizer SMTP passwords
              and Gmail authorization tokens) are encrypted at rest. We keep order and ticket records for as long as
              needed to operate the platform and meet legal obligations. To request deletion of your account or data,
              email <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> — we will delete data
              that we are not legally required to retain.
            </p>
          </Section>

          <Section title="Changes">
            <p>
              We may update this policy as the product evolves. Material changes will be announced on this page with a
              new effective date. Continued use of SiTIKET after a change means you accept the updated policy.
            </p>
          </Section>

          <p className="border-t-2 border-ink pt-6 text-sm text-black/50">
            See also our <Link className="underline" href="/terms-of-service">Terms of Service</Link>.
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
