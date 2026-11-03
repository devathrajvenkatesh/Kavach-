import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { defaultUnifiedMailAdapter } from "@/lib/mail/adapter";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const states = await defaultUnifiedMailAdapter.getConnectionStates(auth.user.id);
    return NextResponse.json({
      success: true,
      accounts: states,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve connected accounts status.",
        code: "ACCOUNTS_STATUS_ERROR",
      },
      { status: 500 }
    );
  }
}
