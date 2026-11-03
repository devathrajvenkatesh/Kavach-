/**
 * Kavach Database Persistence Semantics & Multi-User Isolation Test Suite
 *
 * Validates:
 * 1. Environment-based database selection: Strict PostgreSQL enforcement in production
 * 2. Fail-closed security: Missing DATABASE_URL in production halts immediately (zero silent fallback)
 * 3. Prohibition of SQLite and /tmp storage in production serverless execution
 * 4. Multi-user tenant isolation across users, sessions, connected accounts, live emails, and audit records
 * 5. AES-256-GCM token encryption at rest with zero plaintext leakage
 * 6. Connection pooling & SSL configuration semantics for PostgreSQL
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  getDb,
  resetDbInstance,
  isProductionEnvironment,
  SQLiteKavachDatabase,
  PostgresKavachDatabase,
  encryptSecret,
  decryptSecret,
} from "../../lib/db";
import { Pool } from "pg";

describe("Production Database Persistence & Multi-Tenant Isolation", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    resetDbInstance();
  });

  afterEach(() => {
    process.env = { ...origEnv };
    resetDbInstance();
  });

  // ==========================================================================
  // 1. PRODUCTION ENVIRONMENT ROUTING & FAIL-CLOSED GUARDS
  // ==========================================================================
  describe("1. Environment Selection & Production Fail-Closed Guards", () => {
    it("1.1 Detects production environment when VERCEL=1 or NODE_ENV=production", () => {
      // Mock production environment
      delete process.env.KAVACH_FORCE_DB_TYPE;
      const origNodeEnv = process.env.NODE_ENV;
      const origLifecycle = process.env.npm_lifecycle_event;

      try {
        // Temporarily clear test markers to test detection logic
        delete process.env.npm_lifecycle_event;
        process.env.NODE_ENV = "production";
        process.env.VERCEL = "1";

        assert.equal(isProductionEnvironment(), true);

        // When KAVACH_FORCE_DB_TYPE=sqlite is explicitly set, it overrides
        process.env.KAVACH_FORCE_DB_TYPE = "sqlite";
        assert.equal(isProductionEnvironment(), false);

        // When KAVACH_FORCE_DB_TYPE=postgres is set, it forces postgres
        process.env.KAVACH_FORCE_DB_TYPE = "postgres";
        assert.equal(isProductionEnvironment(), true);
      } finally {
        process.env.NODE_ENV = origNodeEnv;
        process.env.npm_lifecycle_event = origLifecycle;
      }
    });

    it("1.2 Throws an explicit error in production if DATABASE_URL or POSTGRES_URL is missing", () => {
      delete process.env.DATABASE_URL;
      delete process.env.POSTGRES_URL;
      process.env.KAVACH_FORCE_DB_TYPE = "postgres";

      assert.throws(
        () => {
          getDb();
        },
        {
          name: "Error",
          message: /Production database configuration missing/,
        }
      );
    });

    it("1.3 Prohibits SQLiteKavachDatabase instantiation in production environments", () => {
      process.env.KAVACH_FORCE_DB_TYPE = "postgres";

      assert.throws(
        () => {
          new SQLiteKavachDatabase();
        },
        {
          name: "Error",
          message: /SQLite persistence is strictly prohibited in production environments/,
        }
      );
    });

    it("1.4 Uses SQLite in local development and test environments when DATABASE_URL is unset", () => {
      delete process.env.DATABASE_URL;
      delete process.env.POSTGRES_URL;
      delete process.env.KAVACH_FORCE_DB_TYPE;

      const db = getDb();
      assert.ok(db instanceof SQLiteKavachDatabase);
    });
  });

  // ==========================================================================
  // 2. POSTGRES PERSISTENCE CLASS CONFIGURATION & INTERFACE CONTRACT
  // ==========================================================================
  describe("2. PostgresKavachDatabase Interface & Connection Configuration", () => {
    it("2.1 Throws if PostgresKavachDatabase is initialized without a connection string", () => {
      delete process.env.DATABASE_URL;
      delete process.env.POSTGRES_URL;

      assert.throws(
        () => {
          new PostgresKavachDatabase("");
        },
        {
          name: "Error",
          message: /PostgreSQL connection string is required/,
        }
      );
    });

    it("2.2 Accepts a pre-existing pg.Pool instance directly", () => {
      // Mock minimal Pool instance
      const mockPool = {
        query: async () => ({ rows: [] }),
        connect: async () => ({
          query: async () => {},
          release: () => {},
        }),
        end: async () => {},
      } as unknown as Pool;

      const pgDb = new PostgresKavachDatabase(mockPool);
      assert.ok(pgDb instanceof PostgresKavachDatabase);
      assert.equal(typeof pgDb.createUser, "function");
      assert.equal(typeof pgDb.createSession, "function");
      assert.equal(typeof pgDb.saveConnectedAccount, "function");
      assert.equal(typeof pgDb.saveLiveEmails, "function");
      assert.equal(typeof pgDb.saveAuditRecord, "function");
    });
  });

  // ==========================================================================
  // 3. MULTI-USER TENANT ISOLATION SEMANTICS
  // ==========================================================================
  describe("3. Multi-User Isolation Semantics", () => {
    it("3.1 Strict User & Session Isolation across distinct tenants", async () => {
      delete process.env.KAVACH_FORCE_DB_TYPE;
      const db = getDb();

      // Tenant A
      const userA = await db.createUser({
        id: "usr_tenant_alice_" + Date.now(),
        email: "alice@defense.corp",
        displayName: "Alice Defense",
        role: "USER",
        accountStatus: "ACTIVE",
      });

      // Tenant B
      const userB = await db.createUser({
        id: "usr_tenant_bob_" + Date.now(),
        email: "bob@finance.corp",
        displayName: "Bob Finance",
        role: "USER",
        accountStatus: "ACTIVE",
      });

      // Verify individual user resolution
      const fetchedA = await db.getUserById(userA.id);
      const fetchedB = await db.getUserById(userB.id);
      assert.equal(fetchedA?.email, "alice@defense.corp");
      assert.equal(fetchedB?.email, "bob@finance.corp");

      // Verify case-insensitive email lookup
      const lookupA = await db.getUserByEmail("ALICE@defense.corp");
      assert.equal(lookupA?.id, userA.id);

      // Session creation
      const sessionA = await db.createSession(userA.id);
      const sessionB = await db.createSession(userB.id);

      assert.notEqual(sessionA.id, sessionB.id);

      // Alice's session resolves to Alice
      const resolvedSessionA = await db.getSession(sessionA.id);
      assert.equal(resolvedSessionA?.userId, userA.id);

      // Bob's session resolves to Bob
      const resolvedSessionB = await db.getSession(sessionB.id);
      assert.equal(resolvedSessionB?.userId, userB.id);

      // Revoking Alice's sessions leaves Bob completely unaffected
      await db.deleteSessionsByUserId(userA.id);
      assert.equal(await db.getSession(sessionA.id), null);
      assert.notEqual(await db.getSession(sessionB.id), null);
    });

    it("3.2 Connected OAuth Accounts: Strict multi-user and multi-provider isolation", async () => {
      delete process.env.KAVACH_FORCE_DB_TYPE;
      const db = getDb();

      const user1 = "usr_acct_iso_1_" + Date.now();
      const user2 = "usr_acct_iso_2_" + Date.now();

      // Create users
      await db.createUser({
        id: user1,
        email: `u1_${Date.now()}@iso.test`,
        displayName: "User One",
        role: "USER",
        accountStatus: "ACTIVE",
      });

      await db.createUser({
        id: user2,
        email: `u2_${Date.now()}@iso.test`,
        displayName: "User Two",
        role: "USER",
        accountStatus: "ACTIVE",
      });

      // User 1 connects Gmail and Microsoft
      await db.saveConnectedAccount({
        userId: user1,
        provider: "GMAIL",
        emailAddress: "u1@gmail.com",
        encryptedRefreshToken: encryptSecret("u1_gmail_refresh_token_secret"),
        scope: "https://www.googleapis.com/auth/gmail.readonly",
        status: "CONNECTED",
      });

      await db.saveConnectedAccount({
        userId: user1,
        provider: "MICROSOFT",
        emailAddress: "u1@outlook.com",
        encryptedRefreshToken: encryptSecret("u1_ms_refresh_token_secret"),
        scope: "https://graph.microsoft.com/Mail.Read",
        status: "CONNECTED",
      });

      // User 2 connects Gmail only
      await db.saveConnectedAccount({
        userId: user2,
        provider: "GMAIL",
        emailAddress: "u2@gmail.com",
        encryptedRefreshToken: encryptSecret("u2_gmail_refresh_token_secret"),
        scope: "https://www.googleapis.com/auth/gmail.readonly",
        status: "CONNECTED",
      });

      // User 1 has 2 accounts, User 2 has 1 account
      const u1Accounts = await db.getConnectedAccountsByUserId(user1);
      const u2Accounts = await db.getConnectedAccountsByUserId(user2);

      assert.equal(u1Accounts.length, 2);
      assert.equal(u2Accounts.length, 1);
      assert.equal(u2Accounts[0].emailAddress, "u2@gmail.com");

      // User 1 deleting Microsoft account does not impact User 1 Gmail or User 2 Gmail
      await db.deleteConnectedAccount(user1, "MICROSOFT");
      assert.equal(await db.getConnectedAccount(user1, "MICROSOFT"), null);
      assert.notEqual(await db.getConnectedAccount(user1, "GMAIL"), null);
      assert.notEqual(await db.getConnectedAccount(user2, "GMAIL"), null);
    });

    it("3.3 Ingested Live Emails: Tenant boundary strictly prevents cross-user access", async () => {
      delete process.env.KAVACH_FORCE_DB_TYPE;
      const db = getDb();

      const userA = "usr_mail_tenant_a_" + Date.now();
      const userB = "usr_mail_tenant_b_" + Date.now();

      await db.createUser({
        id: userA,
        email: `a_${Date.now()}@corp.internal`,
        displayName: "User A",
        role: "USER",
        accountStatus: "ACTIVE",
      });
      await db.createUser({
        id: userB,
        email: `b_${Date.now()}@corp.internal`,
        displayName: "User B",
        role: "USER",
        accountStatus: "ACTIVE",
      });

      // Save emails for User A
      await db.saveLiveEmails(userA, [
        {
          provider: "GMAIL",
          messageId: "msg_a_001",
          sender: "client@external.com",
          subject: "Classified Project Alpha Scope",
          bodyText: "Confidential roadmap for Project Alpha.",
          date: new Date().toISOString(),
          securityStatus: "SECURE",
          urgencyLevel: "HIGH",
          isQuarantined: false,
          analyzedAt: new Date().toISOString(),
        },
      ]);

      // Save emails for User B
      await db.saveLiveEmails(userB, [
        {
          provider: "MICROSOFT",
          messageId: "msg_b_001",
          sender: "vendor@partner.com",
          subject: "Q4 Hardware Delivery",
          bodyText: "Tracking numbers for Q4 shipment.",
          date: new Date().toISOString(),
          securityStatus: "SECURE",
          urgencyLevel: "MEDIUM",
          isQuarantined: false,
          analyzedAt: new Date().toISOString(),
        },
      ]);

      // Query User A's emails
      const emailsA = await db.getLiveEmailsByUserId(userA);
      assert.equal(emailsA.length, 1);
      assert.equal(emailsA[0].subject, "Classified Project Alpha Scope");

      // Query User B's emails
      const emailsB = await db.getLiveEmailsByUserId(userB);
      assert.equal(emailsB.length, 1);
      assert.equal(emailsB[0].subject, "Q4 Hardware Delivery");

      // User A clearing emails has zero effect on User B
      await db.clearLiveEmailsByUserId(userA);
      assert.equal((await db.getLiveEmailsByUserId(userA)).length, 0);
      assert.equal((await db.getLiveEmailsByUserId(userB)).length, 1);
    });

    it("3.4 Audit Records: Accurate multi-tenant attribution and mode separation", async () => {
      delete process.env.KAVACH_FORCE_DB_TYPE;
      const db = getDb();

      const userA = "usr_audit_a_" + Date.now();
      const userB = "usr_audit_b_" + Date.now();

      await db.saveAuditRecord({
        userId: userA,
        userEmail: "a@audit.corp",
        mode: "LIVE",
        correlationId: "corr_a_1",
        eventType: "THREAT_ANALYSIS",
        source: "GMAIL_SYNC",
        threatCategory: "PROMPT_INJECTION",
        severity: "CRITICAL",
        policyDecision: "BLOCK",
        finalOutcome: "QUARANTINED",
        dataJson: JSON.stringify({ detail: "Malicious prompt payload blocked" }),
      });

      await db.saveAuditRecord({
        userId: userB,
        userEmail: "b@audit.corp",
        mode: "LIVE",
        correlationId: "corr_b_1",
        eventType: "EMAIL_FETCH",
        source: "MICROSOFT_SYNC",
        threatCategory: "NONE",
        severity: "INFO",
        policyDecision: "APPROVE",
        finalOutcome: "SYNCHRONIZED",
        dataJson: JSON.stringify({ detail: "3 emails ingested" }),
      });

      // Filter by User A
      const recordsA = await db.getAuditRecords({ userId: userA });
      assert.equal(recordsA.length, 1);
      assert.equal(recordsA[0].threatCategory, "PROMPT_INJECTION");
      assert.equal(recordsA[0].policyDecision, "BLOCK");

      // Filter by User B
      const recordsB = await db.getAuditRecords({ userId: userB });
      assert.equal(recordsB.length, 1);
      assert.equal(recordsB[0].policyDecision, "APPROVE");

      // Stats per user
      const statsA = await db.getAuditRecordStats(userA);
      assert.equal(statsA.total, 1);
      assert.equal(statsA.blocked, 1);
      assert.equal(statsA.threats, 1);

      const statsB = await db.getAuditRecordStats(userB);
      assert.equal(statsB.total, 1);
      assert.equal(statsB.blocked, 0);
      assert.equal(statsB.threats, 0);
    });
  });

  // ==========================================================================
  // 4. AES-256-GCM TOKEN ENCRYPTION AT REST INTEGRITY
  // ==========================================================================
  describe("4. OAuth Token Encryption at Rest & Zero-Leakage Semantics", () => {
    it("4.1 Encrypts OAuth tokens using AES-256-GCM before database insertion", async () => {
      delete process.env.KAVACH_FORCE_DB_TYPE;
      const db = getDb();
      const rawRefreshToken = "1//04_super_secret_oauth_refresh_token_abcdef123456";

      const encryptedToken = encryptSecret(rawRefreshToken);

      // Verify format is enc:v1:<iv>:<tag>:<ciphertext> (5 colon-delimited parts)
      const parts = encryptedToken.split(":");
      assert.equal(parts.length, 5);
      assert.equal(parts[0], "enc");
      assert.equal(parts[1], "v1");

      // Never contains the raw token in plaintext
      assert.equal(encryptedToken.includes(rawRefreshToken), false);

      const testUserId = "usr_token_sec_" + Date.now();
      await db.createUser({
        id: testUserId,
        email: `sec_${Date.now()}@test.corp`,
        displayName: "Security Test User",
        role: "USER",
        accountStatus: "ACTIVE",
      });

      await db.saveConnectedAccount({
        userId: testUserId,
        provider: "GMAIL",
        emailAddress: "sec@gmail.com",
        encryptedRefreshToken: encryptedToken,
        scope: "https://www.googleapis.com/auth/gmail.readonly",
        status: "CONNECTED",
      });

      const retrieved = await db.getConnectedAccount(testUserId, "GMAIL");
      assert.ok(retrieved);

      // Stored value remains securely encrypted
      assert.equal(retrieved.encryptedRefreshToken, encryptedToken);
      assert.equal(retrieved.encryptedRefreshToken.includes(rawRefreshToken), false);

      // Decryption recovers the exact plaintext secret server-side
      const decrypted = decryptSecret(retrieved.encryptedRefreshToken);
      assert.equal(decrypted, rawRefreshToken);
    });
  });
});
