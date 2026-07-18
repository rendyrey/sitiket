import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

/** Clears the session cookie. The backend JWT itself is stateless and expires on its own; this just drops the client's copy. */
export async function POST() {
  (await cookies()).delete(SESSION_COOKIE_NAME);
  return NextResponse.json({ data: { ok: true } });
}
