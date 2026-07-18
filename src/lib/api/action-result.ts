import { ApiError } from "./errors";

/**
 * Uniform Server Action return shape used across every feature's
 * `lib/actions.ts` — client components branch on `ok` instead of
 * try/catching a thrown error (Server Action error serialization is lossy).
 */
export type ActionResult<T> = { ok: true; data: T } | { ok: false; message: string };

/**
 * Runs a backend call and wraps it as an {@link ActionResult}, applying an
 * optional mapper (e.g. a `normalize.ts` function) to the raw response.
 * Any {@link ApiError} becomes `{ ok: false, message }`; anything else
 * (a genuine bug, not an expected API error) is rethrown.
 */
export const toActionResult = async <TRaw, T = TRaw>(run: () => Promise<TRaw>, map?: (raw: TRaw) => T): Promise<ActionResult<T>> => {
  try {
    const raw = await run();
    return { ok: true, data: (map ? map(raw) : raw) as T };
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, message: error.message };
    throw error;
  }
};
