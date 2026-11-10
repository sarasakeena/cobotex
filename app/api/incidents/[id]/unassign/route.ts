import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/incidents/[id]/unassign - Unassign team and return incident to REPORTED
export async function POST(
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

    const result = await prisma.$transaction(async (tx) => {
      // Free the assigned team if one was assigned
      if (incident.assignedTeamId) {
        await tx.team.update({
          where: { id: incident.assignedTeamId },
          data: {
            status: "AVAILABLE",
            currentIncidentId: null,
          },
        });
      }

      // Reset incident to REPORTED and clear assignment attributes
      const updatedIncident = await tx.incident.update({
        where: { id: incident.id },
        data: {
          assignedTeamId: null,
          status: "REPORTED",
          assignedAt: null,
          distanceKm: null,
          etaMinutes: null,
        },
      });

      return updatedIncident;
    });

    return NextResponse.json({
      success: true,
      message: "Incident unassigned and returned to REPORTED status.",
      incident: result,
    });
  } catch (error) {
    console.error("Unassign failed:", error);
    return NextResponse.json(
      { error: "Failed to unassign response team" },
      { status: 500 }
    );
  }
}

