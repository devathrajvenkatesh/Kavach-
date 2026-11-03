import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, session } = await getServerSession(req);

    if (!user || !session) {
      return NextResponse.json({
        authenticated: false,
        user: null,
      });
    }

    // Return safe user object (zero tokens or secrets)
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        profileImage: user.profileImage,
        role: user.role,
        accountStatus: user.accountStatus,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch {
    return NextResponse.json(
      {
        authenticated: false,
        user: null,
        error: "Session validation failed",
      },
      { status: 500 }
    );
  }
}
