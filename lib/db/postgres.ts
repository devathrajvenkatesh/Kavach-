import crypto from "crypto";
import { Pool, PoolConfig } from "pg";
import {
  DbUser,
  DbSession,
  DbConnectedAccount,
  DbGmailConnection,
  DbLiveEmail,
  DbAuditRecord,
  MailProviderType,
} from "./schema";
import { KavachDatabase } from "./adapter";

declare global {
  // eslint-disable-next-line no-var
  var __kavachPgPool: Pool | undefined;
}

function toIso(val: unknown): string {
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "string") return val;
  if (!val) return new Date().toISOString();
  return String(val);
}

export class PostgresKavachDatabase implements KavachDatabase {
  private pool: Pool;
  private schemaInitPromise: Promise<void> | null = null;

  constructor(connectionStringOrPool?: string | Pool) {
    if (typeof connectionStringOrPool === "object" && connectionStringOrPool !== null) {
      this.pool = connectionStringOrPool;
    } else {
      const connStr =
        connectionStringOrPool ||
        process.env.DATABASE_URL ||
        process.env.POSTGRES_URL;

      if (!connStr) {
        throw new Error(
          "[Kavach Security Gateway] PostgreSQL connection string is required. Please set DATABASE_URL or POSTGRES_URL."
        );
      }

      if (!globalThis.__kavachPgPool) {
        const isLocalhost =
          connStr.includes("localhost") || connStr.includes("127.0.0.1");

        const config: PoolConfig = {
          connectionString: connStr,
          max: parseInt(process.env.DATABASE_POOL_MAX || "10", 10),
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
          ssl: isLocalhost ? undefined : { rejectUnauthorized: false },
        };

        globalThis.__kavachPgPool = new Pool(config);
      }

      this.pool = globalThis.__kavachPgPool;
    }
  }

  /**
   * Ensures production tables and indexes exist on the PostgreSQL cluster.
   * Runs idempotently once per application runtime instance.
   */
  async ensureSchema(): Promise<void> {
    if (!this.schemaInitPromise) {
      this.schemaInitPromise = this.initSchema();
    }
    return this.schemaInitPromise;
  }

  private async initSchema(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN;");

      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(64) PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          display_name VARCHAR(255) NOT NULL,
          profile_image TEXT,
          role VARCHAR(32) NOT NULL DEFAULT 'USER',
          account_status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
          created_at TIMESTAMPTZ NOT NULL,
          last_login_at TIMESTAMPTZ NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

        CREATE TABLE IF NOT EXISTS sessions (
          id VARCHAR(128) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

        CREATE TABLE IF NOT EXISTS connected_accounts (
          id VARCHAR(128) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          provider VARCHAR(32) NOT NULL,
          email_address VARCHAR(255) NOT NULL,
          encrypted_refresh_token TEXT NOT NULL,
          encrypted_access_token TEXT,
          token_expires_at BIGINT,
          scope TEXT NOT NULL,
          status VARCHAR(32) NOT NULL DEFAULT 'CONNECTED',
          connected_at TIMESTAMPTZ NOT NULL,
          last_synchronized_at TIMESTAMPTZ,
          error TEXT,
          UNIQUE(user_id, provider)
        );
        CREATE INDEX IF NOT EXISTS idx_connected_accounts_user ON connected_accounts(user_id);

        CREATE TABLE IF NOT EXISTS gmail_connections (
          id VARCHAR(128) PRIMARY KEY,
          user_id VARCHAR(64) UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          gmail_address VARCHAR(255) NOT NULL,
          encrypted_refresh_token TEXT NOT NULL,
          encrypted_access_token TEXT,
          token_expires_at BIGINT,
          scope TEXT NOT NULL,
          status VARCHAR(32) NOT NULL DEFAULT 'CONNECTED',
          connected_at TIMESTAMPTZ NOT NULL,
          last_synchronized_at TIMESTAMPTZ,
          error TEXT
        );

        CREATE TABLE IF NOT EXISTS live_emails (
          id VARCHAR(128) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          provider VARCHAR(32) NOT NULL DEFAULT 'GMAIL',
          message_id VARCHAR(255) NOT NULL,
          thread_id VARCHAR(255),
          sender VARCHAR(255) NOT NULL,
          subject TEXT NOT NULL,
          snippet TEXT,
          body_text TEXT NOT NULL,
          date TIMESTAMPTZ NOT NULL,
          security_status VARCHAR(64) NOT NULL,
          urgency_level VARCHAR(64) NOT NULL,
          is_quarantined BOOLEAN NOT NULL DEFAULT FALSE,
          quarantine_reason TEXT,
          analyzed_at TIMESTAMPTZ NOT NULL,
          raw_metadata JSONB
        );
        CREATE INDEX IF NOT EXISTS idx_live_emails_user_id ON live_emails(user_id);

        CREATE TABLE IF NOT EXISTS audit_records (
          id VARCHAR(128) PRIMARY KEY,
          user_id VARCHAR(64),
          user_email VARCHAR(255),
          mode VARCHAR(32) NOT NULL DEFAULT 'DEMO',
          correlation_id VARCHAR(128) NOT NULL,
          event_type VARCHAR(64) NOT NULL,
          source VARCHAR(64) NOT NULL,
          threat_category VARCHAR(64),
          severity VARCHAR(32),
          policy_decision VARCHAR(32),
          final_outcome VARCHAR(64),
          data_json JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_audit_records_user_id ON audit_records(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_records_mode ON audit_records(mode);
      `);

      await client.query("COMMIT;");
    } catch (err) {
      await client.query("ROLLBACK;");
      this.schemaInitPromise = null;
      throw err;
    } finally {
      client.release();
    }
  }

  private mapUser(row: Record<string, unknown>): DbUser {
    return {
      id: String(row.id),
      email: String(row.email),
      displayName: String(row.display_name),
      profileImage: row.profile_image ? String(row.profile_image) : null,
      role: (row.role as DbUser["role"]) || "USER",
      accountStatus: (row.account_status as DbUser["accountStatus"]) || "ACTIVE",
      createdAt: toIso(row.created_at),
      lastLoginAt: toIso(row.last_login_at),
    };
  }

  private mapConnectedAccount(row: Record<string, unknown>): DbConnectedAccount {
    return {
      id: String(row.id),
      userId: String(row.user_id),
      provider: row.provider as MailProviderType,
      emailAddress: String(row.email_address),
      gmailAddress: String(row.email_address),
      encryptedRefreshToken: String(row.encrypted_refresh_token),
      encryptedAccessToken: row.encrypted_access_token ? String(row.encrypted_access_token) : null,
      tokenExpiresAt: row.token_expires_at ? Number(row.token_expires_at) : null,
      scope: String(row.scope),
      status: (row.status as DbConnectedAccount["status"]) || "CONNECTED",
      connectedAt: toIso(row.connected_at),
      lastSynchronizedAt: row.last_synchronized_at ? toIso(row.last_synchronized_at) : null,
      error: row.error ? String(row.error) : null,
    };
  }

  // --- Users ---
  async createUser(user: Omit<DbUser, "createdAt" | "lastLoginAt">): Promise<DbUser> {
    await this.ensureSchema();
    const now = new Date().toISOString();
    const newUser: DbUser = {
      ...user,
      createdAt: now,
      lastLoginAt: now,
    };

    const query = `
      INSERT INTO users (id, email, display_name, profile_image, role, account_status, created_at, last_login_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT(email) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        profile_image = EXCLUDED.profile_image,
        last_login_at = EXCLUDED.last_login_at
      RETURNING *;
    `;

    const res = await this.pool.query(query, [
      newUser.id,
      newUser.email.toLowerCase(),
      newUser.displayName,
      newUser.profileImage || null,
      newUser.role,
      newUser.accountStatus,
      newUser.createdAt,
      newUser.lastLoginAt,
    ]);

    return this.mapUser(res.rows[0]);
  }

  async getUserById(id: string): Promise<DbUser | null> {
    await this.ensureSchema();
    const res = await this.pool.query("SELECT * FROM users WHERE id = $1", [id]);
    if (res.rows.length === 0) return null;
    return this.mapUser(res.rows[0]);
  }

  async getUserByEmail(email: string): Promise<DbUser | null> {
    await this.ensureSchema();
    const res = await this.pool.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [
      email.trim(),
    ]);
    if (res.rows.length === 0) return null;
    return this.mapUser(res.rows[0]);
  }

  async updateUser(id: string, updates: Partial<DbUser>): Promise<DbUser | null> {
    await this.ensureSchema();
    const existing = await this.getUserById(id);
    if (!existing) return null;

    const updated: DbUser = {
      ...existing,
      ...updates,
      id: existing.id,
      email: existing.email,
    };

    const query = `
      UPDATE users SET
        display_name = $1,
        profile_image = $2,
        role = $3,
        account_status = $4,
        last_login_at = $5
      WHERE id = $6
      RETURNING *;
    `;

    const res = await this.pool.query(query, [
      updated.displayName,
      updated.profileImage || null,
      updated.role,
      updated.accountStatus,
      updated.lastLoginAt,
      id,
    ]);

    return res.rows[0] ? this.mapUser(res.rows[0]) : null;
  }

  async getAllUsers(): Promise<DbUser[]> {
    await this.ensureSchema();
    const res = await this.pool.query("SELECT * FROM users ORDER BY created_at DESC");
    return res.rows.map((r) => this.mapUser(r));
  }

  async getUserCount(): Promise<number> {
    await this.ensureSchema();
    const res = await this.pool.query("SELECT COUNT(*)::int as count FROM users");
    return Number(res.rows[0]?.count || 0);
  }

  // --- Sessions ---
  async createSession(userId: string, ttlMs: number = 7 * 24 * 60 * 60 * 1000): Promise<DbSession> {
    await this.ensureSchema();
    const token = crypto.randomBytes(32).toString("hex");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs).toISOString();

    const session: DbSession = {
      id: token,
      userId,
      createdAt: now.toISOString(),
      expiresAt,
    };

    const query = `
      INSERT INTO sessions (id, user_id, created_at, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    await this.pool.query(query, [session.id, session.userId, session.createdAt, session.expiresAt]);
    return session;
  }

  async getSession(token: string): Promise<DbSession | null> {
    if (!token) return null;
    await this.ensureSchema();

    const res = await this.pool.query("SELECT * FROM sessions WHERE id = $1", [token.trim()]);
    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    const expiresAt = toIso(row.expires_at);

    if (new Date(expiresAt).getTime() < Date.now()) {
      await this.deleteSession(token);
      return null;
    }

    return {
      id: String(row.id),
      userId: String(row.user_id),
      createdAt: toIso(row.created_at),
      expiresAt,
    };
  }

  async deleteSession(token: string): Promise<void> {
    await this.ensureSchema();
    await this.pool.query("DELETE FROM sessions WHERE id = $1", [token.trim()]);
  }

  async deleteSessionsByUserId(userId: string): Promise<void> {
    await this.ensureSchema();
    await this.pool.query("DELETE FROM sessions WHERE user_id = $1", [userId]);
  }

  // --- Connected Accounts ---
  async saveConnectedAccount(
    conn: Omit<DbConnectedAccount, "id" | "connectedAt">
  ): Promise<DbConnectedAccount> {
    await this.ensureSchema();
    const existing = await this.getConnectedAccount(conn.userId, conn.provider);
    const id = existing
      ? existing.id
      : `${conn.provider.toLowerCase()}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const connectedAt = existing ? existing.connectedAt : new Date().toISOString();

    const query = `
      INSERT INTO connected_accounts (
        id, user_id, provider, email_address, encrypted_refresh_token, encrypted_access_token,
        token_expires_at, scope, status, connected_at, last_synchronized_at, error
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT(user_id, provider) DO UPDATE SET
        email_address = EXCLUDED.email_address,
        encrypted_refresh_token = EXCLUDED.encrypted_refresh_token,
        encrypted_access_token = EXCLUDED.encrypted_access_token,
        token_expires_at = EXCLUDED.token_expires_at,
        scope = EXCLUDED.scope,
        status = EXCLUDED.status,
        last_synchronized_at = EXCLUDED.last_synchronized_at,
        error = EXCLUDED.error
      RETURNING *;
    `;

    await this.pool.query(query, [
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
      conn.error || null,
    ]);

    // Keep gmail_connections in sync
    if (conn.provider === "GMAIL") {
      const gQuery = `
        INSERT INTO gmail_connections (
          id, user_id, gmail_address, encrypted_refresh_token, encrypted_access_token,
          token_expires_at, scope, status, connected_at, last_synchronized_at, error
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT(user_id) DO UPDATE SET
          gmail_address = EXCLUDED.gmail_address,
          encrypted_refresh_token = EXCLUDED.encrypted_refresh_token,
          encrypted_access_token = EXCLUDED.encrypted_access_token,
          token_expires_at = EXCLUDED.token_expires_at,
          scope = EXCLUDED.scope,
          status = EXCLUDED.status,
          last_synchronized_at = EXCLUDED.last_synchronized_at,
          error = EXCLUDED.error;
      `;
      await this.pool.query(gQuery, [
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
        conn.error || null,
      ]);
    }

    return {
      ...conn,
      id,
      connectedAt,
    };
  }

  async getConnectedAccount(
    userId: string,
    provider: MailProviderType
  ): Promise<DbConnectedAccount | null> {
    await this.ensureSchema();
    const res = await this.pool.query(
      "SELECT * FROM connected_accounts WHERE user_id = $1 AND provider = $2",
      [userId, provider]
    );

    if (res.rows.length > 0) {
      return this.mapConnectedAccount(res.rows[0]);
    }

    // Fallback for GMAIL
    if (provider === "GMAIL") {
      const gRes = await this.pool.query(
        "SELECT * FROM gmail_connections WHERE user_id = $1",
        [userId]
      );
      if (gRes.rows.length > 0) {
        const row = gRes.rows[0];
        return {
          id: String(row.id),
          userId: String(row.user_id),
          provider: "GMAIL",
          emailAddress: String(row.gmail_address),
          gmailAddress: String(row.gmail_address),
          encryptedRefreshToken: String(row.encrypted_refresh_token),
          encryptedAccessToken: row.encrypted_access_token ? String(row.encrypted_access_token) : null,
          tokenExpiresAt: row.token_expires_at ? Number(row.token_expires_at) : null,
          scope: String(row.scope),
          status: (row.status as DbConnectedAccount["status"]) || "CONNECTED",
          connectedAt: toIso(row.connected_at),
          lastSynchronizedAt: row.last_synchronized_at ? toIso(row.last_synchronized_at) : null,
          error: row.error ? String(row.error) : null,
        };
      }
    }

    return null;
  }

  async getConnectedAccountsByUserId(userId: string): Promise<DbConnectedAccount[]> {
    await this.ensureSchema();
    const res = await this.pool.query(
      "SELECT * FROM connected_accounts WHERE user_id = $1",
      [userId]
    );
    const accounts = res.rows.map((r) => this.mapConnectedAccount(r));

    if (!accounts.some((a) => a.provider === "GMAIL")) {
      const gConn = await this.getGmailConnectionByUserId(userId);
      if (gConn) {
        accounts.push({
          id: gConn.id,
          userId: gConn.userId,
          provider: "GMAIL",
          emailAddress: gConn.emailAddress || gConn.gmailAddress,
          gmailAddress: gConn.gmailAddress,
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
    await this.ensureSchema();
    await this.pool.query(
      "DELETE FROM connected_accounts WHERE user_id = $1 AND provider = $2",
      [userId, provider]
    );
    if (provider === "GMAIL") {
      await this.pool.query("DELETE FROM gmail_connections WHERE user_id = $1", [userId]);
    }
  }

  async saveGmailConnection(
    conn: Omit<DbGmailConnection, "id" | "connectedAt">
  ): Promise<DbGmailConnection> {
    const email = conn.emailAddress || conn.gmailAddress || "";
    const saved = await this.saveConnectedAccount({
      ...conn,
      provider: "GMAIL",
      emailAddress: email,
      gmailAddress: email,
    });
    return {
      ...saved,
      gmailAddress: saved.emailAddress,
    };
  }

  async getGmailConnectionByUserId(userId: string): Promise<DbGmailConnection | null> {
    const acct = await this.getConnectedAccount(userId, "GMAIL");
    if (!acct) return null;
    return {
      ...acct,
      gmailAddress: acct.emailAddress,
    };
  }

  async deleteGmailConnection(userId: string): Promise<void> {
    await this.deleteConnectedAccount(userId, "GMAIL");
  }

  async getConnectedAccountsCount(): Promise<number> {
    await this.ensureSchema();
    const res = await this.pool.query(
      "SELECT COUNT(DISTINCT (user_id, provider))::int as count FROM connected_accounts WHERE status = 'CONNECTED'"
    );
    return Number(res.rows[0]?.count || 0);
  }

  // --- Live Emails Cache ---
  async saveLiveEmails(
    userId: string,
    emails: Omit<DbLiveEmail, "id" | "userId">[]
  ): Promise<DbLiveEmail[]> {
    await this.ensureSchema();
    await this.clearLiveEmailsByUserId(userId);

    const result: DbLiveEmail[] = [];

    for (const em of emails) {
      const id = `email_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
      const query = `
        INSERT INTO live_emails (
          id, user_id, provider, message_id, thread_id, sender, subject, snippet, body_text,
          date, security_status, urgency_level, is_quarantined, quarantine_reason,
          analyzed_at, raw_metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16);
      `;

      await this.pool.query(query, [
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
        em.isQuarantined,
        em.quarantineReason || null,
        em.analyzedAt,
        em.rawMetadata ? JSON.stringify(em.rawMetadata) : null,
      ]);

      result.push({
        ...em,
        id,
        userId,
      });
    }

    return result;
  }

  async getLiveEmailsByUserId(userId: string): Promise<DbLiveEmail[]> {
    await this.ensureSchema();
    const res = await this.pool.query(
      "SELECT * FROM live_emails WHERE user_id = $1 ORDER BY date DESC",
      [userId]
    );

    return res.rows.map((r) => ({
      id: String(r.id),
      userId: String(r.user_id),
      provider: (r.provider as MailProviderType) || "GMAIL",
      messageId: String(r.message_id),
      threadId: r.thread_id ? String(r.thread_id) : null,
      sender: String(r.sender),
      subject: String(r.subject),
      snippet: r.snippet ? String(r.snippet) : null,
      bodyText: String(r.body_text),
      date: toIso(r.date),
      securityStatus: r.security_status as DbLiveEmail["securityStatus"],
      urgencyLevel: r.urgency_level as DbLiveEmail["urgencyLevel"],
      isQuarantined: Boolean(r.is_quarantined),
      quarantineReason: r.quarantine_reason ? String(r.quarantine_reason) : null,
      analyzedAt: toIso(r.analyzed_at),
      rawMetadata: r.raw_metadata
        ? typeof r.raw_metadata === "string"
          ? JSON.parse(r.raw_metadata)
          : (r.raw_metadata as Record<string, unknown>)
        : null,
    }));
  }

  async clearLiveEmailsByUserId(userId: string): Promise<void> {
    await this.ensureSchema();
    await this.pool.query("DELETE FROM live_emails WHERE user_id = $1", [userId]);
  }

  // --- Audit Records ---
  async saveAuditRecord(
    record: Omit<DbAuditRecord, "id" | "createdAt">
  ): Promise<DbAuditRecord> {
    await this.ensureSchema();
    const id = `audit_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const createdAt = new Date().toISOString();

    const query = `
      INSERT INTO audit_records (
        id, user_id, user_email, mode, correlation_id, event_type,
        source, threat_category, severity, policy_decision, final_outcome,
        data_json, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);
    `;

    await this.pool.query(query, [
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
      createdAt,
    ]);

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
    await this.ensureSchema();
    let query = "SELECT * FROM audit_records WHERE 1=1";
    const params: (string | number)[] = [];

    if (filter?.userId) {
      params.push(filter.userId);
      query += ` AND user_id = $${params.length}`;
    }
    if (filter?.mode) {
      params.push(filter.mode);
      query += ` AND mode = $${params.length}`;
    }

    params.push(filter?.limit || 100);
    query += ` ORDER BY created_at DESC LIMIT $${params.length}`;

    const res = await this.pool.query(query, params);

    return res.rows.map((r) => ({
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
      dataJson: typeof r.data_json === "string" ? r.data_json : JSON.stringify(r.data_json),
      createdAt: toIso(r.created_at),
    }));
  }

  async getAuditRecordStats(userId?: string): Promise<{
    total: number;
    blocked: number;
    threats: number;
  }> {
    await this.ensureSchema();
    let query = `
      SELECT
        COUNT(*)::int as total,
        SUM(CASE WHEN policy_decision = 'BLOCK' THEN 1 ELSE 0 END)::int as blocked,
        SUM(CASE WHEN threat_category IS NOT NULL AND threat_category != 'NONE' AND threat_category != 'BENIGN' THEN 1 ELSE 0 END)::int as threats
      FROM audit_records WHERE 1=1
    `;
    const params: string[] = [];
    if (userId) {
      params.push(userId);
      query += ` AND user_id = $${params.length}`;
    }

    const res = await this.pool.query(query, params);
    const row = res.rows[0];

    return {
      total: Number(row?.total || 0),
      blocked: Number(row?.blocked || 0),
      threats: Number(row?.threats || 0),
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
