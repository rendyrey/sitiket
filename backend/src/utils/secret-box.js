import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "../config/env.js";

// AES-256-GCM at-rest encryption for organizer SMTP passwords. The key is
// derived (not stored) — set EMAIL_CONFIG_SECRET to rotate it independently
// of sessions; without it the key derives from JWT_SECRET so nothing breaks,
// but rotating JWT_SECRET then also invalidates stored SMTP passwords.
const KEY = createHash("sha256")
  .update(env.EMAIL_CONFIG_SECRET ?? `${env.JWT_SECRET}:organizer-email-config`)
  .digest();

const VERSION = "v1";

/**
 * @param {string} plaintext
 * @returns {string} `v1:<iv>:<authTag>:<ciphertext>` (base64 fields)
 */
export const seal = (plaintext) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64"), cipher.getAuthTag().toString("base64"), ciphertext.toString("base64")].join(":");
};

/**
 * @param {string} sealed - a string produced by {@link seal}
 * @returns {string} the original plaintext
 */
export const open = (sealed) => {
  const [version, iv, authTag, ciphertext] = sealed.split(":");
  if (version !== VERSION) throw new Error(`Unsupported secret-box version "${version}"`);
  const decipher = createDecipheriv("aes-256-gcm", KEY, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]).toString("utf8");
};
