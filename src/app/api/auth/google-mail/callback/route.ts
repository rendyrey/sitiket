import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { GMAIL_OAUTH_STATE_COOKIE } from "../state-cookie";

const SETTINGS_PATH = "/dashboard/admin/email-settings";

/**
 * Lands the browser back from Google's consent screen: validates the CSRF
 * state, forwards the authorization code to the backend (which exchanges it
 * and stores the encrypted refresh token), and bounces to the email-settings
 * page with the outcome in the query string.
 */
export async function GET(request: Request) {
  const incoming = await headers();
  const origin = `${incoming.get("x-forwarded-proto") ?? "http"}://${incoming.get("host")}`;
  const settingsUrl = (params: Record<string, string>) => {
    const url = new URL(SETTINGS_PATH, origin);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    return url;
  };

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const consentError = requestUrl.searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GMAIL_OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(GMAIL_OAUTH_STATE_COOKIE);

  if (consentError) {
    return NextResponse.redirect(settingsUrl({ gmail_error: `Google consent was cancelled (${consentError}).` }));
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(settingsUrl({ gmail_error: "The connect attempt expired or was tampered with — try again." }));
  }

  try {
    await apiFetch("/api/email-config/google", {
      method: "POST",
      body: { code, redirectUri: `${origin}/api/auth/google-mail/callback` },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.redirect(settingsUrl({ gmail_error: error.message }));
    }
    throw error;
  }

  return NextResponse.redirect(settingsUrl({ gmail: "connected" }));
}
