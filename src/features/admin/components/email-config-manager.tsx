"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import FormField from "@/components/ui/form-field";
import { saveEmailConfigAction } from "@/features/admin/lib/actions";
import type { EmailProvider, OrganizerEmailConfig, SaveEmailConfigRequest } from "@/lib/api/types";

export default function EmailConfigManager({ config }: { config: OrganizerEmailConfig | null }) {
  const router = useRouter();
  const [provider, setProvider] = useState<EmailProvider>(config?.provider ?? "gmail");
  const [email, setEmail] = useState(config?.fromEmail ?? "");
  const [password, setPassword] = useState("");
  const [fromName, setFromName] = useState(config?.fromName ?? "");
  const [host, setHost] = useState(config?.provider === "custom" ? config.smtpHost : "");
  const [port, setPort] = useState(config?.provider === "custom" ? String(config.smtpPort) : "465");
  const [secure, setSecure] = useState(config?.provider === "custom" ? config.smtpSecure : true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError("Email and password are required — saving re-verifies the credentials.");
      return;
    }
    if (provider === "custom" && (!host.trim() || !port.trim())) {
      setError("SMTP host and port are required for a custom provider.");
      return;
    }

    const shared = {
      email: email.trim(),
      password,
      fromName: fromName.trim() || undefined,
    };
    const payload: SaveEmailConfigRequest =
      provider === "gmail"
        ? { provider: "gmail", ...shared }
        : { provider: "custom", ...shared, host: host.trim(), port: Number(port), secure };

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
            {config.provider === "gmail" ? "Gmail" : `${config.smtpHost}:${config.smtpPort}`} · every email about your
            events (verification codes, tickets, refunds) is sent from this address.
          </p>
        </div>
      ) : (
        <p className="border-2 border-red-500/60 bg-red-500/5 p-5 text-sm font-semibold text-red-700">
          No sender email yet — you must set one up before you can create events. Buyers receive their verification
          codes and tickets from this address.
        </p>
      )}

      <div className="border-2 border-ink bg-white p-5 sm:p-7">
        <span className="tag">{config ? "Update sender" : "Set up sender"}</span>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="field-label sm:col-span-2">
            Email provider
            <select className="text-field mt-2" value={provider} onChange={(e) => setProvider(e.target.value as EmailProvider)}>
              <option value="gmail">Gmail</option>
              <option value="custom">Other (custom SMTP)</option>
            </select>
          </label>

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
            label={provider === "gmail" ? "Google App Password *" : "SMTP password *"}
            name="password"
            type="password"
            placeholder={config ? "Re-enter to save changes" : ""}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <FormField
            wrapperClassName="sm:col-span-2"
            label="Sender name (optional)"
            name="fromName"
            placeholder="Shown as the From name, e.g. your business name"
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
          />

          {provider === "gmail" ? (
            <p className="text-xs leading-5 text-black/50 sm:col-span-2">
              Use a{" "}
              <a
                className="font-bold underline"
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noreferrer"
              >
                Google App Password
              </a>
              , not your normal Gmail password (requires 2-Step Verification on the Google account). The server settings
              (smtp.gmail.com) are filled in for you.
            </p>
          ) : (
            <>
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
              <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
                <input type="checkbox" checked={secure} onChange={(e) => setSecure(e.target.checked)} className="border-black text-black focus:ring-lime" />
                Use TLS/SSL (port 465 — uncheck for STARTTLS on 587)
              </label>
            </>
          )}
        </div>
        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
        <button type="button" onClick={() => void handleSave()} disabled={submitting} className="button button-dark mt-5 disabled:opacity-50">
          {submitting ? "Verifying credentials…" : "Verify & save"}
        </button>
        <p className="mt-3 text-xs text-black/45">
          Saving signs in to the mail server with these credentials first — nothing is stored unless the login works.
        </p>
      </div>
    </div>
  );
}
