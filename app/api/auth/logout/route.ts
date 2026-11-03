import { NextRequest, NextResponse } from "next/server";
import { getSessionTokenFromRequest, revokeSession, clearSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const token = getSessionTokenFromRequest(req);
    if (token) {
      await revokeSession(token);
    }

    const res = NextResponse.json({
      success: true,
      message: "Signed out successfully",
    });

    clearSessionCookie(res);
    return res;
  } catch {
    const res = NextResponse.json(
      { success: false, error: "Failed to sign out cleanly" },
      { status: 500 }
    );
    clearSessionCookie(res);
    return res;
  }
}
