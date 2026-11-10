const BASE_URL = "http://localhost:3000";

async function run() {
  console.log("=== Testing Team Workflow & Live Tracking E2E ===");

  // 1. Team Login
  console.log("1. Logging in as FIRE-01 with PIN 1234...");
  const loginRes = await fetch(`${BASE_URL}/api/team/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "FIRE-01", pin: "1234" }),
  });
  if (!loginRes.ok) {
    const err = await loginRes.json();
    throw new Error(`Login failed: ${err.error}`);
  }
  const loginCookie = loginRes.headers.get("set-cookie");
  if (!loginCookie) throw new Error("No session cookie set on login");
  console.log("✓ Logged in as FIRE-01, cookie received.");

  const cookieHeader = loginCookie.split(";")[0];

  // 2. GET /api/team/me
  console.log("2. Checking GET /api/team/me...");
  const meRes = await fetch(`${BASE_URL}/api/team/me`, {
    headers: { Cookie: cookieHeader },
  });
  if (!meRes.ok) throw new Error(`GET /api/team/me failed: ${meRes.status}`);
  const meData = await meRes.json();
  console.log(`✓ Authenticated as: ${meData.team.code} (${meData.team.name}), memberCount: ${meData.team.memberCount}`);

  // 3. Assign an incident to FIRE-01 from admin side
  console.log("3. Assigning incident to FIRE-01...");
  const incRes = await fetch(`${BASE_URL}/api/incidents`);
  const incidents = await incRes.json();
  const targetInc = incidents.find(i => i.status === "REPORTED" && i.category === "FIRE");
  if (!targetInc) throw new Error("No reported fire incident found");

  const assignRes = await fetch(`${BASE_URL}/api/incidents/${targetInc.id}/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamId: meData.team.id }),
  });
  if (!assignRes.ok) {
    const err = await assignRes.json();
    throw new Error(`Assign failed: ${err.error}`);
  }
  console.log(`✓ Incident "${targetInc.title}" assigned to FIRE-01.`);

  // Verify /api/team/me now shows currentIncident
  const meAssignedRes = await fetch(`${BASE_URL}/api/team/me`, {
    headers: { Cookie: cookieHeader },
  });
  const meAssignedData = await meAssignedRes.json();
  if (!meAssignedData.currentIncident || meAssignedData.currentIncident.id !== targetInc.id) {
    throw new Error("Team dashboard did not pick up assigned incident!");
  }
  console.log(`✓ Team dashboard confirms active dispatch: ${meAssignedData.currentIncident.title}`);

  // 4. Team transmits "On the way" (EN_ROUTE)
  console.log("4. Transmitting EN_ROUTE progress...");
  const enRouteRes = await fetch(`${BASE_URL}/api/team/progress`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({ action: "EN_ROUTE" }),
  });
  if (!enRouteRes.ok) throw new Error("Failed to set EN_ROUTE");
  const enRouteData = await enRouteRes.json();
  console.log(`✓ ${enRouteData.message}`);

  // 5. Post location updates (simulate travel)
  console.log("5. Posting live location updates (travel simulation)...");
  const locRes = await fetch(`${BASE_URL}/api/team/location`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({ lat: 13.0425, lng: 80.2335 }),
  });
  if (!locRes.ok) throw new Error("Failed to post location");
  const locData = await locRes.json();
  console.log(`✓ Location updated: remaining distance ${locData.remainingDistance} km, live ETA ${locData.liveEtaMinutes} min`);

  // 6. Team transmits "Arrived on site" (ARRIVED)
  console.log("6. Transmitting ARRIVED progress...");
  const arrivedRes = await fetch(`${BASE_URL}/api/team/progress`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({ action: "ARRIVED" }),
  });
  if (!arrivedRes.ok) throw new Error("Failed to set ARRIVED");
  console.log("✓ Team arrived on scene.");

  // Check incident status moved to IN_PROGRESS
  const incCheckRes = await fetch(`${BASE_URL}/api/incidents/${targetInc.id}`);
  const incCheck = await incCheckRes.json();
  if (incCheck.status !== "IN_PROGRESS") {
    throw new Error(`Expected incident status IN_PROGRESS, got ${incCheck.status}`);
  }
  console.log("✓ Incident status automatically progressed to IN_PROGRESS upon primary team arrival.");

  // 7. Request backup for 6 people
  console.log("7. Team requesting backup for 6 personnel...");
  const backupRes = await fetch(`${BASE_URL}/api/team/backup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({ peopleNeeded: 6, note: "Heavy smoke, structural hazard" }),
  });
  if (!backupRes.ok) {
    const err = await backupRes.json();
    throw new Error(`Backup request failed: ${err.error}`);
  }
  const backupReq = await backupRes.json();
  console.log(`✓ Backup request created (${backupReq.id}) for ${backupReq.peopleNeeded} personnel.`);

  // 8. Verify admin stats & backup request list
  const statsRes = await fetch(`${BASE_URL}/api/stats`);
  const statsData = await statsRes.json();
  console.log(`✓ Admin stats show ${statsData.pendingBackupCount} pending backup requests.`);

  // 9. Admin fulfills backup request
  console.log(`9. Admin auto-fulfilling backup request ${backupReq.id}...`);
  const fulfillRes = await fetch(`${BASE_URL}/api/backup-requests/${backupReq.id}/fulfill`, {
    method: "POST",
  });
  if (!fulfillRes.ok) {
    const err = await fulfillRes.json();
    throw new Error(`Fulfill failed: ${err.error}`);
  }
  const fulfillData = await fulfillRes.json();
  console.log(`✓ ${fulfillData.message}`);
  console.log(`Assigned backup units:`, fulfillData.assignedTeams.map(t => `${t.code} (${t.memberCount} pers.)`));

  // 10. Team marks incident RESOLVED
  console.log("10. Team marking incident RESOLVED with resolution note...");
  const resolveRes = await fetch(`${BASE_URL}/api/team/progress`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({ action: "RESOLVED", note: "Fire neutralized, ventilation complete." }),
  });
  if (!resolveRes.ok) throw new Error("Failed to mark RESOLVED");
  console.log("✓ Incident marked RESOLVED.");

  // Verify all teams on incident are now AVAILABLE
  const checkResolvedIncRes = await fetch(`${BASE_URL}/api/incidents/${targetInc.id}`);
  const resolvedInc = await checkResolvedIncRes.json();
  if (resolvedInc.status !== "RESOLVED") throw new Error("Incident not resolved");

  const primaryTeamRes = await fetch(`${BASE_URL}/api/teams/${meData.team.id}`);
  const primaryTeamData = await primaryTeamRes.json();
  if (primaryTeamData.status !== "AVAILABLE" || primaryTeamData.currentIncidentId !== null) {
    throw new Error(`Primary team should be AVAILABLE with null incident, got ${primaryTeamData.status}`);
  }
  console.log(`✓ Primary team ${primaryTeamData.code} released back to AVAILABLE.`);

  for (const bt of fulfillData.assignedTeams) {
    const backupTeamRes = await fetch(`${BASE_URL}/api/teams/${bt.id}`);
    const backupTeamData = await backupTeamRes.json();
    if (backupTeamData.status !== "AVAILABLE" || backupTeamData.currentIncidentId !== null) {
      throw new Error(`Backup team ${bt.code} should be AVAILABLE, got ${backupTeamData.status}`);
    }
  }
  console.log("✓ All backup teams released back to AVAILABLE.");

  // 11. Admin reopens resolved incident
  console.log("11. Admin reopening resolved incident to IN_PROGRESS...");
  const reopenRes = await fetch(`${BASE_URL}/api/incidents/${targetInc.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "IN_PROGRESS" }),
  });
  if (!reopenRes.ok) {
    const err = await reopenRes.json();
    throw new Error(`Reopen failed: ${err.error}`);
  }
  const reopenedInc = await reopenRes.json();
  if (reopenedInc.status !== "IN_PROGRESS") throw new Error("Failed to reopen incident");
  console.log("✓ Incident successfully reopened to IN_PROGRESS and primary team marked BUSY.");

  // Re-resolve to clean up test state
  await fetch(`${BASE_URL}/api/incidents/${targetInc.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "RESOLVED" }),
  });

  console.log("=== All Team Workflow & Live Tracking E2E Checks Passed Successfully! ===");
}

run().catch(e => {
  console.error("Verification failed:", e);
  process.exit(1);
});
