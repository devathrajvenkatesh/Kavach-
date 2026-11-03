import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { defaultGmailAdapter } from "@/lib/gmail";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await defaultGmailAdapter.disconnect(auth.user.id);
    return NextResponse.json({
      success: true,
      connected: false,
      message: "Gmail disconnected and stored credentials purged.",
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to disconnect Gmail account.",
        code: "GMAIL_DISCONNECT_ERROR",
      },
      { status: 500 }
    );
  }
}
