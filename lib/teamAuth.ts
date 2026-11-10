import { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const AUTH_SECRET = process.env.TEAM_AUTH_SECRET || "crisis-pulse-emergency-team-secret-key-2026";
const COOKIE_NAME = "team_session";

export interface TeamSessionPayload {
  teamId: string;
  code: string;
  exp: number;
}

/**
 * Creates a tamper-proof HMAC signed token
 */
export function signTeamToken(payload: Omit<TeamSessionPayload, "exp">, expiresInHours = 24): string {
  const exp = Math.floor(Date.now() / 1000) + expiresInHours * 3600;
  const fullPayload: TeamSessionPayload = { ...payload, exp };
  const jsonStr = JSON.stringify(fullPayload);
  const base64Payload = Buffer.from(jsonStr).toString("base64url");
  const signature = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(base64Payload)
    .digest("base64url");

  return `${base64Payload}.${signature}`;
}

/**
 * Verifies HMAC signed token
 */
export function verifyTeamToken(token: string): TeamSessionPayload | null {
  try {
    const [base64Payload, signature] = token.split(".");
    if (!base64Payload || !signature) return null;

    const expectedSignature = crypto
      .createHmac("sha256", AUTH_SECRET)
      .update(base64Payload)
      .digest("base64url");

    // Timing-safe comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const payload: TeamSessionPayload = JSON.parse(
      Buffer.from(base64Payload, "base64url").toString()
    );

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Extracts authenticated team from NextRequest cookie
 */
export async function getAuthenticatedTeam(request: NextRequest) {
  const cookie = request.cookies.get(COOKIE_NAME);
  if (!cookie || !cookie.value) return null;

  const session = verifyTeamToken(cookie.value);
  if (!session) return null;

  const team = await prisma.team.findUnique({
    where: { id: session.teamId },
  });

  return team;
}

export { COOKIE_NAME };
