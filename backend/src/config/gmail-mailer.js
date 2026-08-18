import { OAuth2Client } from "google-auth-library";
import MailComposer from "nodemailer/lib/mail-composer/index.js";
import { env } from "./env.js";
import { open } from "../utils/secret-box.js";
import { badRequest, conflict } from "../utils/http-error.js";

// Sending scope only — deliberately NOT the restricted full-mail scope
// (https://mail.google.com/), so Google's app-verification burden stays at
// the "sensitive scope" tier. This rules out SMTP XOAUTH2 (which requires
// full-mail); delivery goes through the Gmail REST API instead.
export const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

const GMAIL_SEND_ENDPOINT = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

const assertOAuthConfigured = () => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw conflict(
      "GOOGLE_OAUTH_NOT_CONFIGURED",
      "Google OAuth is not configured on the server (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)",
    );
  }
};

/**
 * Exchanges the authorization code from the "Connect Gmail" consent redirect
 * for tokens, and resolves which Gmail address granted access.
 * @param {{ code: string, redirectUri: string }} input
 * @returns {Promise<{ email: string, refreshToken: string }>}
 */
export const exchangeGmailAuthCode = async ({ code, redirectUri }) => {
  assertOAuthConfigured();
  const client = new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, redirectUri);

  let tokens;
  try {
    ({ tokens } = await client.getToken(code));
  } catch (error) {
    throw badRequest("GOOGLE_CODE_EXCHANGE_FAILED", `Google rejected the authorization code: ${error.message}`);
  }

  if (!tokens.scope?.split(" ").includes(GMAIL_SEND_SCOPE)) {
    throw badRequest(
      "GMAIL_SEND_SCOPE_MISSING",
      'The "Send email on your behalf" permission was not granted — reconnect and leave it checked',
    );
  }
  // Google returns refresh_token only when consent was (re-)prompted; the
  // connect URL always sends prompt=consent, so absence is unexpected.
  if (!tokens.refresh_token) {
    throw badRequest("GOOGLE_REFRESH_TOKEN_MISSING", "Google did not return a refresh token — try connecting again");
  }

  const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: env.GOOGLE_CLIENT_ID });
  const email = ticket.getPayload()?.email;
  if (!email) throw badRequest("GOOGLE_EMAIL_MISSING", "Google did not return the account's email address");

  return { email, refreshToken: tokens.refresh_token };
};

/**
 * Access-token cache: one per organizer, keyed by the config row's freshness
 * so reconnecting immediately invalidates it. Google access tokens live ~1h;
 * google-auth-library refreshes them itself when expired.
 */
const oauthClients = new Map();

const getClientForConfig = (config) => {
  assertOAuthConfigured();
  const freshness = config.updated_at instanceof Date ? config.updated_at.getTime() : String(config.updated_at);
  const key = `${config.id}:${freshness}`;
  const cached = oauthClients.get(config.owner_id);
  if (cached?.key === key) return cached.client;

  const client = new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);
  client.setCredentials({ refresh_token: open(config.google_refresh_token_encrypted) });
  oauthClients.set(config.owner_id, { key, client });
  return client;
};

/**
 * Sends one email through the Gmail API as the organizer's connected account.
 * Throws with a reconnect hint when Google refuses the grant (revoked access,
 * expired testing-mode token) so the failed `email_jobs` row says what to do.
 * @param {object} config - an `organizer_email_configs` row with `google_refresh_token_encrypted`
 * @param {{ from: string, to: string, subject: string, text: string, html?: string }} message
 */
export const sendViaGmail = async (config, message) => {
  const client = getClientForConfig(config);

  let accessToken;
  try {
    ({ token: accessToken } = await client.getAccessToken());
  } catch (error) {
    throw new Error(
      `Gmail access for ${config.from_email} was refused (${error.message}) — the organizer must reconnect Gmail in Email settings`,
    );
  }

  const mime = await new MailComposer(message).compile().build();
  const response = await fetch(GMAIL_SEND_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: mime.toString("base64url") }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Gmail API send failed (${response.status}) for ${config.from_email}: ${body.slice(0, 300)}`);
  }
};
