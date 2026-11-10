import assert from "node:assert";
import { parseVoiceReport } from "./lib/voiceParser.ts";

// Test 1
console.log("Testing Case 1...");
const t1 = "Fire in a building near T Nagar bus stand, six people trapped and one is unconscious, my number is 98765 43210";
const r1 = parseVoiceReport(t1);
console.log("Result 1:", r1);
assert.strictEqual(r1.category, "FIRE", "Should be FIRE");
assert.strictEqual(r1.peopleAffected, 6, "Should be 6 people");
assert(r1.tags.includes("Trapped inside"), "Should include 'Trapped inside'");
assert(r1.tags.includes("Unconscious"), "Should include 'Unconscious'");
assert.strictEqual(r1.contactPhone, "9876543210", "Should extract phone 9876543210");
assert.strictEqual(r1.addressText, "T Nagar bus stand", "Should extract 'T Nagar bus stand'");
console.log("✓ Case 1 Passed!");

// Test 2
console.log("\nTesting Case 2...");
const t2 = "Road accident on the highway, two people injured, the road is blocked";
const r2 = parseVoiceReport(t2);
console.log("Result 2:", r2);
assert.strictEqual(r2.category, "ROAD_ACCIDENT", "Should be ROAD_ACCIDENT");
assert.strictEqual(r2.peopleAffected, 2, "Should be 2 people");
assert(r2.tags.includes("Injuries"), "Should include 'Injuries'");
assert(r2.tags.includes("Road blocked"), "Should include 'Road blocked'");
assert(!r2.contactPhone, "Should have no phone");
assert(!r2.addressText, "Should have no address text (the highway is generic)");
console.log("✓ Case 2 Passed!");

// Test 3
console.log("\nTesting Case 3...");
const t3 = "Someone fainted and is not breathing";
const r3 = parseVoiceReport(t3);
console.log("Result 3:", r3);
assert.strictEqual(r3.category, "MEDICAL", "Should be MEDICAL");
assert.strictEqual(r3.peopleAffected, 1, "Should be 1 person");
assert(r3.tags.includes("Not breathing"), "Should include 'Not breathing'");
console.log("✓ Case 3 Passed!");

// Test 4
console.log("\nTesting Case 4...");
const t4 = "Flood water is entering houses, many people stranded";
const r4 = parseVoiceReport(t4);
console.log("Result 4:", r4);
assert.strictEqual(r4.category, "FLOOD", "Should be FLOOD");
assert.strictEqual(r4.peopleAffected, 10, "Should be 10 people");
assert(r4.tags.includes("Houses submerged"), "Should include 'Houses submerged'");
assert(r4.tags.includes("People stranded"), "Should include 'People stranded'");
console.log("✓ Case 4 Passed!");

console.log("\n🎉 ALL 4 PARSER TEST CASES PASSED FLAWLESSLY! 🎉");
