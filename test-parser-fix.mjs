import assert from "node:assert";
import { parseVoiceReport } from "./lib/voiceParser.ts";

console.log("=== VERIFYING PARSER FIXES ===");

// 1. "fire please use my current location"
const t1 = "fire please use my current location";
const r1 = parseVoiceReport(t1);
console.log("Result 1:", r1);
assert.strictEqual(r1.category, "FIRE");
assert.strictEqual(r1.useCurrentLocation, true, "useCurrentLocation should be true");
assert.strictEqual(r1.addressText, undefined, "addressText should be undefined");
console.log("✓ Test 1 Passed: 'fire please use my current location'");

// 2. "road accident near Tambaram railway station, two people injured"
const t2 = "road accident near Tambaram railway station, two people injured";
const r2 = parseVoiceReport(t2);
console.log("Result 2:", r2);
assert.strictEqual(r2.category, "ROAD_ACCIDENT");
assert.strictEqual(r2.addressText, "Tambaram railway station", "addressText should be 'Tambaram railway station'");
assert.strictEqual(r2.peopleAffected, 2);
console.log("✓ Test 2 Passed: 'road accident near Tambaram railway station, two people injured'");

// 3. "someone is not breathing here"
const t3 = "someone is not breathing here";
const r3 = parseVoiceReport(t3);
console.log("Result 3:", r3);
assert.strictEqual(r3.category, "MEDICAL");
assert.strictEqual(r3.useCurrentLocation, true, "useCurrentLocation should be true");
assert.strictEqual(r3.addressText, undefined, "addressText should be undefined");
console.log("✓ Test 3 Passed: 'someone is not breathing here'");

// 4. "flood in Velachery and many people stranded"
const t4 = "flood in Velachery and many people stranded";
const r4 = parseVoiceReport(t4);
console.log("Result 4:", r4);
assert.strictEqual(r4.category, "FLOOD");
assert.strictEqual(r4.addressText, "Velachery", "addressText should be 'Velachery'");
assert.strictEqual(r4.peopleAffected, 10);
console.log("✓ Test 4 Passed: 'flood in Velachery and many people stranded'");

console.log("\n🎉 ALL 4 BUG FIX CASES PASSED 100%! 🎉");
