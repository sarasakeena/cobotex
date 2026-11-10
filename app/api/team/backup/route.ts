import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedTeam } from "@/lib/teamAuth";

export async function POST(request: NextRequest) {
  try {
    const team = await getAuthenticatedTeam(request);
    if (!team) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const body = await request.json();
    const { peopleNeeded, teamType, note } = body;

    const people = parseInt(String(peopleNeeded), 10);
    if (isNaN(people) || people <= 0) {
      return NextResponse.json(
        { error: "Number of personnel needed must be greater than 0" },
        { status: 400 }
      );
    }

    // Find active incident
    let incidentId = team.currentIncidentId;
    if (!incidentId) {
      const activeInc = await prisma.incident.findFirst({
        where: {
          assignedTeamId: team.id,
          status: { in: ["ASSIGNED", "IN_PROGRESS"] },
        },
      });
      if (activeInc) incidentId = activeInc.id;
    }

    if (!incidentId) {
      const backupInc = await prisma.incidentTeam.findFirst({
        where: { teamId: team.id, releasedAt: null },
      });
      if (backupInc) incidentId = backupInc.incidentId;
    }

    if (!incidentId) {
      return NextResponse.json(
        { error: "Team is not assigned to an active incident." },
        { status: 400 }
      );
    }

    // Rule: Only one pending request per team per incident
    const existingPending = await prisma.backupRequest.findFirst({
      where: {
        incidentId,
        teamId: team.id,
        status: "PENDING",
      },
    });

    if (existingPending) {
      return NextResponse.json(
        {
          error:
            "A pending backup request is already active for this unit on this incident.",
        },
        { status: 400 }
      );
    }

    const backupRequest = await prisma.backupRequest.create({
      data: {
        incidentId,
        teamId: team.id,
        peopleNeeded: people,
        teamType: teamType ? teamType.toUpperCase() : null,
        note: note?.trim() || null,
        status: "PENDING",
      },
      include: {
        requestingTeam: {
          select: { id: true, code: true, name: true, category: true },
        },
        incident: {
          select: { id: true, title: true, location: true },
        },
      },
    });

    return NextResponse.json(backupRequest, { status: 201 });
  } catch (error) {
    console.error("Backup request creation failed:", error);
    return NextResponse.json(
      { error: "Failed to create backup request" },
      { status: 500 }
    );
  }
}
