import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/backup-requests - List active backup requests
export async function GET() {
  try {
    const requests = await prisma.backupRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        requestingTeam: {
          select: {
            id: true,
            code: true,
            name: true,
            category: true,
            latitude: true,
            longitude: true,
            memberCount: true,
          },
        },
        incident: {
          select: {
            id: true,
            title: true,
            category: true,
            severity: true,
            location: true,
            latitude: true,
            longitude: true,
            status: true,
            assignedTeamId: true,
          },
        },
        incidentTeams: {
          include: {
            team: {
              select: { id: true, code: true, name: true, category: true, memberCount: true },
            },
          },
        },
      },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Failed to fetch backup requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch backup requests" },
      { status: 500 }
    );
  }
}
