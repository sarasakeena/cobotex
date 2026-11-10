import assert from "node:assert";
import { parseVoiceReport } from "./lib/voiceParser.ts";

const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("=== STARTING VOICE LOCATION BUG FIX VERIFICATION ===");

  // 1. Test "fire please use my current location"
  console.log("\n[Test 1] Testing 'fire please use my current location'...");
  const t1 = "fire please use my current location";
  const p1 = parseVoiceReport(t1);

  assert.strictEqual(p1.category, "FIRE");
  assert.strictEqual(p1.useCurrentLocation, true, "useCurrentLocation must be true");
  assert.strictEqual(p1.addressText, undefined, "addressText must be undefined");

  // Submit report to API with GPS coordinates
  const res1 = await fetch(`${BASE_URL}/api/incidents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: p1.category,
      latitude: 12.8766,
      longitude: 80.0845,
      // No address text provided
      description: t1,
    }),
  });

  assert.strictEqual(res1.status, 201);
  const inc1 = await res1.json();
  console.log("Created Incident 1:", {
    id: inc1.id,
    title: inc1.title,
    location: inc1.location,
    description: inc1.description,
  });

  // CRITICAL BUG VERIFICATION: location must NOT be the transcript!
  assert.notStrictEqual(
    inc1.location.toLowerCase(),
    t1.toLowerCase(),
    "Location MUST NOT be the transcript!"
  );
  assert.strictEqual(
    inc1.location,
    "12.8766, 80.0845",
    "Location must be '12.8766, 80.0845'"
  );
  assert.strictEqual(
    inc1.title,
    "Fire Emergency reported",
    "Title must not contain transcript"
  );
  assert.strictEqual(inc1.description, t1, "Description preserves transcript");
  console.log("✓ Test 1 Verified: Location is properly set to GPS coordinates '12.8766, 80.0845' and NOT transcript!");

  // 2. Test "road accident near Tambaram railway station, two people injured"
  console.log("\n[Test 2] Testing 'road accident near Tambaram railway station, two people injured'...");
  const t2 = "road accident near Tambaram railway station, two people injured";
  const p2 = parseVoiceReport(t2);

  assert.strictEqual(p2.category, "ROAD_ACCIDENT");
  assert.strictEqual(p2.addressText, "Tambaram railway station");
  assert.strictEqual(p2.peopleAffected, 2);

  const res2 = await fetch(`${BASE_URL}/api/incidents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: p2.category,
      address: p2.addressText,
      peopleAffected: p2.peopleAffected,
      tags: p2.tags,
      description: t2,
    }),
  });
  assert.strictEqual(res2.status, 201);
  const inc2 = await res2.json();
  assert.strictEqual(inc2.location, "Tambaram railway station");
  assert.strictEqual(inc2.title, "Road Accident reported - Tambaram railway station");
  console.log("✓ Test 2 Verified: Location is 'Tambaram railway station'");

  // 3. Test "someone is not breathing here"
  console.log("\n[Test 3] Testing 'someone is not breathing here'...");
  const t3 = "someone is not breathing here";
  const p3 = parseVoiceReport(t3);

  assert.strictEqual(p3.category, "MEDICAL");
  assert.strictEqual(p3.useCurrentLocation, true);
  assert.strictEqual(p3.addressText, undefined);

  const res3 = await fetch(`${BASE_URL}/api/incidents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: p3.category,
      latitude: 13.0827,
      longitude: 80.2707,
      description: t3,
      peopleAffected: 1,
      tags: p3.tags,
    }),
  });
  assert.strictEqual(res3.status, 201);
  const inc3 = await res3.json();
  assert.notStrictEqual(inc3.location.toLowerCase(), t3.toLowerCase());
  assert.strictEqual(inc3.location, "13.0827, 80.2707");
  console.log("✓ Test 3 Verified: Location is coordinates '13.0827, 80.2707' and NOT transcript");

  // 4. Test "flood in Velachery and many people stranded"
  console.log("\n[Test 4] Testing 'flood in Velachery and many people stranded'...");
  const t4 = "flood in Velachery and many people stranded";
  const p4 = parseVoiceReport(t4);

  assert.strictEqual(p4.category, "FLOOD");
  assert.strictEqual(p4.addressText, "Velachery");
  assert.strictEqual(p4.peopleAffected, 10);

  const res4 = await fetch(`${BASE_URL}/api/incidents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: p4.category,
      address: p4.addressText,
      peopleAffected: p4.peopleAffected,
      tags: p4.tags,
      description: t4,
    }),
  });
  assert.strictEqual(res4.status, 201);
  const inc4 = await res4.json();
  assert.strictEqual(inc4.location, "Velachery");
  console.log("✓ Test 4 Verified: Location is 'Velachery'");

  // 5. Test detail page display
  console.log("\n[Test 5] Verifying detail page for incident 1...");
  const detailRes = await fetch(`${BASE_URL}/api/incidents/${inc1.id}`);
  assert.strictEqual(detailRes.status, 200);
  const detail = await detailRes.json();
  assert.strictEqual(detail.location, "12.8766, 80.0845");
  assert.notStrictEqual(detail.location, t1);
  console.log("✓ Test 5 Verified: Detail page returns location as '12.8766, 80.0845'");

  // 6. Test Web Page Routes
  console.log("\n[Test 6] Checking UI pages...");
  for (const page of ["/", "/report", "/admin", `/admin/incidents/${inc1.id}`]) {
    const r = await fetch(`${BASE_URL}${page}`);
    assert.strictEqual(r.status, 200, `Page ${page} must return 200`);
    console.log(`✓ Page ${page} -> 200 OK`);
  }

  console.log("\n🎉 ALL BUG FIX TESTS PASSED 100%! 🎉\n");
}

runTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});

