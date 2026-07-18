import { randomBytes, randomUUID } from "node:crypto";

/** Generates a v4 UUID for any table's primary key. Example: `"a1b2c3d4-..."` */
export const newId = () => randomUUID();

/**
 * Generates an unguessable, URL-safe ticket identifier — compact enough to
 * keep the QR code dense/scannable. Example: `"O5vZ3q8pXW2yj1Ht"`
 */
export const newTicketCode = () => randomBytes(12).toString("base64url");
