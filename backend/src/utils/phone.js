/**
 * Converts a hand-typed phone number into the form WhatsApp reports as the
 * sender's `wa_id`: digits only, country code first, no "+" or leading 0.
 * Indonesian local numbers ("0812…") get the 62 country code.
 *
 * @param {string | null | undefined} phone - Example: `"0812-3456-7890"`, `"+62 812 3456 7890"`
 * @returns {string} Example: `"6281234567890"`; `""` for empty input
 */
export const toWhatsappId = (phone) => {
  const digits = String(phone ?? "").replace(/\D/g, "");
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
};
