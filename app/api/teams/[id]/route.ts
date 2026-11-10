import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const VALID_TEAM_CATEGORIES = [
  "FIRE",
  "MEDICAL",
  "RESCUE",
  "POLICE",
  "DISASTER",
];

// GET /api/teams/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        assignedIncidents: {
          where: {
            status: { in: ["ASSIGNED", "IN_PROGRESS"] },
          },
          take: 1,
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...team,
      currentIncident: team.assignedIncidents[0] || null,
    });
  } catch (error) {
    console.error("Failed to fetch team:", error);
    return NextResponse.json(
      { error: "Failed to fetch response team" },
      { status: 500 }
    );
  }
}

// PATCH /api/teams/[id] - Update team details or toggle availability
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, category, latitude, longitude, address, status } = body;

    const existing = await prisma.team.findUnique({
      where: { id },
      include: {
        assignedIncidents: {
          where: { status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
          take: 1,
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const hasActiveAssignment =
      existing.currentIncidentId !== null ||
      existing.assignedIncidents.length > 0;

    // Check manual status toggle constraint
    if (status && status !== existing.status) {
      if (hasActiveAssignment) {
        return NextResponse.json(
          {
            error:
              "Manual availability cannot be changed while team is assigned to an active incident.",
          },
          { status: 400 }
        );
      }
      if (!["AVAILABLE", "BUSY"].includes(status)) {
        return NextResponse.json(
          { error: "Status must be either AVAILABLE or BUSY" },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (name && typeof name === "string") updateData.name = name.trim();
    if (category) {
      const normCat = category.toUpperCase();
      if (!VALID_TEAM_CATEGORIES.includes(normCat)) {
        return NextResponse.json(
          { error: `Invalid category. Must be one of: ${VALID_TEAM_CATEGORIES.join(", ")}` },
          { status: 400 }
        );
      }
      updateData.category = normCat;
    }
    if (typeof latitude === "number" && !isNaN(latitude)) updateData.latitude = latitude;
    if (typeof longitude === "number" && !isNaN(longitude)) updateData.longitude = longitude;
    if (address !== undefined) updateData.address = address?.trim() || null;
    if (status) updateData.status = status;

    const updated = await prisma.team.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update team:", error);
    return NextResponse.json(
      { error: "Failed to update response team" },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/[id]
// If team is assigned, unassign its incident first (set it back to REPORTED)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const existing = await prisma.team.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Unassign any incidents currently linked to this team
      await tx.incident.updateMany({
        where: { assignedTeamId: id },
        data: {
          assignedTeamId: null,
          status: "REPORTED",
          assignedAt: null,
          distanceKm: null,
          etaMinutes: null,
        },
      });

      // Delete the team
      await tx.team.delete({
        where: { id },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Team ${existing.code} deleted and associated incidents unassigned`,
    });
  } catch (error) {
    console.error("Failed to delete team:", error);
    return NextResponse.json(
      { error: "Failed to delete response team" },
      { status: 500 }
    );
  }
}

