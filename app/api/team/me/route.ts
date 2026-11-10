import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedTeam } from "@/lib/teamAuth";
import { calculatePriority } from "@/lib/priority";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const team = await getAuthenticatedTeam(request);
    if (!team) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    // 1. Check if team is assigned as primary team on an active incident
    let activeIncident: any = null;
    let assignmentRole: "PRIMARY" | "BACKUP" | null = null;
    let incidentTeamRecord: any = null;

    if (team.currentIncidentId) {
      activeIncident = await prisma.incident.findUnique({
        where: { id: team.currentIncidentId },
        include: {
          assignedTeam: true,
          backupTeams: {
            where: { releasedAt: null },
            include: { team: true },
          },
          backupRequests: {
            where: { status: "PENDING" },
            include: { requestingTeam: true },
          },
        },
      });

      if (activeIncident && activeIncident.status !== "RESOLVED") {
        assignmentRole = activeIncident.assignedTeamId === team.id ? "PRIMARY" : "BACKUP";
        if (assignmentRole === "BACKUP") {
          incidentTeamRecord = activeIncident.backupTeams.find(
            (bt: any) => bt.teamId === team.id
          );
        }
      } else {
        activeIncident = null;
      }
    }

    // Fallback: check if primary on any unresolved incident
    if (!activeIncident) {
      const primaryInc = await prisma.incident.findFirst({
        where: {
          assignedTeamId: team.id,
          status: { in: ["ASSIGNED", "IN_PROGRESS", "PENDING", "REPORTED"] },
        },
        include: {
          assignedTeam: true,
          backupTeams: {
            where: { releasedAt: null },
            include: { team: true },
          },
          backupRequests: {
            where: { status: "PENDING" },
            include: { requestingTeam: true },
          },
        },
      });

      if (primaryInc) {
        activeIncident = primaryInc;
        assignmentRole = "PRIMARY";
      }
    }

    // Fallback: check if active backup on any unresolved incident
    if (!activeIncident) {
      const backupLink = await prisma.incidentTeam.findFirst({
        where: {
          teamId: team.id,
          releasedAt: null,
          incident: {
            status: { not: "RESOLVED" },
          },
        },
        include: {
          incident: {
            include: {
              assignedTeam: true,
              backupTeams: {
                where: { releasedAt: null },
                include: { team: true },
              },
              backupRequests: {
                where: { status: "PENDING" },
                include: { requestingTeam: true },
              },
            },
          },
        },
      });

      if (backupLink && backupLink.incident) {
        activeIncident = backupLink.incident;
        assignmentRole = "BACKUP";
        incidentTeamRecord = backupLink;
      }
    }

    // Pending backup requests for this incident or requested by this team
    let pendingBackupRequests: any[] = [];
    if (activeIncident) {
      pendingBackupRequests = await prisma.backupRequest.findMany({
        where: {
          incidentId: activeIncident.id,
          status: "PENDING",
        },
        include: {
          requestingTeam: {
            select: { id: true, code: true, name: true, category: true },
          },
        },
      });
    }

    // Compute priority if active incident exists
    let priority: any = null;
    if (activeIncident) {
      priority = calculatePriority({
        severity: activeIncident.severity,
        peopleAffected: activeIncident.peopleAffected,
        category: activeIncident.category,
        createdAt: activeIncident.createdAt,
        status: activeIncident.status,
      });
    }

    return NextResponse.json({
      team: {
        id: team.id,
        code: team.code,
        name: team.name,
        category: team.category,
        status: team.status,
        latitude: team.latitude,
        longitude: team.longitude,
        speedKmh: team.speedKmh,
        lastLocationAt: team.lastLocationAt,
        memberCount: team.memberCount,
      },
      currentIncident: activeIncident
        ? {
            ...activeIncident,
            priority,
            assignmentRole,
            incidentTeamRecord,
          }
        : null,
      pendingBackupRequests,
    });
  } catch (error) {
    console.error("Failed to fetch team me details:", error);
    return NextResponse.json(
      { error: "Internal server error fetching team status" },
      { status: 500 }
    );
  }
}

