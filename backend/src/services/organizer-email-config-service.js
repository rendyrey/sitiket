import { createOrganizerTransport } from "../config/mailer.js";
import { exchangeGmailAuthCode } from "../config/gmail-mailer.js";
import * as organizerEmailConfigsRepository from "../repositories/organizer-email-configs-repository.js";
import { badRequest } from "../utils/http-error.js";
import { seal } from "../utils/secret-box.js";

/**
 * Strips stored credentials before a config row leaves the API, exposing
 * only a `google_connected` 0|1 flag in their place.
 */
const sanitize = (config) => {
  if (!config) return null;
  const { smtp_password_encrypted: _password, google_refresh_token_encrypted: googleToken, ...safe } = config;
  return { ...safe, google_connected: googleToken ? 1 : 0 };
};

/** @param {string} ownerId - always the calling admin's own id */
export const getMine = async (ownerId) => sanitize(await organizerEmailConfigsRepository.findByOwner(ownerId));

/**
 * Creates or replaces the owner's custom-SMTP email config after proving it
 * works: the credentials are verified with a live connection
 * (`transporter.verify`) before anything is stored, so a saved config is
 * always a deliverable one. Gmail no longer goes through here — organizers
 * connect it via OAuth ({@link connectGoogle}).
 * @param {string} ownerId
 * @param {object} input - see schemas/email-config-schemas.js `saveEmailConfigSchema`
 */
export const save = async (ownerId, input) => {
  const smtp = { host: input.host, port: input.port, secure: input.secure ?? true };

  const candidate = {
    smtp_host: smtp.host,
    smtp_port: smtp.port,
    smtp_secure: smtp.secure,
    from_email: input.email,
  };

  try {
    await createOrganizerTransport(candidate, input.password).verify();
  } catch (error) {
    throw badRequest(
      "EMAIL_CONFIG_VERIFICATION_FAILED",
      `Could not sign in to ${smtp.host}:${smtp.port} as ${input.email} — check the SMTP credentials. (${error.message})`,
    );
  }

  const saved = await organizerEmailConfigsRepository.upsert(ownerId, {
    provider: "custom",
    smtpHost: smtp.host,
    smtpPort: smtp.port,
    smtpSecure: smtp.secure,
    fromEmail: input.email,
    fromName: input.fromName,
    smtpPasswordEncrypted: seal(input.password),
    verifiedAt: new Date(),
  });

  return sanitize(saved);
};

/**
 * "Connect Gmail": exchanges the OAuth authorization code for a refresh
 * token and saves it (encrypted) as the owner's email config. The connected
 * account's own address becomes the sender — nothing else to configure. Any
 * existing sender name is kept; Gmail otherwise shows the account's profile
 * name automatically.
 * @param {string} ownerId
 * @param {{ code: string, redirectUri: string }} input
 */
export const connectGoogle = async (ownerId, input) => {
  const { email, refreshToken } = await exchangeGmailAuthCode(input);

  const existing = await organizerEmailConfigsRepository.findByOwner(ownerId);
  const saved = await organizerEmailConfigsRepository.upsert(ownerId, {
    provider: "gmail",
    fromEmail: email,
    fromName: existing?.from_name ?? null,
    googleRefreshTokenEncrypted: seal(refreshToken),
    verifiedAt: new Date(),
  });

  return sanitize(saved);
};
