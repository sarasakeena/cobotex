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

// GET /api/incidents/[id]
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

// PATCH /api/incidents/[id] - Update status with operational tracking rules
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status } = body;

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
      include: { assignedTeam: true },
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
      // Rule: RESOLVED frees the team (AVAILABLE, currentIncidentId null) but keeps assignment details on incident
      if (status === "RESOLVED" && existing.assignedTeamId) {
        await tx.team.update({
          where: { id: existing.assignedTeamId },
          data: {
            status: "AVAILABLE",
            currentIncidentId: null,
          },
        });
      }

      // Rule: Moving back to REPORTED unassigns
      if (status === "REPORTED" && existing.assignedTeamId) {
        await tx.team.update({
          where: { id: existing.assignedTeamId },
          data: {
            status: "AVAILABLE",
            currentIncidentId: null,
          },
        });

        return await tx.incident.update({
          where: { id },
          data: {
            status: "REPORTED",
            assignedTeamId: null,
            assignedAt: null,
            distanceKm: null,
            etaMinutes: null,
          },
          include: { assignedTeam: true },
        });
      }

      // Standard status update
      return await tx.incident.update({
        where: { id },
        data: {
          status: status as any,
        },
        include: { assignedTeam: true },
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
// Deleting an incident frees its team
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const existing = await prisma.incident.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Free team if assigned
      if (existing.assignedTeamId) {
        await tx.team.update({
          where: { id: existing.assignedTeamId },
          data: {
            status: "AVAILABLE",
            currentIncidentId: null,
          },
        });
      }

      // Delete incident
      await tx.incident.delete({
        where: { id },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Incident report deleted successfully and response team released",
    });
  } catch (error) {
    console.error("Failed to delete incident:", error);
    return NextResponse.json(
      { error: "Failed to delete incident" },
      { status: 500 }
    );
  }
}
