/**
 * Branded, email-client-safe HTML for every buyer- and organizer-facing
 * message SiTIKET sends. Everything is table-based with inline styles so it
 * renders consistently across Gmail, Apple Mail, and Outlook — no external
 * CSS, no web fonts, no remote images (all of which mail clients strip or
 * block). The look mirrors the app: ink black, off-white paper, neon lime, and
 * squared, uppercase editorial type.
 *
 * Callers compose the card body with the small helpers below (`paragraph`,
 * `infoPanel`, `ticketPanel`, `codeBlock`, `button`) and wrap it in
 * `renderBrandedEmail`.
 */

const INK = "#0a0a0a";
const PAPER = "#f1f1ee";
const LIME = "#b6ff00";
const WHITE = "#ffffff";
const MUTED = "#6b6b66";
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Escape user-supplied text before interpolating it into email HTML. */
export const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * A body paragraph. Pass already-safe HTML (use `escapeHtml` on any dynamic
 * text, and `<strong>` for emphasis).
 */
export const paragraph = (html) =>
  `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.6;color:${INK};">${html}</p>`;

/**
 * Bordered key/value box — e.g. event name, date, venue.
 * @param {{ heading?: string, rows: Array<{ label: string, value: string }> }} options
 */
export const infoPanel = ({ heading, rows }) => {
  const headingHtml = heading
    ? `<tr><td style="padding:0 0 12px;font-family:${FONT};font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:${MUTED};">${escapeHtml(heading)}</td></tr>`
    : "";
  const rowsHtml = rows
    .map(
      (row) => `
        <tr>
          <td style="padding:6px 0;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${MUTED};width:40%;vertical-align:top;">${escapeHtml(row.label)}</td>
          <td style="padding:6px 0;font-family:${FONT};font-size:15px;font-weight:700;color:${INK};text-align:right;vertical-align:top;">${escapeHtml(row.value)}</td>
        </tr>`,
    )
    .join("");
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid ${INK};background:${WHITE};margin:0 0 20px;">
      <tr><td style="padding:18px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${headingHtml}${rowsHtml}</table>
      </td></tr>
    </table>`;
};

/**
 * The list of issued tickets, each shown as a numbered row with its scannable
 * ticket code (the "ticket number") — never the order UUID.
 * @param {{ eventName: string, tickets: Array<{ ticket_type_name: string, ticket_code: string }> }} options
 */
export const ticketPanel = ({ eventName, tickets }) => {
  const rows = tickets
    .map(
      (ticket, index) => `
        <tr>
          <td style="padding:14px 16px;border-top:1px solid #e5e5e0;font-family:${FONT};vertical-align:middle;">
            <div style="font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:${MUTED};">Ticket ${index + 1} · ${escapeHtml(ticket.ticket_type_name)}</div>
            <div style="margin-top:4px;font-size:20px;font-weight:800;letter-spacing:2px;color:${INK};">${escapeHtml(ticket.ticket_code)}</div>
          </td>
        </tr>`,
    )
    .join("");
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid ${INK};background:${WHITE};margin:0 0 20px;">
      <tr><td style="background:${INK};padding:14px 16px;font-family:${FONT};font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:${WHITE};">
        ${escapeHtml(eventName)}
      </td></tr>
      ${rows}
    </table>`;
};

/** A large, letter-spaced code display (verification / OTP codes). */
export const codeBlock = (code) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
    <tr><td align="center" style="border:2px solid ${INK};background:${PAPER};padding:22px 16px;font-family:${FONT};font-size:38px;font-weight:800;letter-spacing:12px;color:${INK};">
      ${escapeHtml(code)}
    </td></tr>
  </table>`;

/**
 * A squared call-to-action button.
 * @param {{ href: string, label: string, variant?: "lime" | "dark" }} options
 */
export const button = ({ href, label, variant = "dark" }) => {
  const background = variant === "lime" ? LIME : INK;
  const color = variant === "lime" ? INK : WHITE;
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 8px;">
      <tr><td style="background:${background};">
        <a href="${href}" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:13px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:${color};text-decoration:none;">${escapeHtml(label)}</a>
      </td></tr>
    </table>`;
};

/**
 * Wraps composed body HTML in the full branded document.
 * @param {{ preheader?: string, tag: string, heading: string, bodyHtml: string, footnote?: string }} options
 */
export const renderBrandedEmail = ({ preheader = "", tag, heading, bodyHtml, footnote }) => {
  const footnoteHtml = footnote
    ? `<p style="margin:20px 0 0;font-family:${FONT};font-size:13px;line-height:1.6;color:${MUTED};">${footnote}</p>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light only" />
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:${PAPER};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};">
    <tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
        <tr><td style="background:${INK};padding:20px 28px;">
          <span style="font-family:${FONT};font-size:22px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:${WHITE};">SiTIKET</span><span style="font-family:${FONT};font-size:22px;font-weight:800;color:${LIME};">.</span>
        </td></tr>
        <tr><td style="background:${WHITE};border:2px solid ${INK};border-top:none;padding:32px 28px;">
          <span style="display:inline-block;background:${LIME};color:${INK};font-family:${FONT};font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:6px 10px;">${escapeHtml(tag)}</span>
          <h1 style="margin:16px 0 20px;font-family:${FONT};font-size:26px;line-height:1.15;font-weight:800;letter-spacing:-0.5px;text-transform:uppercase;color:${INK};">${escapeHtml(heading)}</h1>
          ${bodyHtml}
          ${footnoteHtml}
        </td></tr>
        <tr><td style="padding:20px 28px 8px;font-family:${FONT};font-size:12px;line-height:1.6;color:${MUTED};">
          Sent by <strong style="color:${INK};">SiTIKET</strong> — event discovery &amp; ticketing. This is an automated message; you can reply if you need a hand.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
};
