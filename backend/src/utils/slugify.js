/**
 * Converts a name into a URL-safe kebab-case slug.
 * Example: `slugify("Jakarta Noise Fest!")` -> `"jakarta-noise-fest"`
 * @param {string} value
 */
export const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
