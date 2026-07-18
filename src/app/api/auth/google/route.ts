import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { GoogleLoginRequest, User } from "@/lib/api/types";
import { SESSION_COOKIE_MAX_AGE_SECONDS, SESSION_COOKIE_NAME } from "@/lib/session-cookie";

/**
 * BFF login endpoint: receives a Google Identity Services ID token from the
 * client, verifies it against the backend, and sets the resulting session
 * JWT as an httpOnly cookie — the token itself never reaches client JS,
 * only the public user profile does.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as GoogleLoginRequest;

  try {
    const { data } = await apiRequest<{ data: { token: string; user: User } }>("/api/auth/google", {
      method: "POST",
      body,
      token: null,
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
    });

    return NextResponse.json({ data: { user: data.user } });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
    }
    throw error;
  }
}
