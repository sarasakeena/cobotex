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
    const { action, note } = body;

    if (!["EN_ROUTE", "ARRIVED", "RESOLVED"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be EN_ROUTE, ARRIVED, or RESOLVED." },
        { status: 400 }
      );
    }

    // Find the active incident this team is assigned to
    let incident = null;
    let isPrimary = false;
    let backupRecord = null;

    if (team.currentIncidentId) {
      incident = await prisma.incident.findUnique({
        where: { id: team.currentIncidentId },
        include: { backupTeams: { where: { releasedAt: null } } },
      });
    }

    if (!incident) {
      incident = await prisma.incident.findFirst({
        where: {
          assignedTeamId: team.id,
          status: { in: ["ASSIGNED", "IN_PROGRESS", "REPORTED", "PENDING"] },
        },
        include: { backupTeams: { where: { releasedAt: null } } },
      });
    }

    if (!incident) {
      backupRecord = await prisma.incidentTeam.findFirst({
        where: {
          teamId: team.id,
          releasedAt: null,
          incident: { status: { not: "RESOLVED" } },
        },
        include: { incident: { include: { backupTeams: { where: { releasedAt: null } } } } },
      });
      if (backupRecord) {
        incident = backupRecord.incident;
      }
    }

    if (!incident || incident.status === "RESOLVED") {
      return NextResponse.json(
        { error: "Team has no active incident to update progress on." },
        { status: 400 }
      );
    }

    isPrimary = incident.assignedTeamId === team.id;
    if (!isPrimary && !backupRecord) {
      backupRecord = incident.backupTeams.find((bt: any) => bt.teamId === team.id);
    }

    const now = new Date();

    if (action === "EN_ROUTE") {
      await prisma.$transaction(async (tx) => {
        if (isPrimary) {
          await tx.incident.update({
            where: { id: incident.id },
            data: { enRouteAt: now },
          });
        } else if (backupRecord) {
          await tx.incidentTeam.update({
            where: { id: backupRecord.id },
            data: { enRouteAt: now },
          });
        }
      });

      return NextResponse.json({
        success: true,
        message: `${team.code} marked en route to incident.`,
        enRouteAt: now,
      });
    }

    if (action === "ARRIVED") {
      await prisma.$transaction(async (tx) => {
        if (isPrimary) {
          await tx.incident.update({
            where: { id: incident.id },
            data: {
              arrivedAt: now,
              status: "IN_PROGRESS", // Primary team arrival advances status to IN_PROGRESS
            },
          });
        } else if (backupRecord) {
          await tx.incidentTeam.update({
            where: { id: backupRecord.id },
            data: { arrivedAt: now },
          });
        }
      });

      return NextResponse.json({
        success: true,
        message: `${team.code} arrived on site. Incident set to IN_PROGRESS.`,
        arrivedAt: now,
      });
    }

    if (action === "RESOLVED") {
      // RESOLVED (from any assigned team): set incident status RESOLVED, resolvedAt, resolutionNote;
      // set ALL teams on that incident (primary and backup) AVAILABLE with currentIncidentId null;
      // mark IncidentTeam rows released. Run in a transaction.
      await prisma.$transaction(async (tx) => {
        // 1. Update incident
        await tx.incident.update({
          where: { id: incident.id },
          data: {
            status: "RESOLVED",
            resolvedAt: now,
            resolutionNote: note?.trim() || `Resolved by ${team.code}`,
          },
        });

        // 2. Free primary team if assigned
        if (incident.assignedTeamId) {
          await tx.team.update({
            where: { id: incident.assignedTeamId },
            data: {
              status: "AVAILABLE",
              currentIncidentId: null,
            },
          });
        }

        // 3. Free all backup teams and release IncidentTeam rows
        const activeBackups = await tx.incidentTeam.findMany({
          where: { incidentId: incident.id, releasedAt: null },
        });

        for (const backup of activeBackups) {
          await tx.team.update({
            where: { id: backup.teamId },
            data: {
              status: "AVAILABLE",
              currentIncidentId: null,
            },
          });

          await tx.incidentTeam.update({
            where: { id: backup.id },
            data: { releasedAt: now },
          });
        }
      });

      return NextResponse.json({
        success: true,
        message: `Incident marked RESOLVED. All response units released back to AVAILABLE.`,
        resolvedAt: now,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Progress update failed:", error);
    return NextResponse.json(
      { error: "Failed to update incident progress" },
      { status: 500 }
    );
  }
}

