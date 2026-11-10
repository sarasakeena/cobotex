import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signTeamToken, COOKIE_NAME } from "@/lib/teamAuth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, pin } = body;

    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ error: "Team code is required" }, { status: 400 });
    }
    if (!pin || typeof pin !== "string" || !pin.trim()) {
      return NextResponse.json({ error: "Team PIN is required" }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const cleanPin = pin.trim();

    const team = await prisma.team.findUnique({
      where: { code: cleanCode },
    });

    if (!team) {
      return NextResponse.json(
        { error: `Team with code '${cleanCode}' not found.` },
        { status: 404 }
      );
    }

    if (team.pin !== cleanPin) {
      return NextResponse.json(
        { error: "Invalid PIN. (Demo PIN: 1234)" },
        { status: 401 }
      );
    }

    // Generate session token
    const token = signTeamToken({ teamId: team.id, code: team.code });

    const response = NextResponse.json({
      success: true,
      message: `Authenticated as ${team.code} (${team.name})`,
      team: {
        id: team.id,
        code: team.code,
        name: team.name,
        category: team.category,
        status: team.status,
      },
    });

    // Set signed httpOnly cookie
    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error) {
    console.error("Team login failed:", error);
    return NextResponse.json(
      { error: "Internal server error during team login" },
      { status: 500 }
    );
  }
}
