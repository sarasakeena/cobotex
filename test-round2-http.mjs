const BASE_URL = "http://localhost:3000";

async function run() {
  console.log("=== Running Round 2 HTTP E2E Verification ===");

  // 1. GET /api/stats
  console.log("1. Testing GET /api/stats...");
  const statsRes = await fetch(`${BASE_URL}/api/stats`);
  if (!statsRes.ok) throw new Error(`GET /api/stats failed: ${statsRes.status}`);
  const stats = await statsRes.json();
  console.log("Stats response:", {
    total: stats.total,
    critical: stats.critical,
    availableTeams: stats.availableTeams,
    busyTeams: stats.busyTeams,
    assignedIncidents: stats.assignedIncidents,
    resolvedIncidents: stats.resolvedIncidents,
    categoryCount: stats.byCategory.length,
    statusCount: stats.byStatus.length,
  });
  if (typeof stats.availableTeams !== "number" || typeof stats.busyTeams !== "number") {
    throw new Error("Stats missing availableTeams or busyTeams");
  }

  // 2. GET /api/teams
  console.log("2. Testing GET /api/teams...");
  const teamsRes = await fetch(`${BASE_URL}/api/teams`);
  if (!teamsRes.ok) throw new Error(`GET /api/teams failed: ${teamsRes.status}`);
  const teams = await teamsRes.json();
  console.log(`Fetched ${teams.length} teams.`);
  if (teams.length < 10) throw new Error("Expected at least 10 response teams");

  // 3. POST /api/teams
  console.log("3. Testing POST /api/teams (deploy new unit)...");
  const newTeamRes = await fetch(`${BASE_URL}/api/teams`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: "TEST-01",
      name: "Test Rapid Unit",
      category: "FIRE",
      latitude: 13.0800,
      longitude: 80.2400,
      address: "Kilpauk Test Station",
    }),
  });
  if (!newTeamRes.ok) {
    const err = await newTeamRes.json();
    throw new Error(`POST /api/teams failed: ${err.error}`);
  }
  const createdTeam = await newTeamRes.json();
  console.log(`Created team ${createdTeam.code} (${createdTeam.id})`);

  // 4. PATCH /api/teams/[id] (manual toggle availability)
  console.log("4. Testing PATCH /api/teams/[id] availability toggle...");
  const patchTeamRes = await fetch(`${BASE_URL}/api/teams/${createdTeam.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "BUSY" }),
  });
  if (!patchTeamRes.ok) throw new Error("Failed to set team to BUSY");
  const busyTeam = await patchTeamRes.json();
  if (busyTeam.status !== "BUSY") throw new Error("Team status was not updated to BUSY");

  // Toggle back to AVAILABLE
  await fetch(`${BASE_URL}/api/teams/${createdTeam.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "AVAILABLE" }),
  });

  // 5. GET /api/incidents (priority sorting & ranking)
  console.log("5. Testing GET /api/incidents priority sorting...");
  const incidentsRes = await fetch(`${BASE_URL}/api/incidents`);
  if (!incidentsRes.ok) throw new Error(`GET /api/incidents failed: ${incidentsRes.status}`);
  const incidents = await incidentsRes.json();
  console.log(`Fetched ${incidents.length} incidents.`);
  
  // Verify unresolved incidents are sorted descending by priority score
  const unresolved = incidents.filter(i => i.status !== "RESOLVED");
  for (let i = 0; i < unresolved.length - 1; i++) {
    if (unresolved[i].priority.score < unresolved[i + 1].priority.score) {
      throw new Error(`Priority sort order violation: index ${i} score ${unresolved[i].priority.score} < index ${i+1} score ${unresolved[i+1].priority.score}`);
    }
  }
  console.log(`Top #1 incident: "${unresolved[0].title}" (Score: ${unresolved[0].priority.score}, Level: ${unresolved[0].priority.level})`);

  // 6. Candidate ranking for an incident
  const fireInc = unresolved.find(i => i.category === "FIRE" && i.latitude && i.longitude);
  if (!fireInc) throw new Error("Could not find a fire incident with coordinates");

  console.log(`6. Testing GET /api/incidents/${fireInc.id}/candidates...`);
  const candRes = await fetch(`${BASE_URL}/api/incidents/${fireInc.id}/candidates`);
  if (!candRes.ok) throw new Error(`GET candidates failed: ${candRes.status}`);
  const candData = await candRes.json();
  console.log(`Found ${candData.candidates.length} candidates. Top candidate: ${candData.candidates[0].team.code} (${candData.candidates[0].distanceKm} km, ETA: ${candData.candidates[0].etaMinutes} min)`);
  if (!candData.candidates.length) throw new Error("Expected at least 1 candidate");

  // 7. Auto-assign nearest team
  console.log(`7. Testing POST /api/incidents/${fireInc.id}/assign (auto-pick)...`);
  const assignRes = await fetch(`${BASE_URL}/api/incidents/${fireInc.id}/assign`, {
    method: "POST",
  });
  if (!assignRes.ok) {
    const err = await assignRes.json();
    throw new Error(`POST assign failed: ${err.error}`);
  }
  const assignData = await assignRes.json();
  console.log(`Assigned unit: ${assignData.assignedTeam.code} (${assignData.distanceKm}km, ETA: ~${assignData.etaMinutes}m)`);
  if (assignData.incident.status !== "ASSIGNED") throw new Error("Incident status should be ASSIGNED");

  // 8. Verify candidate list for second incident skips the newly busy team
  const secondFireInc = unresolved.find(i => i.id !== fireInc.id && i.category === "FIRE" && i.latitude && i.longitude);
  if (secondFireInc) {
    const secondCandRes = await fetch(`${BASE_URL}/api/incidents/${secondFireInc.id}/candidates`);
    const secondCandData = await secondCandRes.json();
    const busyFound = secondCandData.candidates.find(c => c.team.id === assignData.assignedTeam.id);
    if (busyFound) throw new Error("Busy assigned team should not appear in candidate list!");
    console.log(`Verified: second incident skips busy team ${assignData.assignedTeam.code}`);
  }

  // 9. Status transition rules:
  // Cannot move to IN_PROGRESS without assigned team
  const unassignedInc = unresolved.find(i => !i.assignedTeamId && i.id !== fireInc.id);
  if (unassignedInc) {
    console.log("9. Testing invalid IN_PROGRESS transition without team...");
    const badProgressRes = await fetch(`${BASE_URL}/api/incidents/${unassignedInc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "IN_PROGRESS" }),
    });
    if (badProgressRes.ok) throw new Error("Expected 400 error moving unassigned incident to IN_PROGRESS");
    const badData = await badProgressRes.json();
    console.log("Properly rejected:", badData.error);
  }

  // 10. Moving assigned incident to IN_PROGRESS succeeds
  console.log("10. Testing valid IN_PROGRESS transition on assigned incident...");
  const inProgRes = await fetch(`${BASE_URL}/api/incidents/${fireInc.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "IN_PROGRESS" }),
  });
  if (!inProgRes.ok) throw new Error("Failed to set assigned incident to IN_PROGRESS");
  console.log("Incident successfully moved to IN_PROGRESS.");

  // 11. Resolving incident frees team back to AVAILABLE
  console.log("11. Testing RESOLVED transition (frees response unit)...");
  const resolveRes = await fetch(`${BASE_URL}/api/incidents/${fireInc.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "RESOLVED" }),
  });
  if (!resolveRes.ok) throw new Error("Failed to resolve incident");
  
  // Check team is AVAILABLE again
  const checkTeamRes = await fetch(`${BASE_URL}/api/teams/${assignData.assignedTeam.id}`);
  const checkTeam = await checkTeamRes.json();
  if (checkTeam.status !== "AVAILABLE" || checkTeam.currentIncidentId !== null) {
    throw new Error(`Team should be AVAILABLE with null incident, got status: ${checkTeam.status}`);
  }
  console.log(`Verified: Resolving incident released team ${checkTeam.code} back to AVAILABLE.`);

  // 12. Location missing handled gracefully
  console.log("12. Testing incident with missing location...");
  const missingLocRes = await fetch(`${BASE_URL}/api/incidents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "No GPS Report",
      description: "Incident reported without GPS coordinates",
      category: "OTHER",
      location: "Unknown remote corner",
      peopleAffected: 0,
    }),
  });
  if (!missingLocRes.ok) throw new Error("Failed to create report without GPS");
  const noGpsInc = await missingLocRes.json();

  const noGpsCandRes = await fetch(`${BASE_URL}/api/incidents/${noGpsInc.id}/candidates`);
  const noGpsCandData = await noGpsCandRes.json();
  if (noGpsCandData.error !== "Location missing") {
    throw new Error(`Expected 'Location missing', got ${noGpsCandData.error}`);
  }
  console.log("Verified: No GPS incident returns 'Location missing' error without crashing.");

  // Clean up no GPS incident and test team
  await fetch(`${BASE_URL}/api/incidents/${noGpsInc.id}`, { method: "DELETE" });
  await fetch(`${BASE_URL}/api/teams/${createdTeam.id}`, { method: "DELETE" });

  console.log("=== All Round 2 HTTP E2E checks passed successfully! ===");
}

run().catch(e => {
  console.error("HTTP verification failed:", e);
  process.exit(1);
});

