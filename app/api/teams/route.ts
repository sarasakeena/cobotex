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

// GET /api/teams - List all emergency response teams
export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      orderBy: [
        { status: "asc" }, // AVAILABLE first
        { code: "asc" },
      ],
      include: {
        assignedIncidents: {
          where: {
            status: { in: ["ASSIGNED", "IN_PROGRESS"] },
          },
          select: {
            id: true,
            title: true,
            category: true,
            severity: true,
            status: true,
          },
          take: 1,
        },
      },
    });

    const formattedTeams = teams.map((team) => ({
      ...team,
      currentIncident: team.assignedIncidents[0] || null,
    }));

    return NextResponse.json(formattedTeams);
  } catch (error) {
    console.error("Failed to fetch teams:", error);
    return NextResponse.json(
      { error: "Failed to fetch response teams" },
      { status: 500 }
    );
  }
}

// POST /api/teams - Create a new response team
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, name, category, latitude, longitude, address } = body;

    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ error: "Team code is required" }, { status: 400 });
    }
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Team name is required" }, { status: 400 });
    }
    const normalizedCat = (category || "").toUpperCase();
    if (!VALID_TEAM_CATEGORIES.includes(normalizedCat)) {
      return NextResponse.json(
        {
          error: `Category must be one of: ${VALID_TEAM_CATEGORIES.join(", ")}`,
        },
        { status: 400 }
      );
    }
    if (typeof latitude !== "number" || typeof longitude !== "number" || isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: "Valid latitude and longitude coordinates are required" },
        { status: 400 }
      );
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await prisma.team.findUnique({
      where: { code: cleanCode },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Team code '${cleanCode}' is already registered` },
        { status: 400 }
      );
    }

    const team = await prisma.team.create({
      data: {
        code: cleanCode,
        name: name.trim(),
        category: normalizedCat,
        latitude,
        longitude,
        address: address?.trim() || null,
        status: "AVAILABLE",
      },
    });

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    console.error("Failed to create team:", error);
    return NextResponse.json(
      { error: "Failed to create response team" },
      { status: 500 }
    );
  }
}

