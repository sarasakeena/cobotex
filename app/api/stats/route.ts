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

    // Standard list of all categories
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

    // Standard list of all statuses
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
