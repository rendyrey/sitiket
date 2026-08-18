import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { publicEnv } from "@/lib/public-env";
import { GMAIL_OAUTH_STATE_COOKIE } from "../state-cookie";

/** Sending scope only — must match the backend's GMAIL_SEND_SCOPE. */
const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

/**
 * Resolves the public origin the browser is actually on (works behind nginx
 * via X-Forwarded-Proto, and on plain http://localhost:3000 in dev). The
 * OAuth redirect URI must be built from it — and each origin's callback URL
 * must be listed under the Google OAuth client's authorized redirect URIs.
 */
const publicOrigin = async () => {
  const incoming = await headers();
  const proto = incoming.get("x-forwarded-proto") ?? "http";
  return `${proto}://${incoming.get("host")}`;
};

/**
 * Starts the "Connect Gmail" flow for the organizer email config: stamps a
 * CSRF state cookie and hands the browser to Google's consent screen.
 * `access_type=offline` + `prompt=consent` guarantee a refresh token comes
 * back on every (re)connect.
 */
export async function GET() {
  if (!publicEnv.googleClientId) {
    return NextResponse.redirect(new URL("/dashboard/admin/email-settings?gmail_error=Google+OAuth+is+not+configured", await publicOrigin()));
  }

  const origin = await publicOrigin();
  const state = randomUUID();

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", publicEnv.googleClientId);
  authUrl.searchParams.set("redirect_uri", `${origin}/api/auth/google-mail/callback`);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", `openid email ${GMAIL_SEND_SCOPE}`);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  const cookieStore = await cookies();
  cookieStore.set(GMAIL_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  return NextResponse.redirect(authUrl);
}
