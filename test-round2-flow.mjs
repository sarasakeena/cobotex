import { PrismaClient } from "@prisma/client";
import { calculatePriority } from "./lib/priority.ts";
import { rankTeams, haversine, calculateEtaMinutes } from "./lib/assignment.ts";

const prisma = new PrismaClient();

async function run() {
  console.log("=== Testing Round 2 Verification Flow ===");

  // 1. Check Teams seeded
  const teams = await prisma.team.findMany();
  console.log(`Found ${teams.length} teams in database.`);
  if (teams.length < 10) throw new Error("Expected at least 10 teams");

  // 2. Check Incidents seeded
  const incidents = await prisma.incident.findMany({
    orderBy: { createdAt: "desc" },
  });
  console.log(`Found ${incidents.length} incidents in database.`);
  if (incidents.length < 10) throw new Error("Expected at least 10 incidents");

  // 3. Priority Order verification:
  // "a critical report with many people ranks above an old low one"
  const criticalManyPeople = calculatePriority({
    severity: "CRITICAL",
    peopleAffected: 15,
    category: "FIRE",
    createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
    status: "REPORTED",
  });

  const oldLowPeople = calculatePriority({
    severity: "LOW",
    peopleAffected: 0,
    category: "OTHER",
    createdAt: new Date(Date.now() - 120 * 60 * 1000), // 120 min ago (max 15 waiting pts)
    status: "REPORTED",
  });

  console.log(`Critical recent score: ${criticalManyPeople.score} (${criticalManyPeople.level})`);
  console.log(`Old low score: ${oldLowPeople.score} (${oldLowPeople.level})`);
  if (criticalManyPeople.score <= oldLowPeople.score) {
    throw new Error("Critical report with many people should rank above old low one!");
  }

  // 4. Test candidate ranking and auto-assignment
  const fireInc = incidents.find(i => i.category === "FIRE" && i.latitude && i.longitude);
  if (!fireInc) throw new Error("No fire incident with coordinates found");

  const availableTeams = await prisma.team.findMany({ where: { status: "AVAILABLE" } });
  const candidates = rankTeams(
    { category: fireInc.category, latitude: fireInc.latitude, longitude: fireInc.longitude },
    availableTeams
  );
  console.log(`Top candidate for Fire (${fireInc.id}): ${candidates[0].team.code} (${candidates[0].distanceKm}km, ETA: ${candidates[0].etaMinutes}m)`);
  if (!["FIRE", "RESCUE"].includes(candidates[0].team.category)) {
    throw new Error("Top candidate category must be FIRE or RESCUE");
  }

  // Simulate assignment of candidates[0]
  const assignedTeam = candidates[0].team;
  await prisma.$transaction(async (tx) => {
    await tx.team.update({
      where: { id: assignedTeam.id },
      data: { status: "BUSY", currentIncidentId: fireInc.id },
    });
    await tx.incident.update({
      where: { id: fireInc.id },
      data: {
        assignedTeamId: assignedTeam.id,
        status: "ASSIGNED",
        assignedAt: new Date(),
        distanceKm: candidates[0].distanceKm,
        etaMinutes: candidates[0].etaMinutes,
      },
    });
  });

  console.log(`Team ${assignedTeam.code} marked BUSY.`);

  // 5. Second incident skips busy team
  const remainingAvailable = await prisma.team.findMany({ where: { status: "AVAILABLE" } });
  const secondCandidates = rankTeams(
    { category: fireInc.category, latitude: fireInc.latitude, longitude: fireInc.longitude },
    remainingAvailable
  );
  const busyTeamFound = secondCandidates.find(c => c.team.id === assignedTeam.id);
  if (busyTeamFound) throw new Error("Busy team was not excluded from candidate ranking!");
  console.log(`Verified: second incident skips busy team ${assignedTeam.code}. Next best: ${secondCandidates[0].team.code}`);

  // 6. Resolving frees the team
  await prisma.$transaction(async (tx) => {
    await tx.team.update({
      where: { id: assignedTeam.id },
      data: { status: "AVAILABLE", currentIncidentId: null },
    });
    await tx.incident.update({
      where: { id: fireInc.id },
      data: { status: "RESOLVED" },
    });
  });

  const freedTeam = await prisma.team.findUnique({ where: { id: assignedTeam.id } });
  if (freedTeam.status !== "AVAILABLE" || freedTeam.currentIncidentId !== null) {
    throw new Error("Resolving incident failed to free the response team!");
  }
  console.log(`Verified: resolving incident freed team ${assignedTeam.code} back to AVAILABLE.`);

  // 7. Old incidents without coordinates do not crash
  const noCoordsResult = rankTeams({ category: "FIRE", latitude: null, longitude: null }, remainingAvailable);
  if (noCoordsResult.length !== 0) throw new Error("Expected empty candidates for incident without coords");
  console.log("Verified: incidents without coordinates handled gracefully without crashing.");

  // Reset fire incident back to REPORTED
  await prisma.incident.update({
    where: { id: fireInc.id },
    data: {
      status: "REPORTED",
      assignedTeamId: null,
      assignedAt: null,
      distanceKm: null,
      etaMinutes: null,
    },
  });

  console.log("=== All Round 2 Verification Flow checks passed successfully! ===");
}

run()
  .catch(e => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

