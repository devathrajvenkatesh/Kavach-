import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "kavach_session";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export async function getSessionTokenFromCookies(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME);
    return cookie ? cookie.value : null;
  } catch {
    return null;
  }
}

export function getSessionTokenFromRequest(req: NextRequest | Request): string | null {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;

  const cookiesArray = cookieHeader.split(";");
  for (const part of cookiesArray) {
    const [name, value] = part.trim().split("=");
    if (name === SESSION_COOKIE_NAME && value) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

export function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
