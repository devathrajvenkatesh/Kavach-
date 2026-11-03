import { NextRequest, NextResponse } from "next/server";
import { provisionUser, createSession, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin;

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, origin));
  }

  const storedState = req.cookies.get("kavach_auth_state")?.value;
  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(new URL("/login?error=INVALID_OAUTH_STATE", origin));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=MISSING_AUTHORIZATION_CODE", origin));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${origin}/api/auth/callback/google`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/login?error=OAUTH_CREDENTIALS_MISSING", origin));
  }

  try {
    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(new URL("/login?error=TOKEN_EXCHANGE_FAILED", origin));
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch user profile from Google UserInfo endpoint
    const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userinfoRes.ok) {
      return NextResponse.redirect(new URL("/login?error=USERINFO_FETCH_FAILED", origin));
    }

    const profile = await userinfoRes.json();
    if (!profile.email) {
      return NextResponse.redirect(new URL("/login?error=NO_EMAIL_IN_PROFILE", origin));
    }

    // 3. Provision user server-side with strict role evaluation
    const user = await provisionUser({
      email: profile.email,
      displayName: profile.name || profile.email.split("@")[0],
      profileImage: profile.picture || null,
    });

    // 4. Create server-side session
    const session = await createSession(user.id);

    // 5. Set session cookie and redirect to application
    const response = NextResponse.redirect(new URL("/", origin));
    setSessionCookie(response, session.id);

    // Clear state cookie
    response.cookies.delete("kavach_auth_state");

    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?error=AUTHENTICATION_ERROR", origin));
  }
}
