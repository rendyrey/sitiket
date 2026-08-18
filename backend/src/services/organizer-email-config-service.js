import { createOrganizerTransport } from "../config/mailer.js";
import * as organizerEmailConfigsRepository from "../repositories/organizer-email-configs-repository.js";
import { badRequest } from "../utils/http-error.js";
import { seal } from "../utils/secret-box.js";

// Organizers on Gmail only supply their address + a Google App Password —
// the SMTP endpoint is ours to predefine. Custom providers supply all of it.
const GMAIL_PRESET = { host: "smtp.gmail.com", port: 465, secure: true };

/** Strips the encrypted password before a config row leaves the API. */
const sanitize = (config) => {
  if (!config) return null;
  const { smtp_password_encrypted: _omitted, ...safe } = config;
  return safe;
};

/** @param {string} ownerId - always the calling admin's own id */
export const getMine = async (ownerId) => sanitize(await organizerEmailConfigsRepository.findByOwner(ownerId));

/**
 * Creates or replaces the owner's email config after proving it works: the
 * SMTP credentials are verified with a live connection (`transporter.verify`)
 * before anything is stored, so a saved config is always a deliverable one.
 * @param {string} ownerId
 * @param {object} input - see schemas/email-config-schemas.js `saveEmailConfigSchema`
 */
export const save = async (ownerId, input) => {
  const smtp =
    input.provider === "gmail"
      ? GMAIL_PRESET
      : { host: input.host, port: input.port, secure: input.secure ?? true };

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
      `Could not sign in to ${smtp.host}:${smtp.port} as ${input.email} — check the ${
        input.provider === "gmail" ? "Google App Password" : "SMTP credentials"
      }. (${error.message})`,
    );
  }

  const saved = await organizerEmailConfigsRepository.upsert(ownerId, {
    provider: input.provider,
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
