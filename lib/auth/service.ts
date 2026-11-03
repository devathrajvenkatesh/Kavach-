import crypto from "crypto";
import { getDb } from "@/lib/db";
import { DbUser } from "@/lib/db/schema";
import { KavachUser, KavachSession, SessionValidationResult } from "./types";

/**
 * Determines user role strictly server-side.
 * Matches verified email against KAVACH_ADMIN_EMAIL or ADMIN_EMAIL environment variable.
 * Default role is ALWAYS 'USER'. Client cannot modify this.
 */
export function determineRole(email: string): "USER" | "ADMIN" {
  const configuredAdmin = (process.env.KAVACH_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  if (!configuredAdmin) return "USER";
  return email.trim().toLowerCase() === configuredAdmin ? "ADMIN" : "USER";
}

/**
 * Provisions or updates an authenticated user with verified credentials.
 */
export async function provisionUser(params: {
  email: string;
  displayName: string;
  profileImage?: string | null;
}): Promise<KavachUser> {
  const db = getDb();
  const normalizedEmail = params.email.trim().toLowerCase();
  const role = determineRole(normalizedEmail);

  // Existing user check
  const existing = await db.getUserByEmail(normalizedEmail);
  if (existing) {
    const updated = await db.updateUser(existing.id, {
      displayName: params.displayName || existing.displayName,
      profileImage: params.profileImage !== undefined ? params.profileImage : existing.profileImage,
      role, // Enforce current ADMIN_EMAIL rule
      lastLoginAt: new Date().toISOString(),
    });
    return updated || existing;
  }

  // Create new user with deterministic ID from email hash
  const userId = `usr_${crypto.createHash("sha256").update(normalizedEmail).digest("hex").slice(0, 16)}`;
  const newUser: Omit<DbUser, "createdAt" | "lastLoginAt"> = {
    id: userId,
    email: normalizedEmail,
    displayName: params.displayName || normalizedEmail.split("@")[0],
    profileImage: params.profileImage || null,
    role,
    accountStatus: "ACTIVE",
  };

  return db.createUser(newUser);
}

/**
 * Creates a server-side session token stored in persistent database.
 */
export async function createSession(userId: string): Promise<KavachSession> {
  const db = getDb();
  return db.createSession(userId);
}

/**
 * Validates session token from HTTP-only cookie.
 */
export async function validateSession(token: string): Promise<SessionValidationResult> {
  if (!token || typeof token !== "string" || token.trim() === "") {
    return { authenticated: false, user: null, session: null };
  }

  const db = getDb();
  const session = await db.getSession(token.trim());
  if (!session) {
    return { authenticated: false, user: null, session: null };
  }

  const user = await db.getUserById(session.userId);
  if (!user || user.accountStatus !== "ACTIVE") {
    await db.deleteSession(token);
    return { authenticated: false, user: null, session: null };
  }

  // Authoritative role re-check against ADMIN_EMAIL
  const expectedRole = determineRole(user.email);
  if (user.role !== expectedRole) {
    await db.updateUser(user.id, { role: expectedRole });
    user.role = expectedRole;
  }

  return {
    authenticated: true,
    user,
    session,
  };
}

/**
 * Destroys a session.
 */
export async function revokeSession(token: string): Promise<void> {
  if (!token) return;
  const db = getDb();
  await db.deleteSession(token);
}
