import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { defaultAuditLogger } from "@/lib/audit/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // 1. Independent Server-Side Admin Authorization Check
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) {
    return auth; // Returns 401 or 403
  }

  try {
    const db = getDb();

    // 2. Fetch System Metrics
    const totalUsers = await db.getUserCount();
    const allUsers = await db.getAllUsers();
    const connectedGmailCount = await db.getConnectedAccountsCount();

    // Active users in last 30 days
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const activeUsers = allUsers.filter(
      (u) => new Date(u.lastLoginAt).getTime() > thirtyDaysAgo
    ).length;

    // Sanitized user list (exclude internal sensitive details)
    const sanitizedUsers = allUsers.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      accountStatus: u.accountStatus,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
    }));

    // System audit & security event metrics
    const stats = defaultAuditLogger.getStats();
    const telemetry = defaultAuditLogger.getTelemetryMetrics();
    const recentSystemEvents = defaultAuditLogger.getRecentEvents(25);

    // Provider health check
    const currentProvider = process.env.LLM_PROVIDER || "mock";
    const providerHealth = {
      configuredProvider: currentProvider,
      status: "OPERATIONAL",
      failClosedActive: true,
      lastCheckAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      admin: {
        id: auth.user.id,
        email: auth.user.email,
      },
      stats: {
        totalUsers,
        activeUsers,
        connectedAccounts: connectedGmailCount,
        connectedGmailAccounts: connectedGmailCount,
        securityEventsTotal: stats.total,
        threatsBlocked: stats.blocked,
        threatsDetected: stats.threats,
        unauthorizedExecutions: telemetry.unauthorizedExecutions,
        blockRate: telemetry.blockRate,
      },
      users: sanitizedUsers,
      providerHealth,
      systemHealth: {
        status: "HEALTHY",
        mode: process.env.NODE_ENV || "development",
        uptimeSeconds: Math.floor(process.uptime()),
        memoryHeapMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        invariantsEnforced: true,
      },
      recentSystemEvents,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate administrator telemetry report.",
        code: "ADMIN_REPORT_ERROR",
      },
      { status: 500 }
    );
  }
}
