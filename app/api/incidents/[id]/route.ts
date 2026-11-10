import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateSeverity } from "@/lib/severity";

const VALID_STATUSES = ["REPORTED", "PENDING", "IN_PROGRESS", "RESOLVED"];

// GET /api/incidents/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const incident = await prisma.incident.findUnique({
      where: { id },
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

    // Compute severity reasons dynamically for full transparency including tags
    const severityResult = calculateSeverity({
      category: incident.category,
      peopleAffected: incident.peopleAffected,
      tags: parsedTags,
      title: incident.title,
      description: incident.description,
    });

    return NextResponse.json({
      ...incident,
      tags: parsedTags,
      severityScore: severityResult.score,
      severityReasons: severityResult.reasons,
    });
  } catch (error) {
    console.error("Failed to retrieve incident:", error);
    return NextResponse.json(
      { error: "Failed to retrieve incident" },
      { status: 500 }
    );
  }
}

// PATCH /api/incidents/[id] - Update status
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
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.incident.update({
      where: { id },
      data: {
        status: status as any,
      },
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

    await prisma.incident.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Incident report deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete incident:", error);
    return NextResponse.json(
      { error: "Failed to delete incident" },
      { status: 500 }
    );
  }
}
