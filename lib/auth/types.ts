import { UserRole, AccountStatus } from "@/lib/db/schema";

export interface KavachUser {
  id: string;
  email: string;
  displayName: string;
  profileImage?: string | null;
  role: UserRole;
  accountStatus: AccountStatus;
  createdAt: string;
  lastLoginAt: string;
}

export interface KavachSession {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface SessionValidationResult {
  authenticated: boolean;
  user: KavachUser | null;
  session: KavachSession | null;
}
