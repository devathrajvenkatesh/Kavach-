import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { defaultUnifiedMailAdapter } from "@/lib/mail/adapter";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await defaultUnifiedMailAdapter.disconnect(auth.user.id, "MICROSOFT");
    return NextResponse.json({
      success: true,
      connected: false,
      message: "Microsoft 365 disconnected and stored credentials purged.",
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to disconnect Microsoft 365 account.",
        code: "MICROSOFT_DISCONNECT_ERROR",
      },
      { status: 500 }
    );
  }
}
