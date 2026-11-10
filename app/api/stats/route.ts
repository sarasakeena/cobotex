import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatCategoryName } from "@/lib/severity";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [total, critical, pending, resolved, categoryCounts] = await Promise.all([
      prisma.incident.count(),
      prisma.incident.count({ where: { severity: "CRITICAL" } }),
      prisma.incident.count({ where: { status: "PENDING" } }),
      prisma.incident.count({ where: { status: "RESOLVED" } }),
      prisma.incident.groupBy({
        by: ["category"],
        _count: {
          category: true,
        },
      }),
    ]);

    // Standard list of all categories so chart includes zero-count categories gracefully
    const allCategories = [
      "FIRE",
      "ROAD_ACCIDENT",
      "MEDICAL",
      "FLOOD",
      "BUILDING_COLLAPSE",
      "OTHER",
    ];

    const countsMap = new Map<string, number>();
    categoryCounts.forEach((c) => {
      countsMap.set(c.category, c._count.category);
    });

    const byCategory = allCategories.map((cat) => ({
      category: cat,
      name: formatCategoryName(cat),
      count: countsMap.get(cat) || 0,
    }));

    return NextResponse.json({
      total,
      critical,
      pending,
      resolved,
      byCategory,
    });
  } catch (error) {
    console.error("Failed to fetch statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
