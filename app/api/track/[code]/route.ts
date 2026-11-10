import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildTimelineEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

// In-memory rate limiting: 30 requests per minute per IP
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }

  if (record.count >= 30) {
    return true;
  }

  record.count += 1;
  return false;
}

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((value, key) => {
    if (now > value.resetAt) {
      rateLimitMap.delete(key);
    }
  });
}, 5 * 60_000);

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const rawIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    if (isRateLimited(rawIp)) {
      return NextResponse.json(
        { error: "Too many tracking requests from this IP. Please wait a minute and try again." },
        { status: 429 }
      );
    }

    const { code } = params;
    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return NextResponse.json(
        { error: "Invalid tracking code. Please enter a valid code like ERP-XXXXXX." },
        { status: 400 }
      );
    }

    const normalizedCode = code.trim().toUpperCase();

    const incident = await prisma.incident.findUnique({
      where: { trackingCode: normalizedCode },
      include: {
        assignedTeam: {
          select: {
            code: true,
            category: true,
          },
        },
        events: {
          where: {
            publicMessage: { not: null },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!incident) {
      return NextResponse.json(
        {
          error: "No emergency report found matching this tracking code. Please verify the code and try again.",
        },
        { status: 404 }
      );
    }

    // Build timeline events (handles synthetic fallback if no logged events)
    const allTimeline = buildTimelineEvents(incident);
    const publicEvents = allTimeline
      .filter((e) => Boolean(e.publicMessage))
      .map((e) => ({
        type: e.type,
        publicMessage: e.publicMessage,
        createdAt: e.createdAt,
      }));

    // STRICT PRIVACY: Only return safe public fields
    const safeData = {
      trackingCode: incident.trackingCode,
      category: incident.category,
      severity: incident.severity,
      status: incident.status,
      createdAt: incident.createdAt,
      publicEvents,
      assignedTeam: incident.assignedTeam
        ? {
            code: incident.assignedTeam.code,
            category: incident.assignedTeam.category,
          }
        : null,
      etaMinutes: incident.etaMinutes,
      distanceKm: incident.distanceKm,
    };

    return NextResponse.json(safeData);
  } catch (error) {
    console.error("Public tracking error:", error);
    return NextResponse.json(
      { error: "Unable to retrieve emergency tracking status. Please try again later." },
      { status: 500 }
    );
  }
}

