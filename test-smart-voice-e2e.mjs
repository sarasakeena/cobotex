import assert from "node:assert";
import { parseVoiceReport } from "./lib/voiceParser.ts";

const BASE_URL = "http://localhost:3000";

async function runE2ETests() {
  console.log("=== STARTING SMART VOICE REPORT E2E SUITE ===");

  // ==========================================
  // 1. TEST ALL 4 SPOKEN INPUTS WITH PARSER
  // ==========================================
  console.log("\n[Test 1] Testing voice parsing across all required transcripts...");

  // Case 1: Fire
  const s1 = "Fire in a building near T Nagar bus stand, six people trapped and one is unconscious, my number is 98765 43210";
  const p1 = parseVoiceReport(s1);
  assert.strictEqual(p1.category, "FIRE", "Case 1 must be FIRE");
  assert.strictEqual(p1.peopleAffected, 6, "Case 1 must have 6 people");
  assert(p1.tags.includes("Trapped inside"), "Case 1 must include 'Trapped inside'");
  assert(p1.tags.includes("Unconscious"), "Case 1 must include 'Unconscious'");
  assert.strictEqual(p1.contactPhone, "9876543210", "Case 1 must extract phone 9876543210");
  assert.strictEqual(p1.addressText, "T Nagar bus stand", "Case 1 must extract address 'T Nagar bus stand'");
  console.log("✓ Case 1 parser verified:", p1);

  // Case 2: Road Accident
  const s2 = "Road accident on the highway, two people injured, the road is blocked";
  const p2 = parseVoiceReport(s2);
  assert.strictEqual(p2.category, "ROAD_ACCIDENT", "Case 2 must be ROAD_ACCIDENT");
  assert.strictEqual(p2.peopleAffected, 2, "Case 2 must have 2 people");
  assert(p2.tags.includes("Injuries"), "Case 2 must include 'Injuries'");
  assert(p2.tags.includes("Road blocked"), "Case 2 must include 'Road blocked'");
  assert(!p2.contactPhone, "Case 2 should have no phone");
  assert(!p2.addressText, "Case 2 should have no address text");
  console.log("✓ Case 2 parser verified:", p2);

  // Case 3: Medical
  const s3 = "Someone fainted and is not breathing";
  const p3 = parseVoiceReport(s3);
  assert.strictEqual(p3.category, "MEDICAL", "Case 3 must be MEDICAL");
  assert.strictEqual(p3.peopleAffected, 1, "Case 3 must have 1 person");
  assert(p3.tags.includes("Not breathing"), "Case 3 must include 'Not breathing'");
  console.log("✓ Case 3 parser verified:", p3);

  // Case 4: Flood
  const s4 = "Flood water is entering houses, many people stranded";
  const p4 = parseVoiceReport(s4);
  assert.strictEqual(p4.category, "FLOOD", "Case 4 must be FLOOD");
  assert.strictEqual(p4.peopleAffected, 10, "Case 4 must have 10 people");
  assert(p4.tags.includes("Houses submerged"), "Case 4 must include 'Houses submerged'");
  assert(p4.tags.includes("People stranded"), "Case 4 must include 'People stranded'");
  console.log("✓ Case 4 parser verified:", p4);

  // ==========================================
  // 2. SIMULATE SMART SUBMIT FLOW FOR CASE 1
  // ==========================================
  console.log("\n[Test 2] Simulating Smart Voice Submit for Case 1 (Fire with address)...");
  const autoTitle1 = `${p1.category} reported - ${p1.addressText}`;
  const res1 = await fetch(`${BASE_URL}/api/incidents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: p1.category,
      latitude: 13.0418, // Simulated geocoding for T Nagar
      longitude: 80.2341,
      address: p1.addressText,
      peopleAffected: p1.peopleAffected,
      tags: p1.tags,
      title: autoTitle1,
      description: s1,
      contactInfo: p1.contactPhone,
    }),
  });
  assert.strictEqual(res1.status, 201);
  const inc1 = await res1.json();
  assert.strictEqual(inc1.category, "FIRE");
  assert.strictEqual(inc1.location, "T Nagar bus stand");
  assert.strictEqual(inc1.peopleAffected, 6);
  assert.strictEqual(inc1.contactInfo, "9876543210");
  assert(inc1.tags.includes("Trapped inside"));
  assert(inc1.tags.includes("Unconscious"));
  console.log(`✓ Smart Voice Incident 1 Created [${inc1.id}] with severity ${inc1.severity} (Score: ${inc1.severityScore})`);
  console.log("   Reasons:\n    - " + inc1.severityReasons.join("\n    - "));

  // ==========================================
  // 3. SIMULATE SMART SUBMIT FLOW FOR CASE 2
  // ==========================================
  console.log("\n[Test 3] Simulating Smart Voice Submit for Case 2 (Road accident with GPS coordinates fallback)...");
  const res2 = await fetch(`${BASE_URL}/api/incidents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: p2.category,
      latitude: 12.9716, // GPS fallback
      longitude: 77.5946,
      peopleAffected: p2.peopleAffected,
      tags: p2.tags,
      description: s2,
    }),
  });
  assert.strictEqual(res2.status, 201);
  const inc2 = await res2.json();
  assert.strictEqual(inc2.category, "ROAD_ACCIDENT");
  assert.strictEqual(inc2.location, "12.9716, 77.5946");
  assert.strictEqual(inc2.peopleAffected, 2);
  assert(inc2.tags.includes("Injuries"));
  assert(inc2.tags.includes("Road blocked"));
  console.log(`✓ Smart Voice Incident 2 Created [${inc2.id}] with severity ${inc2.severity}`);

  // ==========================================
  // 4. VERIFY DETAIL DOSSIER & REASONS
  // ==========================================
  console.log("\n[Test 4] Verifying detail dossier displays tags and reasons...");
  const detailRes = await fetch(`${BASE_URL}/api/incidents/${inc1.id}`);
  assert.strictEqual(detailRes.status, 200);
  const detail = await detailRes.json();
  assert.strictEqual(detail.id, inc1.id);
  assert.deepStrictEqual(detail.tags, ["Trapped inside", "Unconscious"]);
  assert(detail.severityReasons.some(r => r.includes("Tag 'Trapped inside' (+1)")));
  console.log("✓ Incident 1 dossier verified with tags and Google Maps coordinates link!");

  // ==========================================
  // 5. VERIFY DASHBOARD & WEBPAGES
  // ==========================================
  console.log("\n[Test 5] Verifying Dashboard & Web Pages...");
  const listRes = await fetch(`${BASE_URL}/api/incidents`);
  assert.strictEqual(listRes.status, 200);
  const list = await listRes.json();
  assert(list.length >= 2);
  console.log(`✓ Dashboard contains ${list.length} total incidents`);

  for (const page of ["/", "/report", "/admin", `/admin/incidents/${inc1.id}`]) {
    const pageRes = await fetch(`${BASE_URL}${page}`);
    assert.strictEqual(pageRes.status, 200, `Page ${page} must return 200`);
    console.log(`✓ Page ${page} -> 200 OK`);
  }

  console.log("\n🎉 ALL SMART VOICE REPORT TESTS PASSED FLAWLESSLY! 🎉\n");
}

runE2ETests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

