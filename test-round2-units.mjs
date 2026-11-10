import { calculatePriority } from "./lib/priority.ts";
import { haversine, rankTeams, SUITABLE_TEAM_CATEGORIES } from "./lib/assignment.ts";

console.log("Testing priority calculation...");
const p1 = calculatePriority({
  severity: "CRITICAL",
  peopleAffected: 15,
  category: "BUILDING_COLLAPSE",
  createdAt: new Date(Date.now() - 25 * 60 * 1000), // 25 mins ago -> +5 pts
  status: "REPORTED",
});
console.log("CRITICAL + 15 people + 25m + BUILDING_COLLAPSE:", p1);
if (p1.score !== 50 + 18 + 5 + 10) throw new Error(`Expected 83, got ${p1.score}`);
if (p1.level !== "P1") throw new Error(`Expected P1, got ${p1.level}`);

const pResolved = calculatePriority({
  severity: "LOW",
  peopleAffected: 0,
  category: "OTHER",
  createdAt: new Date(Date.now() - 100 * 60 * 1000),
  status: "RESOLVED",
});
console.log("Resolved low incident:", pResolved);
if (pResolved.score !== 10 + 0 + 0 + 2) throw new Error(`Expected 12, got ${pResolved.score}`);
if (pResolved.level !== "P4") throw new Error(`Expected P4, got ${pResolved.level}`);

console.log("Testing haversine...");
const dist = haversine(13.0827, 80.2707, 13.0418, 80.2341);
console.log("Distance Chennai Central to T. Nagar:", dist, "km");
if (dist < 4 || dist > 8) throw new Error(`Unexpected distance: ${dist}`);

console.log("Testing rankTeams...");
const incident = {
  category: "FIRE",
  latitude: 13.0418,
  longitude: 80.2341, // T. Nagar
};
const teams = [
  { id: "1", code: "FIRE-01", name: "T Nagar Fire", category: "FIRE", latitude: 13.0418, longitude: 80.2341, status: "AVAILABLE" },
  { id: "2", code: "RESCUE-01", name: "Marina Rescue", category: "RESCUE", latitude: 13.0500, longitude: 80.2824, status: "AVAILABLE" },
  { id: "3", code: "POLICE-01", name: "Police Unit", category: "POLICE", latitude: 13.0418, longitude: 80.2341, status: "AVAILABLE" },
  { id: "4", code: "FIRE-02", name: "Kilpauk Fire", category: "FIRE", latitude: 13.0801, longitude: 80.2405, status: "BUSY" },
];

const ranked = rankTeams(incident, teams);
console.log("Ranked teams for FIRE:", ranked.map(r => ({ code: r.team.code, dist: r.distanceKm, fit: r.fitScore, eta: r.etaMinutes })));
if (ranked.length !== 2) throw new Error(`Expected 2 candidates (FIRE-01 and RESCUE-01), got ${ranked.length}`);
if (ranked[0].team.code !== "FIRE-01") throw new Error(`Expected FIRE-01 first`);
if (ranked[1].team.code !== "RESCUE-01") throw new Error(`Expected RESCUE-01 second`);
if (ranked[1].penaltyKm !== 2) throw new Error(`Expected 2km penalty for RESCUE on FIRE`);

console.log("All unit tests passed!");

