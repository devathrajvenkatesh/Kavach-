import { NextRequest, NextResponse } from "next/server";
import { getSessionTokenFromRequest, getSessionTokenFromCookies } from "./cookies";
import { validateSession } from "./service";
import { KavachUser, KavachSession } from "./types";

export interface AuthenticatedContext {
  user: KavachUser;
  session: KavachSession;
}

export async function getServerSession(
  req?: NextRequest | Request
): Promise<{ user: KavachUser | null; session: KavachSession | null }> {
  let token: string | null = null;
  if (req) {
    token = getSessionTokenFromRequest(req);
  }
  if (!token) {
    token = await getSessionTokenFromCookies();
  }

  if (!token) {
    return { user: null, session: null };
  }

  const { authenticated, user, session } = await validateSession(token);
  if (!authenticated || !user || !session) {
    return { user: null, session: null };
  }

  return { user, session };
}

/**
 * Enforces authenticated session for protected API routes.
 * Returns AuthenticatedContext if valid, or a 401 NextResponse if unauthorized.
 */
export async function requireAuth(
  req: NextRequest
): Promise<AuthenticatedContext | NextResponse> {
  const { user, session } = await getServerSession(req);

  if (!user || !session) {
    return NextResponse.json(
      {
        success: false,
        error: "Authentication required. Please sign in.",
        code: "AUTHENTICATION_ERROR",
      },
      { status: 401 }
    );
  }

  return { user, session };
}

/**
 * Enforces strict administrator role verification server-side.
 * Returns AuthenticatedContext if user is ADMIN, or 401/403 NextResponse.
 */
export async function requireAdmin(
  req: NextRequest
): Promise<AuthenticatedContext | NextResponse> {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) {
    return auth; // Returns 401
  }

  if (auth.user.role !== "ADMIN") {
    return NextResponse.json(
      {
        success: false,
        error: "Forbidden. Administrator privileges required.",
        code: "ADMIN_ACCESS_DENIED",
      },
      { status: 403 }
    );
  }

  return auth;
}
