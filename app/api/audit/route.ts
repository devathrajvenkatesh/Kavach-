import { NextRequest, NextResponse } from "next/server";
import { defaultAuditLogger, sanitizeObject, sanitizeText } from "@/lib/audit/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/audit
 *
 * Read-only enterprise audit API bridge exposing sanitized security events,
 * telemetry metrics, and traces directly from the authoritative server-side AuditLogger.
 *
 * Guarantees zero credential or secret leakage.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const format = url.searchParams.get("format");
    const correlationId = url.searchParams.get("correlationId");
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 1000) : 100;

    // CSV Export Handler
    if (format === "csv") {
      const csvContent = defaultAuditLogger.exportEventsToCSV(limit);
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="kavach-audit-export-${Date.now()}.csv"`,
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    // Filter by Correlation ID if requested
    let events = correlationId
      ? defaultAuditLogger.getEventsByCorrelationId(correlationId)
      : defaultAuditLogger.getRecentEvents(limit);

    // Apply strict sanitization pass
    events = sanitizeObject(events) as typeof events;
    const metrics = sanitizeObject(defaultAuditLogger.getTelemetryMetrics());
    const stats = defaultAuditLogger.getStats();

    return NextResponse.json(
      {
        success: true,
        events,
        metrics,
        stats,
        totalEvents: events.length,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? sanitizeText(error.message) : "Failed to retrieve audit data";
    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/audit
 *
 * Clears in-memory audit logs for test sessions.
 */
export async function DELETE() {
  try {
    defaultAuditLogger.clear();
    return NextResponse.json(
      {
        success: true,
        message: "Server audit logs cleared successfully.",
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? sanitizeText(error.message) : "Failed to clear audit data";
    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
