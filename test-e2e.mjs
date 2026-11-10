import assert from "node:assert";

const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("=== STARTING END-TO-END VERIFICATION ===");

  // 1. Test POST /api/incidents with validation failure
  console.log("\n[Test 1] Testing validation errors on POST /api/incidents...");
  const valRes = await fetch(`${BASE_URL}/api/incidents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.strictEqual(valRes.status, 400, "Should return 400 on empty payload");
  const valData = await valRes.json();
  assert(valData.errors, "Should return field-specific error messages");
  assert(valData.errors.title, "Should require title");
  assert(valData.errors.description, "Should require description");
  assert(valData.errors.category, "Should require valid category");
  assert(valData.errors.location, "Should require location");
  console.log("✓ Server validation succeeded:", Object.keys(valData.errors));

  // 2. Test creating incidents of different severities
  console.log("\n[Test 2] Creating incidents across categories & severities...");

  // Incident A: Other, 0 affected, no keywords -> Base 1 + 0 + 0 = 1 (LOW)
  const incLowRes = await fetch(`${BASE_URL}/api/incidents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Minor power outage in municipal park",
      description: "Street lighting flickering after thunderstorm. No hazards or injuries.",
      category: "OTHER",
      location: "City Park West Gate",
      peopleAffected: 0,
      contactInfo: "Park Ranger / 555-0101",
    }),
  });
  assert.strictEqual(incLowRes.status, 201);
  const incLow = await incLowRes.json();
  assert.strictEqual(incLow.severity, "LOW", "Expected LOW severity");
  assert(incLow.severityScore <= 3, "Expected score <= 3");
  console.log(`✓ Low Incident created [${incLow.id}]: Severity ${incLow.severity} (Score: ${incLow.severityScore})`);

  // Incident B: Road Accident, 2 affected -> Base 2 + 1 + 0 = 3 (LOW) or 5 affected -> Base 2 + 2 = 4 (MEDIUM)
  const incMedRes = await fetch(`${BASE_URL}/api/incidents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Multi-vehicle fender bender at intersection",
      description: "Two sedans and a delivery van collided. Traffic backed up, minor abrasions.",
      category: "ROAD_ACCIDENT",
      location: "Route 9 & Elm St Intersection",
      peopleAffected: 5,
      contactInfo: "Traffic Patrol #402",
    }),
  });
  assert.strictEqual(incMedRes.status, 201);
  const incMed = await incMedRes.json();
  assert.strictEqual(incMed.severity, "MEDIUM", "Expected MEDIUM severity (Base 2 + 2 people = 4)");
  console.log(`✓ Medium Incident created [${incMed.id}]: Severity ${incMed.severity} (Score: ${incMed.severityScore})`);

  // Incident C: Fire Emergency with keywords -> Base 3 + 2 (4 people) + 2 keywords (spreading, gas leak) = 7 (HIGH)
  const incHighRes = await fetch(`${BASE_URL}/api/incidents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Commercial Kitchen Fire spreading near gas leak",
      description: "Flames spreading rapidly through restaurant ventilation duct. Possible gas leak shutoff needed immediately.",
      category: "FIRE",
      location: "88 Main Street, Downtown",
      peopleAffected: 4,
      contactInfo: "Dispatcher Station 12",
    }),
  });
  assert.strictEqual(incHighRes.status, 201);
  const incHigh = await incHighRes.json();
  assert.strictEqual(incHigh.severity, "HIGH", "Expected HIGH severity");
  console.log(`✓ High Incident created [${incHigh.id}]: Severity ${incHigh.severity} (Score: ${incHigh.severityScore})`);

  // Incident D: Building Collapse with trapped, explosion, unconscious, 60 affected
  // Base 4 + 4 (50+) + 3 (capped keywords) = 11 (CRITICAL)
  const incCritRes = await fetch(`${BASE_URL}/api/incidents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Structural Building Collapse following explosion with victims trapped",
      description: "Four-story residential wing collapsed after gas explosion. Multiple people trapped inside rubble, several unconscious with severe bleeding. Immediate urban search and rescue dispatch required.",
      category: "BUILDING_COLLAPSE",
      location: "700 Harbor Boulevard, Complex C",
      peopleAffected: 65,
      contactInfo: "Commander Vance / Task Force 1",
    }),
  });
  assert.strictEqual(incCritRes.status, 201);
  const incCrit = await incCritRes.json();
  assert.strictEqual(incCrit.severity, "CRITICAL", "Expected CRITICAL severity");
  assert(incCrit.severityScore >= 8, "Expected CRITICAL score >= 8");
  console.log(`✓ Critical Incident created [${incCrit.id}]: Severity ${incCrit.severity} (Score: ${incCrit.severityScore})`);
  console.log("   Reasons:\n    - " + incCrit.severityReasons.join("\n    - "));

  // 3. Test GET /api/incidents
  console.log("\n[Test 3] Fetching all incidents via GET /api/incidents...");
  const listRes = await fetch(`${BASE_URL}/api/incidents`);
  assert.strictEqual(listRes.status, 200);
  const list = await listRes.json();
  assert(Array.isArray(list), "Expected array of incidents");
  assert(list.length >= 4, "Expected at least 4 incidents");
  // Check that critical incident is sorted to the top
  assert.strictEqual(list[0].severity, "CRITICAL", "First item should be CRITICAL incident due to sorting priority");
  console.log(`✓ Retrieved ${list.length} incidents. First in priority list: [${list[0].title}] (${list[0].severity})`);

  // 4. Test GET /api/stats
  console.log("\n[Test 4] Fetching statistics via GET /api/stats...");
  const statsRes = await fetch(`${BASE_URL}/api/stats`);
  assert.strictEqual(statsRes.status, 200);
  const stats = await statsRes.json();
  assert.strictEqual(typeof stats.total, "number");
  assert(stats.total >= 4, "Total should be at least 4");
  assert(stats.critical >= 1, "Critical count should be at least 1");
  assert(Array.isArray(stats.byCategory), "byCategory should be array");
  console.log(`✓ Stats retrieved: Total=${stats.total}, Critical=${stats.critical}, Pending=${stats.pending}, Resolved=${stats.resolved}`);
  console.log(`✓ Category breakdown:`, stats.byCategory.map(c => `${c.name}: ${c.count}`).join(", "));

  // 5. Test GET /api/incidents/[id]
  console.log("\n[Test 5] Fetching detail dossier for critical incident...");
  const detailRes = await fetch(`${BASE_URL}/api/incidents/${incCrit.id}`);
  assert.strictEqual(detailRes.status, 200);
  const detail = await detailRes.json();
  assert.strictEqual(detail.id, incCrit.id);
  assert.strictEqual(detail.severity, "CRITICAL");
  assert(detail.severityReasons && detail.severityReasons.length > 0, "Detail should include severity reasons");
  console.log(`✓ Detail dossier verified for ID ${detail.id}`);

  // 6. Test PATCH /api/incidents/[id] (status change)
  console.log("\n[Test 6] Updating incident status via PATCH /api/incidents/[id]...");
  // Update to IN_PROGRESS
  const patchRes1 = await fetch(`${BASE_URL}/api/incidents/${incCrit.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "IN_PROGRESS" }),
  });
  assert.strictEqual(patchRes1.status, 200);
  const patched1 = await patchRes1.json();
  assert.strictEqual(patched1.status, "IN_PROGRESS");
  console.log(`✓ Status changed to IN_PROGRESS`);

  // Update to RESOLVED
  const patchRes2 = await fetch(`${BASE_URL}/api/incidents/${incCrit.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "RESOLVED" }),
  });
  assert.strictEqual(patchRes2.status, 200);
  const patched2 = await patchRes2.json();
  assert.strictEqual(patched2.status, "RESOLVED");
  console.log(`✓ Status changed to RESOLVED`);

  // Verify status in GET /api/stats
  const statsResAfter = await fetch(`${BASE_URL}/api/stats`);
  const statsAfter = await statsResAfter.json();
  assert(statsAfter.resolved >= 1, "Resolved count should be incremented");
  console.log(`✓ Updated stats reflect resolved status: Resolved count = ${statsAfter.resolved}`);

  // 7. Test DELETE /api/incidents/[id]
  console.log("\n[Test 7] Deleting low incident via DELETE /api/incidents/[id]...");
  const delRes = await fetch(`${BASE_URL}/api/incidents/${incLow.id}`, {
    method: "DELETE",
  });
  assert.strictEqual(delRes.status, 200);
  const delData = await delRes.json();
  assert.strictEqual(delData.success, true);

  // Verify 404 on deleted incident
  const verifyDelRes = await fetch(`${BASE_URL}/api/incidents/${incLow.id}`);
  assert.strictEqual(verifyDelRes.status, 404, "Deleted incident should return 404");
  console.log(`✓ Incident [${incLow.id}] deleted and verified 404 on subsequent lookup`);

  // 8. Test Web Page Routes
  console.log("\n[Test 8] Checking UI Web Page Responses...");
  const pages = ["/", "/report", "/admin", `/admin/incidents/${incCrit.id}`];
  for (const page of pages) {
    const res = await fetch(`${BASE_URL}${page}`);
    assert.strictEqual(res.status, 200, `Page ${page} should return 200`);
    const text = await res.text();
    assert(text.includes("CRISIS"), `Page ${page} should include site branding`);
    console.log(`✓ Web page ${page} loaded with HTTP 200 OK`);
  }

  console.log("\n🎉 ALL END-TO-END TESTS PASSED SUCCESSFULLY! 🎉\n");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
