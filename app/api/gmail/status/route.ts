import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { defaultGmailAdapter } from "@/lib/gmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const connectionState = await defaultGmailAdapter.getConnectionState(auth.user.id);
    return NextResponse.json({
      success: true,
      ...connectionState,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to determine Gmail connection status.",
        code: "GMAIL_STATUS_ERROR",
      },
      { status: 500 }
    );
  }
}
