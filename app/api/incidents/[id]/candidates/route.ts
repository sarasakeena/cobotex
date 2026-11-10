import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rankTeams } from "@/lib/assignment";

export const dynamic = "force-dynamic";

// GET /api/incidents/[id]/candidates - Top 5 suitable available teams with distance and ETA
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const incident = await prisma.incident.findUnique({
      where: { id },
    });

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    if (
      incident.latitude === null ||
      incident.latitude === undefined ||
      incident.longitude === null ||
      incident.longitude === undefined
    ) {
      return NextResponse.json({
        candidates: [],
        error: "Location missing",
        message: "Incident has no GPS coordinates to calculate team proximity.",
      });
    }

    const availableTeams = await prisma.team.findMany({
      where: {
        status: "AVAILABLE",
      },
    });

    const ranked = rankTeams(
      {
        category: incident.category,
        latitude: incident.latitude,
        longitude: incident.longitude,
      },
      availableTeams
    );

    // Return top 5
    const topCandidates = ranked.slice(0, 5).map((c) => ({
      team: {
        id: c.team.id,
        code: c.team.code,
        name: c.team.name,
        category: c.team.category,
        latitude: c.team.latitude,
        longitude: c.team.longitude,
        address: c.team.address,
        status: c.team.status,
      },
      distanceKm: c.distanceKm,
      etaMinutes: c.etaMinutes,
      fitScore: c.fitScore,
      suitabilityRank: c.suitabilityRank,
      penaltyKm: c.penaltyKm,
    }));

    return NextResponse.json({
      candidates: topCandidates,
      totalAvailableSuitable: ranked.length,
    });
  } catch (error) {
    console.error("Failed to fetch candidate teams:", error);
    return NextResponse.json(
      { error: "Failed to fetch candidate response teams" },
      { status: 500 }
    );
  }
}

