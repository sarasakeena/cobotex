import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rankTeams, haversine, calculateEtaMinutes } from "@/lib/assignment";
import { logEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

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
      body = {};
    }
    const { teamIds } = body;

    const backupReq = await prisma.backupRequest.findUnique({
      where: { id },
      include: {
        incident: {
          include: {
            backupTeams: { where: { releasedAt: null } },
          },
        },
        requestingTeam: true,
      },
    });

    if (!backupReq) {
      return NextResponse.json({ error: "Backup request not found" }, { status: 404 });
    }

    if (backupReq.status !== "PENDING") {
      return NextResponse.json(
        { error: `Backup request is already ${backupReq.status}` },
        { status: 400 }
      );
    }

    const incident = backupReq.incident;

    // Collect teams already assigned to this incident to exclude them
    const excludedTeamIds = new Set<string>();
    if (incident.assignedTeamId) excludedTeamIds.add(incident.assignedTeamId);
    excludedTeamIds.add(backupReq.teamId);
    incident.backupTeams.forEach((bt) => excludedTeamIds.add(bt.teamId));

    const result = await prisma.$transaction(async (tx) => {
      let selectedTeams: any[] = [];

      if (Array.isArray(teamIds) && teamIds.length > 0) {
        // Manual admin selection
        selectedTeams = await tx.team.findMany({
          where: { id: { in: teamIds } },
        });

        for (const t of selectedTeams) {
          if (t.status !== "AVAILABLE") {
            throw new Error(`TEAM_UNAVAILABLE:${t.code}`);
          }
        }
      } else {
        // Auto-fulfill: rank available suitable teams until memberCount covers peopleNeeded
        let availableTeams = await tx.team.findMany({
          where: {
            status: "AVAILABLE",
            id: { notIn: Array.from(excludedTeamIds) },
          },
        });

        if (backupReq.teamType) {
          const typeUpper = backupReq.teamType.toUpperCase();
          const filtered = availableTeams.filter((t) => t.category === typeUpper);
          // If type specified, prioritize matching type, else fallback to all available
          if (filtered.length > 0) {
            availableTeams = filtered;
          }
        }

        const effectiveCategory = backupReq.teamType || incident.category;
        const ranked = rankTeams(
          {
            category: effectiveCategory,
            latitude: incident.latitude,
            longitude: incident.longitude,
          },
          availableTeams
        );

        if (ranked.length === 0) {
          throw new Error("NO_AVAILABLE_TEAMS");
        }

        let accumulatedPeople = 0;
        for (const candidate of ranked) {
          selectedTeams.push(candidate.team);
          accumulatedPeople += candidate.team.memberCount || 4;
          if (accumulatedPeople >= backupReq.peopleNeeded) {
            break;
          }
        }
      }

      // Assign each selected team
      const now = new Date();
      const chosenTeamIds: string[] = [];
      let totalMembersCovered = 0;

      for (const t of selectedTeams) {
        let distanceKm: number | null = null;
        let etaMinutes: number | null = null;

        if (
          typeof incident.latitude === "number" &&
          typeof incident.longitude === "number" &&
          typeof t.latitude === "number" &&
          typeof t.longitude === "number"
        ) {
          distanceKm = haversine(incident.latitude, incident.longitude, t.latitude, t.longitude);
          etaMinutes = calculateEtaMinutes(distanceKm);
        }

        // Create IncidentTeam record
        await tx.incidentTeam.create({
          data: {
            incidentId: incident.id,
            teamId: t.id,
            requestId: backupReq.id,
            assignedAt: now,
            distanceKm,
            etaMinutes,
          },
        });

        // Mark team as BUSY with this incident
        await tx.team.update({
          where: { id: t.id },
          data: {
            status: "BUSY",
            currentIncidentId: incident.id,
          },
        });

        chosenTeamIds.push(t.id);
        totalMembersCovered += t.memberCount || 4;
      }

      // Mark backup request as FULFILLED
      const updatedReq = await tx.backupRequest.update({
        where: { id: backupReq.id },
        data: {
          status: "FULFILLED",
          resolvedAt: now,
          fulfilledTeamIds: JSON.stringify(chosenTeamIds),
        },
        include: {
          incidentTeams: {
            include: { team: true },
          },
        },
      });

      return {
        updatedReq,
        selectedTeams,
        totalMembersCovered,
        peopleNeeded: backupReq.peopleNeeded,
      };
    });

    await logEvent(
      incident.id,
      "BACKUP_ASSIGNED",
      "Additional help is on the way.",
      `Backup assigned: dispatched ${result.selectedTeams.map((t: any) => t.code).join(", ")} (${result.totalMembersCovered} personnel dispatched).`
    );

    const isShort = result.totalMembersCovered < result.peopleNeeded;
    const shortCount = result.peopleNeeded - result.totalMembersCovered;
    const message = isShort
      ? `Backup request partially fulfilled with ${result.selectedTeams.length} unit(s) (${result.totalMembersCovered} personnel). Note: ${shortCount} personnel short of request.`
      : `Backup request fully fulfilled with ${result.selectedTeams.length} unit(s) (${result.totalMembersCovered} personnel).`;

    return NextResponse.json({
      success: true,
      message,
      isShort,
      shortCount: isShort ? shortCount : 0,
      backupRequest: result.updatedReq,
      assignedTeams: result.selectedTeams,
    });
  } catch (error: any) {
    if (error.message?.startsWith("TEAM_UNAVAILABLE:")) {
      const code = error.message.split(":")[1];
      return NextResponse.json(
        { error: `Team ${code} is no longer available` },
        { status: 409 }
      );
    }
    if (error.message === "NO_AVAILABLE_TEAMS") {
      return NextResponse.json(
        { error: "No available candidate teams found to fulfill backup request." },
        { status: 409 }
      );
    }

    console.error("Backup fulfillment failed:", error);
    return NextResponse.json(
      { error: "Failed to fulfill backup request" },
      { status: 500 }
    );
  }
}

