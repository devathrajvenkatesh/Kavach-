import { NextRequest, NextResponse } from "next/server";
import { provisionUser, createSession, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Valid email is required." },
        { status: 400 }
      );
    }

    // Role is strictly calculated server-side.
    // Client-provided 'role' or 'isAdmin' fields are ignored completely.
    const user = await provisionUser({
      email,
      displayName: displayName || email.split("@")[0],
    });

    const session = await createSession(user.id);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        accountStatus: user.accountStatus,
        createdAt: user.createdAt,
      },
    });

    setSessionCookie(response, session.id);
    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to authenticate test user." },
      { status: 500 }
    );
  }
}
