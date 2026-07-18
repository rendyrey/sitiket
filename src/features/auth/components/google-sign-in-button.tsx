"use client";

import { useRouter } from "next/navigation";
import Script from "next/script";
import { useCallback, useId, useState } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

type GoogleSignInButtonProps = {
  clientId?: string;
  /** Where to send the browser after a successful sign-in. */
  redirectTo?: string;
};

/**
 * Renders the official Google Identity Services button (loaded via script
 * tag — no client-side SDK dependency needed) and, on a successful sign-in,
 * posts the resulting ID token to our own `/api/auth/google` Route Handler,
 * which verifies it against the backend and sets the httpOnly session
 * cookie. See lib/session.ts and app/api/auth/google/route.ts.
 */
export default function GoogleSignInButton({ clientId, redirectTo = "/" }: GoogleSignInButtonProps) {
  const router = useRouter();
  const containerId = useId();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleCredential = useCallback(
    async (credential: string) => {
      setError(null);
      setPending(true);
      try {
        const response = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: credential }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          setError(body?.error?.message ?? "Sign-in failed. Please try again.");
          return;
        }
        router.push(redirectTo);
        router.refresh();
      } finally {
        setPending(false);
      }
    },
    [redirectTo, router],
  );

  const handleScriptLoad = useCallback(() => {
    if (!clientId || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        void handleCredential(response.credential);
      },
    });
    const container = document.getElementById(containerId);
    if (container) {
      window.google.accounts.id.renderButton(container, {
        theme: "filled_black",
        size: "large",
        width: 320,
        text: "continue_with",
      });
    }
  }, [clientId, containerId, handleCredential]);

  if (!clientId) {
    return (
      <p className="border-2 border-black/15 bg-white p-4 text-sm font-semibold text-black/50">
        Google Sign-In is not configured on this deployment yet.
      </p>
    );
  }

  return (
    <div>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={handleScriptLoad} />
      <div id={containerId} className={pending ? "pointer-events-none opacity-60" : ""} />
      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
    </div>
  );
}
