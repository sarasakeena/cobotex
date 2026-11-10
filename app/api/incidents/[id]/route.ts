import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateSeverity } from "@/lib/severity";
import { calculatePriority } from "@/lib/priority";

export const dynamic = "force-dynamic";

const VALID_STATUSES = [
  "REPORTED",
  "PENDING",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
];

// GET /api/incidents/[id] - Include primary team, backup teams, and backup requests
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        assignedTeam: true,
        backupTeams: {
          include: {
            team: true,
          },
        },
        backupRequests: {
          include: {
            requestingTeam: {
              select: { id: true, code: true, name: true, category: true, memberCount: true },
            },
            incidentTeams: {
              include: {
                team: {
                  select: { id: true, code: true, name: true, category: true, memberCount: true },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!incident) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      );
    }

    let parsedTags: string[] = [];
    try {
      if (incident.tags) {
        parsedTags = JSON.parse(incident.tags);
      }
    } catch {
      parsedTags = [];
    }

    // Compute severity reasons dynamically for full transparency
    const severityResult = calculateSeverity({
      category: incident.category,
      peopleAffected: incident.peopleAffected,
      tags: parsedTags,
      title: incident.title,
      description: incident.description,
    });

    // Compute read-time priority dynamically
    const priorityResult = calculatePriority({
      severity: incident.severity,
      peopleAffected: incident.peopleAffected,
      category: incident.category,
      createdAt: incident.createdAt,
      status: incident.status,
    });

    return NextResponse.json({
      ...incident,
      tags: parsedTags,
      severityScore: severityResult.score,
      severityReasons: severityResult.reasons,
      priority: priorityResult,
    });
  } catch (error) {
    console.error("Failed to retrieve incident:", error);
    return NextResponse.json(
      { error: "Failed to retrieve incident" },
      { status: 500 }
    );
  }
}

// PATCH /api/incidents/[id] - Update status with operational tracking rules & reopening logic
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, resolutionNote } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          error: "Invalid status value",
          validStatuses: VALID_STATUSES,
        },
        { status: 400 }
      );
    }

    const existing = await prisma.incident.findUnique({
      where: { id },
      include: {
        assignedTeam: true,
        backupTeams: { where: { releasedAt: null } },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      );
    }

    // Rule: ASSIGNED is set only through assignment endpoint
    if (status === "ASSIGNED" && existing.status !== "ASSIGNED") {
      return NextResponse.json(
        {
          error:
            "ASSIGNED status can only be set through response team assignment. Please use the response team assignment action.",
        },
        { status: 400 }
      );
    }

    // Reopening resolved incident to IN_PROGRESS
    if (existing.status === "RESOLVED" && status === "IN_PROGRESS") {
      if (!existing.assignedTeamId) {
        return NextResponse.json(
          {
            error:
              "Cannot reopen incident without an assigned team. Please assign a response team first.",
          },
          { status: 400 }
        );
      }

      const primaryTeam = await prisma.team.findUnique({
        where: { id: existing.assignedTeamId },
      });

      if (!primaryTeam || primaryTeam.status !== "AVAILABLE") {
        return NextResponse.json(
          {
            error: `Primary team ${primaryTeam?.code || ""} is currently busy with another incident. Please reassign an available team before reopening.`,
          },
          { status: 409 }
        );
      }

      // Reopen in transaction
      const reopened = await prisma.$transaction(async (tx) => {
        await tx.team.update({
          where: { id: primaryTeam.id },
          data: { status: "BUSY", currentIncidentId: existing.id },
        });

        return await tx.incident.update({
          where: { id },
          data: {
            status: "IN_PROGRESS",
            resolvedAt: null,
            resolutionNote: null,
          },
          include: { assignedTeam: true, backupTeams: { include: { team: true } } },
        });
      });

      return NextResponse.json(reopened);
    }

    // Rule: Moving to IN_PROGRESS requires an assigned team (clear error otherwise)
    if (status === "IN_PROGRESS" && !existing.assignedTeamId) {
      return NextResponse.json(
        {
          error:
            "Cannot move incident to IN_PROGRESS without an assigned response team. Please assign a team first.",
        },
        { status: 400 }
      );
    }

    // Run status update in transaction with team state syncing
    const updated = await prisma.$transaction(async (tx) => {
      const now = new Date();

      // Rule: RESOLVED frees ALL teams on that incident (primary and backup)
      if (status === "RESOLVED") {
        if (existing.assignedTeamId) {
          await tx.team.update({
            where: { id: existing.assignedTeamId },
            data: {
              status: "AVAILABLE",
              currentIncidentId: null,
            },
          });
        }

        // Free backup teams
        for (const backup of existing.backupTeams) {
          await tx.team.update({
            where: { id: backup.teamId },
            data: { status: "AVAILABLE", currentIncidentId: null },
          });

          await tx.incidentTeam.update({
            where: { id: backup.id },
            data: { releasedAt: now },
          });
        }

        return await tx.incident.update({
          where: { id },
          data: {
            status: "RESOLVED",
            resolvedAt: now,
            resolutionNote: resolutionNote || existing.resolutionNote || "Resolved by command operator",
          },
          include: { assignedTeam: true, backupTeams: { include: { team: true } } },
        });
      }

      // Rule: Moving back to REPORTED unassigns primary and backup teams
      if (status === "REPORTED") {
        if (existing.assignedTeamId) {
          await tx.team.update({
            where: { id: existing.assignedTeamId },
            data: {
              status: "AVAILABLE",
              currentIncidentId: null,
            },
          });
        }

        for (const backup of existing.backupTeams) {
          await tx.team.update({
            where: { id: backup.teamId },
            data: { status: "AVAILABLE", currentIncidentId: null },
          });

          await tx.incidentTeam.update({
            where: { id: backup.id },
            data: { releasedAt: now },
          });
        }

        return await tx.incident.update({
          where: { id },
          data: {
            status: "REPORTED",
            assignedTeamId: null,
            assignedAt: null,
            enRouteAt: null,
            arrivedAt: null,
            resolvedAt: null,
            distanceKm: null,
            etaMinutes: null,
          },
          include: { assignedTeam: true, backupTeams: { include: { team: true } } },
        });
      }

      // Standard status update
      return await tx.incident.update({
        where: { id },
        data: {
          status: status as any,
        },
        include: { assignedTeam: true, backupTeams: { include: { team: true } } },
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update incident:", error);
    return NextResponse.json(
      { error: "Failed to update incident status" },
      { status: 500 }
    );
  }
}

// DELETE /api/incidents/[id]
// Deleting an incident frees its primary and backup teams
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const existing = await prisma.incident.findUnique({
      where: { id },
      include: { backupTeams: { where: { releasedAt: null } } },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Free primary team if assigned
      if (existing.assignedTeamId) {
        await tx.team.update({
          where: { id: existing.assignedTeamId },
          data: {
            status: "AVAILABLE",
            currentIncidentId: null,
          },
        });
      }

      // Free backup teams
      for (const backup of existing.backupTeams) {
        await tx.team.update({
          where: { id: backup.teamId },
          data: {
            status: "AVAILABLE",
            currentIncidentId: null,
          },
        });
      }

      // Delete incident (cascades IncidentTeam and BackupRequest)
      await tx.incident.delete({
        where: { id },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Incident report deleted successfully and all response teams released",
    });
  } catch (error) {
    console.error("Failed to delete incident:", error);
    return NextResponse.json(
      { error: "Failed to delete incident" },
      { status: 500 }
    );
  }
}
