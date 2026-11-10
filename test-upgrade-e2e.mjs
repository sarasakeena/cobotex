import assert from "node:assert";

const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("=== STARTING UPGRADE & REGRESSION E2E VERIFICATION ===");

  // 1. Tap-only report (no voice text typed)
  console.log("\n[Test 1] Creating tap-only incident (Category + Presets + Tags + GPS)...");
  const tapOnlyRes = await fetch(`${BASE_URL}/api/incidents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: "FIRE",
      latitude: 19.0760,
      longitude: 72.8777,
      address: "Terminal 2, Sahar Road",
      peopleAffected: 8, // preset 6-10 mapped to 8
      tags: ["Trapped inside", "Spreading"],
      contactInfo: "9876543210",
    }),
  });

  assert.strictEqual(tapOnlyRes.status, 201, "Should create tap-only incident with 201");
  const tapIncident = await tapOnlyRes.json();
  console.log("✓ Tap-only Incident Created:", {
    id: tapIncident.id,
    title: tapIncident.title,
    description: tapIncident.description,
    location: tapIncident.location,
    severity: tapIncident.severity,
    score: tapIncident.severityScore,
    tags: tapIncident.tags,
  });

  // Verify auto-generated title and description
  assert(tapIncident.title.includes("Fire Emergency reported"), "Auto title should contain category name");
  assert(tapIncident.title.includes("Terminal 2, Sahar Road"), "Auto title should contain address");
  assert(tapIncident.description.includes("8 people affected"), "Auto description should include casualty count");
  assert(tapIncident.description.includes("Trapped inside, Spreading"), "Auto description should include tags");
  assert.strictEqual(tapIncident.location, "Terminal 2, Sahar Road", "Location field should be filled with address");
  assert.strictEqual(tapIncident.latitude, 19.0760);
  assert.strictEqual(tapIncident.longitude, 72.8777);

  // Verify Severity calculation with tags:
  // Fire Base (3) + 8 people (2) + Tags ["Trapped inside" (+1), "Spreading" (+1)] = 7 (HIGH)
  assert.strictEqual(tapIncident.severity, "HIGH", `Expected HIGH severity, got ${tapIncident.severity}`);
  assert(
    tapIncident.severityReasons.some((r) => r.includes("Tag 'Trapped inside' (+1)")),
    "Should include Tag 'Trapped inside' (+1) in reasons"
  );
  assert(
    tapIncident.severityReasons.some((r) => r.includes("Tag 'Spreading' (+1)")),
    "Should include Tag 'Spreading' (+1) in reasons"
  );

  // 2. Voice-enabled report simulation with custom transcript
  console.log("\n[Test 2] Creating voice-reported incident with custom transcript and coordinates-only fallback...");
  const voiceRes = await fetch(`${BASE_URL}/api/incidents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: "BUILDING_COLLAPSE",
      latitude: 12.9716,
      longitude: 77.5946,
      // No address provided -> should fallback location to "12.9716, 77.5946"
      peopleAffected: 55, // 50+ -> +4
      tags: ["People trapped", "Gas leak"],
      description: "Severe building collapse after sudden explosion. Multiple people unconscious and trapped under debris.",
      contactInfo: "Control Room 4",
      photo: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    }),
  });

  assert.strictEqual(voiceRes.status, 201);
  const voiceIncident = await voiceRes.json();
  console.log("✓ Voice-reported Incident Created:", {
    id: voiceIncident.id,
    title: voiceIncident.title,
    location: voiceIncident.location,
    severity: voiceIncident.severity,
    score: voiceIncident.severityScore,
  });

  // Verify fallback string location with 4 decimals
  assert.strictEqual(voiceIncident.location, "12.9716, 77.5946", "Fallback location must be 'Lat, Lng' with 4 decimals");
  assert.strictEqual(voiceIncident.title, "Building Collapse reported", "Auto title when address absent");
  assert.strictEqual(voiceIncident.severity, "CRITICAL", "Building collapse with 55 affected + trapped + explosion must be CRITICAL");

  // 3. Verify Admin Dashboard (/admin and /api/incidents)
  console.log("\n[Test 3] Verifying incident list and sorting on Dashboard...");
  const listRes = await fetch(`${BASE_URL}/api/incidents`);
  assert.strictEqual(listRes.status, 200);
  const incidents = await listRes.json();
  assert(incidents.length >= 2, "Expected multiple incidents");
  // Check critical is sorted to the top
  assert.strictEqual(incidents[0].severity, "CRITICAL", "Critical incident must be sorted to the top of the table");
  console.log(`✓ Dashboard feed confirmed: First is [${incidents[0].title}] (${incidents[0].severity})`);

  // 4. Verify Incident Detail page dossier (/admin/incidents/[id])
  console.log("\n[Test 4] Verifying Incident Detail Dossier (/admin/incidents/[id])...");
  const detailRes = await fetch(`${BASE_URL}/api/incidents/${tapIncident.id}`);
  assert.strictEqual(detailRes.status, 200);
  const detail = await detailRes.json();
  assert.deepStrictEqual(detail.tags, ["Trapped inside", "Spreading"], "Tags must be parsed as string array");
  assert.strictEqual(detail.latitude, 19.0760);
  assert.strictEqual(detail.longitude, 72.8777);
  assert(detail.severityReasons.length > 0, "Severity breakdown reasons must exist");
  console.log("✓ Detail Dossier Verified: Tags, Coordinates, and Reasons intact!");

  // 5. Test Status Update PATCH
  console.log("\n[Test 5] Testing status update...");
  const patchRes = await fetch(`${BASE_URL}/api/incidents/${tapIncident.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "IN_PROGRESS" }),
  });
  assert.strictEqual(patchRes.status, 200);
  const patched = await patchRes.json();
  assert.strictEqual(patched.status, "IN_PROGRESS");
  console.log("✓ Incident status successfully transitioned to IN_PROGRESS");

  // 6. Test Delete
  console.log("\n[Test 6] Testing deletion...");
  const delRes = await fetch(`${BASE_URL}/api/incidents/${tapIncident.id}`, {
    method: "DELETE",
  });
  assert.strictEqual(delRes.status, 200);
  const verifyDeleted = await fetch(`${BASE_URL}/api/incidents/${tapIncident.id}`);
  assert.strictEqual(verifyDeleted.status, 404);
  console.log("✓ Incident deleted and verified 404");

  // 7. Verify all web pages render 200
  console.log("\n[Test 7] Verifying all web pages render 200 OK...");
  for (const page of ["/", "/report", "/admin", `/admin/incidents/${voiceIncident.id}`]) {
    const res = await fetch(`${BASE_URL}${page}`);
    assert.strictEqual(res.status, 200, `Page ${page} must return 200`);
    console.log(`✓ Web Page ${page} -> 200 OK`);
  }

  console.log("\n🎉 ALL UPGRADE AND REGRESSION TESTS PASSED! 🎉\n");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
