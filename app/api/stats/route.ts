import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatCategoryName } from "@/lib/severity";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [
      total,
      critical,
      pending,
      resolved,
      assignedCount,
      inProgressCount,
      availableTeams,
      busyTeams,
      pendingBackupCount,
      incidentsWithTimestamps,
      categoryCounts,
      statusCounts,
    ] = await Promise.all([
      prisma.incident.count(),
      prisma.incident.count({ where: { severity: "CRITICAL" } }),
      prisma.incident.count({ where: { status: "PENDING" } }),
      prisma.incident.count({ where: { status: "RESOLVED" } }),
      prisma.incident.count({ where: { status: "ASSIGNED" } }),
      prisma.incident.count({ where: { status: "IN_PROGRESS" } }),
      prisma.team.count({ where: { status: "AVAILABLE" } }),
      prisma.team.count({ where: { status: "BUSY" } }),
      prisma.backupRequest.count({ where: { status: "PENDING" } }),
      prisma.incident.findMany({
        where: {
          assignedAt: { not: null },
        },
        select: {
          assignedAt: true,
          enRouteAt: true,
          arrivedAt: true,
          resolvedAt: true,
        },
      }),
      prisma.incident.groupBy({
        by: ["category"],
        _count: {
          category: true,
        },
      }),
      prisma.incident.groupBy({
        by: ["status"],
        _count: {
          status: true,
        },
      }),
    ]);

    // Compute Average Response Time (assignedAt to arrivedAt)
    let totalResponseMinutes = 0;
    let responseCount = 0;

    let totalResolutionMinutes = 0;
    let resolutionCount = 0;

    for (const inc of incidentsWithTimestamps) {
      if (inc.assignedAt && inc.arrivedAt) {
        const diffMs = new Date(inc.arrivedAt).getTime() - new Date(inc.assignedAt).getTime();
        if (diffMs > 0) {
          totalResponseMinutes += diffMs / (1000 * 60);
          responseCount++;
        }
      }

      if (inc.arrivedAt && inc.resolvedAt) {
        const diffMs = new Date(inc.resolvedAt).getTime() - new Date(inc.arrivedAt).getTime();
        if (diffMs > 0) {
          totalResolutionMinutes += diffMs / (1000 * 60);
          resolutionCount++;
        }
      } else if (inc.assignedAt && inc.resolvedAt) {
        const diffMs = new Date(inc.resolvedAt).getTime() - new Date(inc.assignedAt).getTime();
        if (diffMs > 0) {
          totalResolutionMinutes += diffMs / (1000 * 60);
          resolutionCount++;
        }
      }
    }

    const avgResponseTime =
      responseCount > 0 ? `${(totalResponseMinutes / responseCount).toFixed(1)}m` : "n/a";

    const avgResolutionTime =
      resolutionCount > 0 ? `${(totalResolutionMinutes / resolutionCount).toFixed(1)}m` : "n/a";

    // Standard categories
    const allCategories = [
      "FIRE",
      "ROAD_ACCIDENT",
      "MEDICAL",
      "FLOOD",
      "BUILDING_COLLAPSE",
      "OTHER",
    ];

    const catMap = new Map<string, number>();
    categoryCounts.forEach((c) => {
      catMap.set(c.category, c._count.category);
    });

    const byCategory = allCategories.map((cat) => ({
      category: cat,
      name: formatCategoryName(cat),
      count: catMap.get(cat) || 0,
    }));

    // Standard statuses
    const allStatuses = [
      { status: "REPORTED", name: "Reported" },
      { status: "PENDING", name: "Pending" },
      { status: "ASSIGNED", name: "Assigned" },
      { status: "IN_PROGRESS", name: "In Progress" },
      { status: "RESOLVED", name: "Resolved" },
    ];

    const statusMap = new Map<string, number>();
    statusCounts.forEach((s) => {
      statusMap.set(s.status, s._count.status);
    });

    const byStatus = allStatuses.map((st) => ({
      status: st.status,
      name: st.name,
      count: statusMap.get(st.status) || 0,
    }));

    const assignedIncidents = assignedCount + inProgressCount;

    return NextResponse.json({
      total,
      critical,
      pending,
      resolved,
      resolvedIncidents: resolved,
      availableTeams,
      busyTeams,
      assignedIncidents,
      pendingBackupCount,
      avgResponseTime,
      avgResolutionTime,
      byCategory,
      byStatus,
    });
  } catch (error) {
    console.error("Failed to generate analytics stats:", error);
    return NextResponse.json(
      { error: "Internal server error fetching analytics statistics" },
      { status: 500 }
    );
  }
}
