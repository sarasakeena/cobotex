import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedTeam } from "@/lib/teamAuth";
import { haversine } from "@/lib/assignment";

export async function POST(request: NextRequest) {
  try {
    const team = await getAuthenticatedTeam(request);
    if (!team) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const body = await request.json();
    const { lat, lng } = body;

    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      isNaN(lat) ||
      isNaN(lng)
    ) {
      return NextResponse.json({ error: "Valid lat and lng numbers are required" }, { status: 400 });
    }

    const now = new Date();
    let calculatedSpeed: number | null = team.speedKmh;

    if (team.lastLocationAt && team.latitude && team.longitude) {
      const elapsedHours = (now.getTime() - new Date(team.lastLocationAt).getTime()) / (1000 * 3600);
      if (elapsedHours > 0 && elapsedHours < 0.5) {
        // Only compute if within last 30 minutes
        const distanceDelta = haversine(team.latitude, team.longitude, lat, lng);
        const instantSpeed = distanceDelta / elapsedHours;
        const boundedInstant = Math.min(120, Math.max(0, instantSpeed));
        const prevSpeed = team.speedKmh || boundedInstant;
        calculatedSpeed = Math.round((0.7 * prevSpeed + 0.3 * boundedInstant) * 10) / 10;
      }
    }

    // Update Team coordinates & speed
    const updatedTeam = await prisma.team.update({
      where: { id: team.id },
      data: {
        latitude: lat,
        longitude: lng,
        lastLocationAt: now,
        speedKmh: calculatedSpeed,
      },
    });

    // If assigned to an active incident, update distanceKm and etaMinutes
    let remainingDistance: number | null = null;
    let liveEtaMinutes: number | null = null;

    if (team.currentIncidentId) {
      const incident = await prisma.incident.findUnique({
        where: { id: team.currentIncidentId },
      });

      if (incident && incident.latitude && incident.longitude && incident.status !== "RESOLVED") {
        remainingDistance = haversine(lat, lng, incident.latitude, incident.longitude);
        const effectiveSpeed = Math.max(calculatedSpeed || 0, 20); // max(current speed, 20 km/h)
        liveEtaMinutes = Math.max(1, Math.ceil((remainingDistance / effectiveSpeed) * 60));

        if (incident.assignedTeamId === team.id) {
          // Primary team
          await prisma.incident.update({
            where: { id: incident.id },
            data: {
              distanceKm: remainingDistance,
              etaMinutes: liveEtaMinutes,
            },
          });
        } else {
          // Backup team
          await prisma.incidentTeam.updateMany({
            where: { incidentId: incident.id, teamId: team.id, releasedAt: null },
            data: {
              distanceKm: remainingDistance,
              etaMinutes: liveEtaMinutes,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      team: {
        id: updatedTeam.id,
        code: updatedTeam.code,
        latitude: updatedTeam.latitude,
        longitude: updatedTeam.longitude,
        speedKmh: updatedTeam.speedKmh,
        lastLocationAt: updatedTeam.lastLocationAt,
      },
      remainingDistance,
      liveEtaMinutes,
    });
  } catch (error) {
    console.error("Location update failed:", error);
    return NextResponse.json(
      { error: "Failed to update team location" },
      { status: 500 }
    );
  }
}
