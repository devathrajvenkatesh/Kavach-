import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { defaultGmailAdapter } from "@/lib/gmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const url = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "10", 10), 1), 50);

    const messages = await defaultGmailAdapter.fetchAndProcessEmails(
      auth.user.id,
      auth.user.email,
      limit
    );

    return NextResponse.json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve and analyze Gmail messages.",
        code: "GMAIL_FETCH_ERROR",
      },
      { status: 500 }
    );
  }
}
