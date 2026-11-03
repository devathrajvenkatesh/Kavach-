import fs from "fs";
import path from "path";
import crypto from "crypto";
import { DatabaseSync } from "node:sqlite";
import {
  DbUser,
  DbSession,
  DbConnectedAccount,
  DbGmailConnection,
  DbLiveEmail,
  DbAuditRecord,
  MailProviderType,
} from "./schema";

export interface KavachDatabase {
  // Users
  createUser(user: Omit<DbUser, "createdAt" | "lastLoginAt">): Promise<DbUser>;
  getUserById(id: string): Promise<DbUser | null>;
  getUserByEmail(email: string): Promise<DbUser | null>;
  updateUser(id: string, updates: Partial<DbUser>): Promise<DbUser | null>;
  getAllUsers(): Promise<DbUser[]>;
  getUserCount(): Promise<number>;

  // Sessions
  createSession(userId: string, ttlMs?: number): Promise<DbSession>;
  getSession(token: string): Promise<DbSession | null>;
  deleteSession(token: string): Promise<void>;
  deleteSessionsByUserId(userId: string): Promise<void>;

  // Connected Accounts (Universal: Gmail & Microsoft)
  saveConnectedAccount(
    conn: Omit<DbConnectedAccount, "id" | "connectedAt">
  ): Promise<DbConnectedAccount>;
  getConnectedAccount(userId: string, provider: MailProviderType): Promise<DbConnectedAccount | null>;
  getConnectedAccountsByUserId(userId: string): Promise<DbConnectedAccount[]>;
  deleteConnectedAccount(userId: string, provider: MailProviderType): Promise<void>;

  // Gmail Connections (Backwards compatibility)
  saveGmailConnection(
    conn: Omit<DbGmailConnection, "id" | "connectedAt">
  ): Promise<DbGmailConnection>;
  getGmailConnectionByUserId(userId: string): Promise<DbGmailConnection | null>;
  deleteGmailConnection(userId: string): Promise<void>;
  getConnectedAccountsCount(): Promise<number>;

  // Live Emails Cache
  saveLiveEmails(
    userId: string,
    emails: Omit<DbLiveEmail, "id" | "userId">[]
  ): Promise<DbLiveEmail[]>;
  getLiveEmailsByUserId(userId: string): Promise<DbLiveEmail[]>;
  clearLiveEmailsByUserId(userId: string): Promise<void>;

  // Audit Records
  saveAuditRecord(
    record: Omit<DbAuditRecord, "id" | "createdAt">
  ): Promise<DbAuditRecord>;
  getAuditRecords(filter?: {
    userId?: string;
    mode?: "LIVE" | "DEMO";
    limit?: number;
  }): Promise<DbAuditRecord[]>;
  getAuditRecordStats(userId?: string): Promise<{
    total: number;
    blocked: number;
    threats: number;
  }>;
}

export function isProductionEnvironment(): boolean {
  if (process.env.KAVACH_FORCE_DB_TYPE === "sqlite") return false;
  if (process.env.KAVACH_FORCE_DB_TYPE === "postgres") return true;

  if (process.env.NODE_ENV === "test" || process.env.npm_lifecycle_event === "test") {
    return false;
  }

  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
}

export class SQLiteKavachDatabase implements KavachDatabase {
  private db: DatabaseSync;

  constructor(filePath?: string) {
    if (isProductionEnvironment()) {
      throw new Error(
        "[Kavach Security Gateway] SQLite persistence is strictly prohibited in production environments. Production deployment on Vercel requires PostgreSQL (DATABASE_URL or POSTGRES_URL)."
      );
    }

    let resolvedPath = filePath;

    if (!resolvedPath) {
      if ((process.env.NODE_ENV === "test" || process.env.npm_lifecycle_event === "test") && !process.env.PERSIST_TEST_DB) {
        resolvedPath = ":memory:";
      } else {
        const defaultDir = path.join(process.cwd(), ".kavach-data");
        if (!fs.existsSync(defaultDir)) {
          fs.mkdirSync(defaultDir, { recursive: true });
        }
        resolvedPath = path.join(defaultDir, "kavach.sqlite");
      }
    }

    this.db = new DatabaseSync(resolvedPath);
    try {
      this.db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
    } catch {
      // Memory DB or unsupported pragma
    }
    this.initSchema();
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        profile_image TEXT,
        role TEXT NOT NULL DEFAULT 'USER',
        account_status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at TEXT NOT NULL,
        last_login_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

      CREATE TABLE IF NOT EXISTS gmail_connections (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        gmail_address TEXT NOT NULL,
        encrypted_refresh_token TEXT NOT NULL,
        encrypted_access_token TEXT,
        token_expires_at INTEGER,
        scope TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'CONNECTED',
        connected_at TEXT NOT NULL,
        last_synchronized_at TEXT,
        error TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS connected_accounts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        email_address TEXT NOT NULL,
        encrypted_refresh_token TEXT NOT NULL,
        encrypted_access_token TEXT,
        token_expires_at INTEGER,
        scope TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'CONNECTED',
        connected_at TEXT NOT NULL,
        last_synchronized_at TEXT,
        error TEXT,
        UNIQUE(user_id, provider),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_connected_accounts_user ON connected_accounts(user_id);

      CREATE TABLE IF NOT EXISTS live_emails (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        provider TEXT NOT NULL DEFAULT 'GMAIL',
        message_id TEXT NOT NULL,
        thread_id TEXT,
        sender TEXT NOT NULL,
        subject TEXT NOT NULL,
        snippet TEXT,
        body_text TEXT NOT NULL,
        date TEXT NOT NULL,
        security_status TEXT NOT NULL,
        urgency_level TEXT NOT NULL,
        is_quarantined INTEGER NOT NULL DEFAULT 0,
        quarantine_reason TEXT,
        analyzed_at TEXT NOT NULL,
        raw_metadata TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_live_emails_user_id ON live_emails(user_id);

      CREATE TABLE IF NOT EXISTS audit_records (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        user_email TEXT,
        mode TEXT NOT NULL DEFAULT 'DEMO',
        correlation_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        source TEXT NOT NULL,
        threat_category TEXT,
        severity TEXT,
        policy_decision TEXT,
        final_outcome TEXT,
        data_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_audit_records_user_id ON audit_records(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_records_mode ON audit_records(mode);
    `);

    try {
      this.db.exec("ALTER TABLE live_emails ADD COLUMN provider TEXT NOT NULL DEFAULT 'GMAIL'");
    } catch {
      // Column already exists or fresh schema
    }
  }

  // --- Users ---
  async createUser(user: Omit<DbUser, "createdAt" | "lastLoginAt">): Promise<DbUser> {
    const now = new Date().toISOString();
    const newUser: DbUser = {
      ...user,
      createdAt: now,
      lastLoginAt: now,
    };

    const stmt = this.db.prepare(`
      INSERT INTO users (id, email, display_name, profile_image, role, account_status, created_at, last_login_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        display_name = excluded.display_name,
        profile_image = excluded.profile_image,
        last_login_at = excluded.last_login_at
    `);

    stmt.run(
      newUser.id,
      newUser.email.toLowerCase(),
      newUser.displayName,
      newUser.profileImage || null,
      newUser.role,
      newUser.accountStatus,
      newUser.createdAt,
      newUser.lastLoginAt
    );

    const fetched = await this.getUserByEmail(newUser.email);
    return fetched || newUser;
  }

  async getUserById(id: string): Promise<DbUser | null> {
    const stmt = this.db.prepare("SELECT * FROM users WHERE id = ?");
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    if (!row) return null;

    return {
      id: String(row.id),
      email: String(row.email),
      displayName: String(row.display_name),
      profileImage: row.profile_image ? String(row.profile_image) : null,
      role: (row.role as DbUser["role"]) || "USER",
      accountStatus: (row.account_status as DbUser["accountStatus"]) || "ACTIVE",
      createdAt: String(row.created_at),
      lastLoginAt: String(row.last_login_at),
    };
  }

  async getUserByEmail(email: string): Promise<DbUser | null> {
    const stmt = this.db.prepare("SELECT * FROM users WHERE email = ?");
    const row = stmt.get(email.toLowerCase()) as Record<string, unknown> | undefined;
    if (!row) return null;

    return {
      id: String(row.id),
      email: String(row.email),
      displayName: String(row.display_name),
      profileImage: row.profile_image ? String(row.profile_image) : null,
      role: (row.role as DbUser["role"]) || "USER",
      accountStatus: (row.account_status as DbUser["accountStatus"]) || "ACTIVE",
      createdAt: String(row.created_at),
      lastLoginAt: String(row.last_login_at),
    };
  }

  async updateUser(id: string, updates: Partial<DbUser>): Promise<DbUser | null> {
    const existing = await this.getUserById(id);
    if (!existing) return null;

    const updated: DbUser = { ...existing, ...updates };

    const stmt = this.db.prepare(`
      UPDATE users SET
        display_name = ?,
        profile_image = ?,
        role = ?,
        account_status = ?,
        last_login_at = ?
      WHERE id = ?
    `);

    stmt.run(
      updated.displayName,
      updated.profileImage || null,
      updated.role,
      updated.accountStatus,
      updated.lastLoginAt,
      id
    );

    return updated;
  }

  async getAllUsers(): Promise<DbUser[]> {
    const stmt = this.db.prepare("SELECT * FROM users ORDER BY created_at DESC");
    const rows = stmt.all() as Record<string, unknown>[];

    return rows.map((row) => ({
      id: String(row.id),
      email: String(row.email),
      displayName: String(row.display_name),
      profileImage: row.profile_image ? String(row.profile_image) : null,
      role: (row.role as DbUser["role"]) || "USER",
      accountStatus: (row.account_status as DbUser["accountStatus"]) || "ACTIVE",
      createdAt: String(row.created_at),
      lastLoginAt: String(row.last_login_at),
    }));
  }

  async getUserCount(): Promise<number> {
    const stmt = this.db.prepare("SELECT COUNT(*) as count FROM users");
    const row = stmt.get() as { count: number } | undefined;
    return row ? Number(row.count) : 0;
  }

  // --- Sessions ---
  async createSession(userId: string, ttlMs: number = 7 * 24 * 60 * 60 * 1000): Promise<DbSession> {
    const token = crypto.randomBytes(32).toString("hex");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs).toISOString();

    const session: DbSession = {
      id: token,
      userId,
      createdAt: now.toISOString(),
      expiresAt,
    };

    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, user_id, created_at, expires_at)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(session.id, session.userId, session.createdAt, session.expiresAt);
    return session;
  }

  async getSession(token: string): Promise<DbSession | null> {
    if (!token) return null;
    const stmt = this.db.prepare("SELECT * FROM sessions WHERE id = ?");
    const row = stmt.get(token) as Record<string, unknown> | undefined;
    if (!row) return null;

    const expiresAt = String(row.expires_at);
    if (new Date(expiresAt).getTime() < Date.now()) {
      await this.deleteSession(token);
      return null;
    }

    return {
      id: String(row.id),
      userId: String(row.user_id),
      createdAt: String(row.created_at),
      expiresAt,
    };
  }

  async deleteSession(token: string): Promise<void> {
    const stmt = this.db.prepare("DELETE FROM sessions WHERE id = ?");
    stmt.run(token);
  }

  async deleteSessionsByUserId(userId: string): Promise<void> {
    const stmt = this.db.prepare("DELETE FROM sessions WHERE user_id = ?");
    stmt.run(userId);
  }

  // --- Connected Accounts (Universal: Gmail & Microsoft) ---
  async saveConnectedAccount(
    conn: Omit<DbConnectedAccount, "id" | "connectedAt">
  ): Promise<DbConnectedAccount> {
    const existing = await this.getConnectedAccount(conn.userId, conn.provider);
    const id = existing ? existing.id : `${conn.provider.toLowerCase()}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const connectedAt = existing ? existing.connectedAt : new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO connected_accounts (
        id, user_id, provider, email_address, encrypted_refresh_token, encrypted_access_token,
        token_expires_at, scope, status, connected_at, last_synchronized_at, error
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, provider) DO UPDATE SET
        email_address = excluded.email_address,
        encrypted_refresh_token = excluded.encrypted_refresh_token,
        encrypted_access_token = excluded.encrypted_access_token,
        token_expires_at = excluded.token_expires_at,
        scope = excluded.scope,
        status = excluded.status,
        last_synchronized_at = excluded.last_synchronized_at,
        error = excluded.error
    `);

    stmt.run(
      id,
      conn.userId,
      conn.provider,
      conn.emailAddress,
      conn.encryptedRefreshToken,
      conn.encryptedAccessToken || null,
      conn.tokenExpiresAt || null,
      conn.scope,
      conn.status,
      connectedAt,
      conn.lastSynchronizedAt || null,
      conn.error || null
    );

    // Keep gmail_connections in sync for backwards compatibility
    if (conn.provider === "GMAIL") {
      const gStmt = this.db.prepare(`
        INSERT INTO gmail_connections (
          id, user_id, gmail_address, encrypted_refresh_token, encrypted_access_token,
          token_expires_at, scope, status, connected_at, last_synchronized_at, error
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          gmail_address = excluded.gmail_address,
          encrypted_refresh_token = excluded.encrypted_refresh_token,
          encrypted_access_token = excluded.encrypted_access_token,
          token_expires_at = excluded.token_expires_at,
          scope = excluded.scope,
          status = excluded.status,
          last_synchronized_at = excluded.last_synchronized_at,
          error = excluded.error
      `);
      gStmt.run(
        id,
        conn.userId,
        conn.emailAddress,
        conn.encryptedRefreshToken,
        conn.encryptedAccessToken || null,
        conn.tokenExpiresAt || null,
        conn.scope,
        conn.status,
        connectedAt,
        conn.lastSynchronizedAt || null,
        conn.error || null
      );
    }

    return {
      ...conn,
      id,
      connectedAt,
    };
  }

  async getConnectedAccount(userId: string, provider: MailProviderType): Promise<DbConnectedAccount | null> {
    const stmt = this.db.prepare(
      "SELECT * FROM connected_accounts WHERE user_id = ? AND provider = ?"
    );
    const row = stmt.get(userId, provider) as Record<string, unknown> | undefined;
    if (row) {
      return {
        id: String(row.id),
        userId: String(row.user_id),
        provider: row.provider as MailProviderType,
        emailAddress: String(row.email_address),
        encryptedRefreshToken: String(row.encrypted_refresh_token),
        encryptedAccessToken: row.encrypted_access_token ? String(row.encrypted_access_token) : null,
        tokenExpiresAt: row.token_expires_at ? Number(row.token_expires_at) : null,
        scope: String(row.scope),
        status: (row.status as DbConnectedAccount["status"]) || "CONNECTED",
        connectedAt: String(row.connected_at),
        lastSynchronizedAt: row.last_synchronized_at ? String(row.last_synchronized_at) : null,
        error: row.error ? String(row.error) : null,
      };
    }

    // Fallback for GMAIL
    if (provider === "GMAIL") {
      const gConn = await this.getGmailConnectionByUserId(userId);
      if (gConn) {
        return {
          id: gConn.id,
          userId: gConn.userId,
          provider: "GMAIL",
          emailAddress: gConn.gmailAddress,
          encryptedRefreshToken: gConn.encryptedRefreshToken,
          encryptedAccessToken: gConn.encryptedAccessToken,
          tokenExpiresAt: gConn.tokenExpiresAt,
          scope: gConn.scope,
          status: gConn.status,
          connectedAt: gConn.connectedAt,
          lastSynchronizedAt: gConn.lastSynchronizedAt,
          error: gConn.error,
        };
      }
    }

    return null;
  }

  async getConnectedAccountsByUserId(userId: string): Promise<DbConnectedAccount[]> {
    const stmt = this.db.prepare(
      "SELECT * FROM connected_accounts WHERE user_id = ?"
    );
    const rows = stmt.all(userId) as Record<string, unknown>[];
    const accounts: DbConnectedAccount[] = rows.map((row) => ({
      id: String(row.id),
      userId: String(row.user_id),
      provider: row.provider as MailProviderType,
      emailAddress: String(row.email_address),
      encryptedRefreshToken: String(row.encrypted_refresh_token),
      encryptedAccessToken: row.encrypted_access_token ? String(row.encrypted_access_token) : null,
      tokenExpiresAt: row.token_expires_at ? Number(row.token_expires_at) : null,
      scope: String(row.scope),
      status: (row.status as DbConnectedAccount["status"]) || "CONNECTED",
      connectedAt: String(row.connected_at),
      lastSynchronizedAt: row.last_synchronized_at ? String(row.last_synchronized_at) : null,
      error: row.error ? String(row.error) : null,
    }));

    if (!accounts.some((a) => a.provider === "GMAIL")) {
      const gConn = await this.getGmailConnectionByUserId(userId);
      if (gConn) {
        accounts.push({
          id: gConn.id,
          userId: gConn.userId,
          provider: "GMAIL",
          emailAddress: gConn.gmailAddress,
          encryptedRefreshToken: gConn.encryptedRefreshToken,
          encryptedAccessToken: gConn.encryptedAccessToken,
          tokenExpiresAt: gConn.tokenExpiresAt,
          scope: gConn.scope,
          status: gConn.status,
          connectedAt: gConn.connectedAt,
          lastSynchronizedAt: gConn.lastSynchronizedAt,
          error: gConn.error,
        });
      }
    }

    return accounts;
  }

  async deleteConnectedAccount(userId: string, provider: MailProviderType): Promise<void> {
    const stmt = this.db.prepare(
      "DELETE FROM connected_accounts WHERE user_id = ? AND provider = ?"
    );
    stmt.run(userId, provider);

    if (provider === "GMAIL") {
      const gStmt = this.db.prepare("DELETE FROM gmail_connections WHERE user_id = ?");
      gStmt.run(userId);
    }
  }

  // --- Gmail Connections (Backwards compatibility) ---
  async saveGmailConnection(
    conn: Omit<DbGmailConnection, "id" | "connectedAt">
  ): Promise<DbGmailConnection> {
    const email = conn.emailAddress || conn.gmailAddress || "";
    return this.saveConnectedAccount({
      ...conn,
      provider: "GMAIL",
      emailAddress: email,
      gmailAddress: email,
    }) as unknown as DbGmailConnection;
  }

  async getGmailConnectionByUserId(userId: string): Promise<DbGmailConnection | null> {
    const stmt = this.db.prepare("SELECT * FROM gmail_connections WHERE user_id = ?");
    const row = stmt.get(userId) as Record<string, unknown> | undefined;
    if (row) {
      const email = String(row.gmail_address);
      return {
        id: String(row.id),
        userId: String(row.user_id),
        gmailAddress: email,
        provider: "GMAIL",
        emailAddress: email,
        encryptedRefreshToken: String(row.encrypted_refresh_token),
        encryptedAccessToken: row.encrypted_access_token ? String(row.encrypted_access_token) : null,
        tokenExpiresAt: row.token_expires_at ? Number(row.token_expires_at) : null,
        scope: String(row.scope),
        status: (row.status as DbGmailConnection["status"]) || "CONNECTED",
        connectedAt: String(row.connected_at),
        lastSynchronizedAt: row.last_synchronized_at ? String(row.last_synchronized_at) : null,
        error: row.error ? String(row.error) : null,
      };
    }

    const cStmt = this.db.prepare("SELECT * FROM connected_accounts WHERE user_id = ? AND provider = 'GMAIL'");
    const cRow = cStmt.get(userId) as Record<string, unknown> | undefined;
    if (cRow) {
      const email = String(cRow.email_address);
      return {
        id: String(cRow.id),
        userId: String(cRow.user_id),
        gmailAddress: email,
        provider: "GMAIL",
        emailAddress: email,
        encryptedRefreshToken: String(cRow.encrypted_refresh_token),
        encryptedAccessToken: cRow.encrypted_access_token ? String(cRow.encrypted_access_token) : null,
        tokenExpiresAt: cRow.token_expires_at ? Number(cRow.token_expires_at) : null,
        scope: String(cRow.scope),
        status: (cRow.status as DbGmailConnection["status"]) || "CONNECTED",
        connectedAt: String(cRow.connected_at),
        lastSynchronizedAt: cRow.last_synchronized_at ? String(cRow.last_synchronized_at) : null,
        error: cRow.error ? String(cRow.error) : null,
      };
    }

    return null;
  }

  async deleteGmailConnection(userId: string): Promise<void> {
    await this.deleteConnectedAccount(userId, "GMAIL");
  }

  async getConnectedAccountsCount(): Promise<number> {
    let count = 0;
    try {
      const stmt = this.db.prepare(
        "SELECT COUNT(*) as count FROM connected_accounts WHERE status = 'CONNECTED'"
      );
      const row = stmt.get() as { count: number } | undefined;
      count += Number(row?.count || 0);
    } catch {}

    try {
      const stmt = this.db.prepare(
        "SELECT COUNT(*) as count FROM gmail_connections WHERE status = 'CONNECTED' AND user_id NOT IN (SELECT user_id FROM connected_accounts WHERE provider = 'GMAIL')"
      );
      const row = stmt.get() as { count: number } | undefined;
      count += Number(row?.count || 0);
    } catch {}

    return count;
  }

  // --- Live Emails Cache ---
  async saveLiveEmails(
    userId: string,
    emails: Omit<DbLiveEmail, "id" | "userId">[]
  ): Promise<DbLiveEmail[]> {
    await this.clearLiveEmailsByUserId(userId);

    const stmt = this.db.prepare(`
      INSERT INTO live_emails (
        id, user_id, provider, message_id, thread_id, sender, subject, snippet, body_text,
        date, security_status, urgency_level, is_quarantined, quarantine_reason,
        analyzed_at, raw_metadata
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result: DbLiveEmail[] = [];

    for (const em of emails) {
      const id = `email_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
      stmt.run(
        id,
        userId,
        em.provider || "GMAIL",
        em.messageId,
        em.threadId || null,
        em.sender,
        em.subject,
        em.snippet || null,
        em.bodyText,
        em.date,
        em.securityStatus,
        em.urgencyLevel,
        em.isQuarantined ? 1 : 0,
        em.quarantineReason || null,
        em.analyzedAt,
        em.rawMetadata ? JSON.stringify(em.rawMetadata) : null
      );

      result.push({
        ...em,
        id,
        userId,
      });
    }

    return result;
  }

  async getLiveEmailsByUserId(userId: string): Promise<DbLiveEmail[]> {
    const stmt = this.db.prepare(
      "SELECT * FROM live_emails WHERE user_id = ? ORDER BY date DESC"
    );
    const rows = stmt.all(userId) as Record<string, unknown>[];

    return rows.map((r) => ({
      id: String(r.id),
      userId: String(r.user_id),
      provider: (r.provider as MailProviderType) || "GMAIL",
      messageId: String(r.message_id),
      threadId: r.thread_id ? String(r.thread_id) : null,
      sender: String(r.sender),
      subject: String(r.subject),
      snippet: r.snippet ? String(r.snippet) : null,
      bodyText: String(r.body_text),
      date: String(r.date),
      securityStatus: r.security_status as DbLiveEmail["securityStatus"],
      urgencyLevel: r.urgency_level as DbLiveEmail["urgencyLevel"],
      isQuarantined: Boolean(r.is_quarantined),
      quarantineReason: r.quarantine_reason ? String(r.quarantine_reason) : null,
      analyzedAt: String(r.analyzed_at),
      rawMetadata: r.raw_metadata ? JSON.parse(String(r.raw_metadata)) : null,
    }));
  }

  async clearLiveEmailsByUserId(userId: string): Promise<void> {
    const stmt = this.db.prepare("DELETE FROM live_emails WHERE user_id = ?");
    stmt.run(userId);
  }

  // --- Audit Records ---
  async saveAuditRecord(
    record: Omit<DbAuditRecord, "id" | "createdAt">
  ): Promise<DbAuditRecord> {
    const id = `rec_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const createdAt = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO audit_records (
        id, user_id, user_email, mode, correlation_id, event_type,
        source, threat_category, severity, policy_decision, final_outcome,
        data_json, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      record.userId || null,
      record.userEmail || null,
      record.mode,
      record.correlationId,
      record.eventType,
      record.source,
      record.threatCategory || null,
      record.severity || null,
      record.policyDecision || null,
      record.finalOutcome || null,
      record.dataJson,
      createdAt
    );

    return {
      ...record,
      id,
      createdAt,
    };
  }

  async getAuditRecords(filter?: {
    userId?: string;
    mode?: "LIVE" | "DEMO";
    limit?: number;
  }): Promise<DbAuditRecord[]> {
    let query = "SELECT * FROM audit_records WHERE 1=1";
    const params: (string | number | null)[] = [];

    if (filter?.userId) {
      query += " AND user_id = ?";
      params.push(filter.userId);
    }
    if (filter?.mode) {
      query += " AND mode = ?";
      params.push(filter.mode);
    }

    query += " ORDER BY created_at DESC LIMIT ?";
    params.push(filter?.limit || 100);

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as Record<string, unknown>[];

    return rows.map((r) => ({
      id: String(r.id),
      userId: r.user_id ? String(r.user_id) : null,
      userEmail: r.user_email ? String(r.user_email) : null,
      mode: (r.mode as "LIVE" | "DEMO") || "DEMO",
      correlationId: String(r.correlation_id),
      eventType: String(r.event_type),
      source: String(r.source),
      threatCategory: r.threat_category ? String(r.threat_category) : null,
      severity: r.severity ? String(r.severity) : null,
      policyDecision: r.policy_decision ? String(r.policy_decision) : null,
      finalOutcome: r.final_outcome ? String(r.final_outcome) : null,
      dataJson: String(r.data_json),
      createdAt: String(r.created_at),
    }));
  }

  async getAuditRecordStats(userId?: string): Promise<{
    total: number;
    blocked: number;
    threats: number;
  }> {
    let query = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN policy_decision = 'BLOCK' THEN 1 ELSE 0 END) as blocked,
        SUM(CASE WHEN threat_category IS NOT NULL AND threat_category != 'NONE' AND threat_category != 'BENIGN' THEN 1 ELSE 0 END) as threats
      FROM audit_records WHERE 1=1
    `;
    const params: (string | number | null)[] = [];
    if (userId) {
      query += " AND user_id = ?";
      params.push(userId);
    }

    const stmt = this.db.prepare(query);
    const row = stmt.get(...params) as { total: number; blocked: number; threats: number } | undefined;

    return {
      total: Number(row?.total || 0),
      blocked: Number(row?.blocked || 0),
      threats: Number(row?.threats || 0),
    };
  }
}
