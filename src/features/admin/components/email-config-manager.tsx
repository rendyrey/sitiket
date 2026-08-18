"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import FormField from "@/components/ui/form-field";
import { saveEmailConfigAction } from "@/features/admin/lib/actions";
import type { OrganizerEmailConfig, SaveEmailConfigRequest } from "@/lib/api/types";

type EmailConfigManagerProps = {
  config: OrganizerEmailConfig | null;
  /** Outcome of a "Connect Gmail" redirect, from the page's query string. */
  gmailNotice?: { kind: "connected" | "error"; message?: string };
};

export default function EmailConfigManager({ config, gmailNotice }: EmailConfigManagerProps) {
  const router = useRouter();
  const [showCustomForm, setShowCustomForm] = useState(config?.provider === "custom");
  const [email, setEmail] = useState(config?.provider === "custom" ? config.fromEmail : "");
  const [password, setPassword] = useState("");
  const [fromName, setFromName] = useState(config?.fromName ?? "");
  const [host, setHost] = useState(config?.provider === "custom" ? (config.smtpHost ?? "") : "");
  const [port, setPort] = useState(config?.provider === "custom" && config.smtpPort ? String(config.smtpPort) : "465");
  const [secure, setSecure] = useState(config?.provider === "custom" ? config.smtpSecure : true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveCustom = async () => {
    setError(null);
    if (!email.trim() || !password || !host.trim() || !port.trim()) {
      setError("Email, password, SMTP host, and port are required — saving verifies the login.");
      return;
    }

    const payload: SaveEmailConfigRequest = {
      provider: "custom",
      email: email.trim(),
      password,
      fromName: fromName.trim() || undefined,
      host: host.trim(),
      port: Number(port),
      secure,
    };

    setSubmitting(true);
    const result = await saveEmailConfigAction(payload);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      toast.error(result.message);
      return;
    }
    setPassword("");
    toast.success("Email config verified and saved.");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {gmailNotice?.kind === "connected" && (
        <p className="border-2 border-green-600/60 bg-green-600/5 p-5 text-sm font-semibold text-green-800">
          Gmail connected — your buyers now hear from {config?.fromEmail ?? "your Gmail address"}.
        </p>
      )}
      {gmailNotice?.kind === "error" && (
        <p className="border-2 border-red-500/60 bg-red-500/5 p-5 text-sm font-semibold text-red-700">
          Connecting Gmail failed: {gmailNotice.message ?? "unknown error"}
        </p>
      )}

      {config ? (
        <div className="border-2 border-ink bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="tag">Current sender</span>
            {config.verifiedAt && <span className="text-[10px] font-bold uppercase tracking-widest text-green-700">Verified</span>}
          </div>
          <p className="mt-4 text-sm font-bold">
            {config.fromName ? `${config.fromName} <${config.fromEmail}>` : config.fromEmail}
          </p>
          <p className="mt-1 text-xs text-black/45">
            {config.googleConnected
              ? "Gmail (connected with Google)"
              : config.provider === "gmail"
                ? "Gmail (App Password — legacy)"
                : `${config.smtpHost}:${config.smtpPort}`}{" "}
            · every email about your events (verification codes, tickets, refunds) is sent from this address.
          </p>
        </div>
      ) : (
        <p className="border-2 border-red-500/60 bg-red-500/5 p-5 text-sm font-semibold text-red-700">
          No sender email yet — you must set one up before you can create events. Buyers receive their verification
          codes and tickets from this address.
        </p>
      )}

      <div className="border-2 border-ink bg-white p-5 sm:p-7">
        <span className="tag">Use Gmail</span>
        <p className="mt-4 text-sm leading-6 text-black/60">
          One click — sign in with Google and allow &quot;Send email on your behalf&quot;. No passwords or server
          settings to copy around; buyer emails are sent by your own Gmail account.
        </p>
        <a href="/api/auth/google-mail/start" className="button button-dark button-large mt-5 inline-flex">
          {config?.googleConnected ? "Reconnect Gmail" : "Connect Gmail"}
        </a>
        {config?.googleConnected && (
          <p className="mt-3 text-xs text-black/45">
            Reconnect to switch to a different Google account, or if sending stopped working after you revoked access.
          </p>
        )}
      </div>

      <div className="border-2 border-ink bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="tag">Other email provider (SMTP)</span>
          <button type="button" onClick={() => setShowCustomForm((current) => !current)} className="text-xs font-black uppercase hover:underline">
            {showCustomForm ? "Hide" : "Set up"}
          </button>
        </div>
        {showCustomForm && (
          <>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <FormField
                required
                label="Email address *"
                name="email"
                type="email"
                placeholder="you@yourbusiness.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <FormField
                required
                label="SMTP password *"
                name="password"
                type="password"
                placeholder={config?.provider === "custom" ? "Re-enter to save changes" : ""}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <FormField
                required
                label="SMTP host *"
                name="host"
                placeholder="mail.yourbusiness.com"
                value={host}
                onChange={(e) => setHost(e.target.value)}
              />
              <FormField
                required
                label="SMTP port *"
                name="port"
                type="number"
                min={1}
                max={65535}
                value={port}
                onChange={(e) => setPort(e.target.value)}
              />
              <FormField
                wrapperClassName="sm:col-span-2"
                label="Sender name (optional)"
                name="fromName"
                placeholder="Shown as the From name, e.g. your business name"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
              />
              <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
                <input type="checkbox" checked={secure} onChange={(e) => setSecure(e.target.checked)} className="border-black text-black focus:ring-lime" />
                Use TLS/SSL (port 465 — uncheck for STARTTLS on 587)
              </label>
            </div>
            {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
            <button type="button" onClick={() => void handleSaveCustom()} disabled={submitting} className="button button-dark mt-5 disabled:opacity-50">
              {submitting ? "Verifying credentials…" : "Verify & save"}
            </button>
            <p className="mt-3 text-xs text-black/45">
              Saving signs in to the mail server with these credentials first — nothing is stored unless the login works.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
