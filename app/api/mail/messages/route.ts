import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { defaultUnifiedMailAdapter } from "@/lib/mail/adapter";
import { MailProviderType } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const url = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "10", 10), 1), 50);
    const providerParam = url.searchParams.get("provider")?.toUpperCase() as MailProviderType | undefined;

    const provider: MailProviderType | undefined =
      providerParam === "GMAIL" || providerParam === "MICROSOFT" ? providerParam : undefined;

    const messages = await defaultUnifiedMailAdapter.fetchAndProcessEmails(
      auth.user.id,
      auth.user.email,
      { provider, maxResults: limit }
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
        error: "Failed to retrieve and analyze mailbox messages.",
        code: "MAIL_FETCH_ERROR",
      },
      { status: 500 }
    );
  }
}
