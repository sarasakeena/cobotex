import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rankTeams, haversine, calculateEtaMinutes } from "@/lib/assignment";
import { logEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

// POST /api/incidents/[id]/assign - Assign response team (auto-pick or manual override)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Optional body
      body = {};
    }
    const { teamId } = body;

    const incident = await prisma.incident.findUnique({
      where: { id },
    });

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    const hasCoords =
      typeof incident.latitude === "number" &&
      typeof incident.longitude === "number";

    // DB Transaction for atomic assignment and lock
    const result = await prisma.$transaction(async (tx) => {
      let chosenTeamId = teamId;
      let calculatedDistance: number | null = null;
      let calculatedEta: number | null = null;

      if (!chosenTeamId) {
        // Auto-assign mode
        if (!hasCoords) {
          throw new Error("LOCATION_MISSING");
        }

        const availableTeams = await tx.team.findMany({
          where: { status: "AVAILABLE" },
        });

        const ranked = rankTeams(
          {
            category: incident.category,
            latitude: incident.latitude,
            longitude: incident.longitude,
          },
          availableTeams
        );

        if (ranked.length === 0) {
          throw new Error("NO_AVAILABLE_TEAMS");
        }

        const best = ranked[0];
        chosenTeamId = best.team.id;
        calculatedDistance = best.distanceKm;
        calculatedEta = best.etaMinutes;
      }

      // Verify selected team
      const teamToAssign = await tx.team.findUnique({
        where: { id: chosenTeamId },
      });

      if (!teamToAssign) {
        throw new Error("TEAM_NOT_FOUND");
      }

      if (teamToAssign.status !== "AVAILABLE") {
        throw new Error("TEAM_UNAVAILABLE");
      }

      // Calculate distance if manual teamId was specified and coords are present
      if (calculatedDistance === null && hasCoords) {
        calculatedDistance = haversine(
          incident.latitude!,
          incident.longitude!,
          teamToAssign.latitude,
          teamToAssign.longitude
        );
        calculatedEta = calculateEtaMinutes(calculatedDistance);
      }

      // If incident was previously assigned to another team, release that team
      if (incident.assignedTeamId && incident.assignedTeamId !== teamToAssign.id) {
        await tx.team.update({
          where: { id: incident.assignedTeamId },
          data: { status: "AVAILABLE", currentIncidentId: null },
        });
      }

      // Mark the new team as BUSY
      const updatedTeam = await tx.team.update({
        where: { id: teamToAssign.id },
        data: {
          status: "BUSY",
          currentIncidentId: incident.id,
        },
      });

      // Update incident to ASSIGNED with team details
      const updatedIncident = await tx.incident.update({
        where: { id: incident.id },
        data: {
          assignedTeamId: updatedTeam.id,
          status: "ASSIGNED",
          assignedAt: new Date(),
          distanceKm: calculatedDistance,
          etaMinutes: calculatedEta,
        },
        include: {
          assignedTeam: true,
        },
      });

      return { updatedIncident, updatedTeam, distanceKm: calculatedDistance, etaMinutes: calculatedEta };
    });

    const etaText = result.etaMinutes ? `${result.etaMinutes}` : "10";
    await logEvent(
      result.updatedIncident.id,
      "ASSIGNED",
      `A ${result.updatedTeam.category} team (${result.updatedTeam.code}) has been assigned. Estimated arrival: ${etaText} min.`,
      `Assigned primary team ${result.updatedTeam.code} (${result.updatedTeam.name}). Distance: ${result.distanceKm ? result.distanceKm.toFixed(1) : "?"} km, ETA: ${etaText} min.`
    );

    return NextResponse.json({
      success: true,
      message: `Team ${result.updatedTeam.code} (${result.updatedTeam.name}) assigned successfully.`,
      incident: result.updatedIncident,
      assignedTeam: result.updatedTeam,
      distanceKm: result.distanceKm,
      etaMinutes: result.etaMinutes,
    });
  } catch (error: any) {
    if (error.message === "LOCATION_MISSING") {
      return NextResponse.json(
        { error: "Location missing: cannot auto-assign nearest team without coordinates" },
        { status: 400 }
      );
    }
    if (error.message === "NO_AVAILABLE_TEAMS") {
      return NextResponse.json(
        { error: "No available team. Incident stays in the priority queue." },
        { status: 404 }
      );
    }
    if (error.message === "TEAM_UNAVAILABLE") {
      return NextResponse.json(
        { error: "Selected team is no longer available" },
        { status: 409 }
      );
    }
    if (error.message === "TEAM_NOT_FOUND") {
      return NextResponse.json({ error: "Selected team does not exist" }, { status: 404 });
    }

    console.error("Assignment failed:", error);
    return NextResponse.json(
      { error: "Failed to assign response team" },
      { status: 500 }
    );
  }
}

