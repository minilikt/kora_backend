import { VolumeEngine } from "../src/engines/VolumeEngine";
import { DistributionEngine } from "../src/engines/DistributionEngine";
import { TrainingGoal, ExperienceLevel } from "@prisma/client";

async function runTests() {
    console.log("🚀 Running Personalized Algorithm Verification Suite...\n");

    // --- TEST 1: Volume Modifiers (Step 2) ---
    console.log("TEST 1: Volume Multiplier Calculations");

    const testCases = [
        {
            name: "Standard Beginner Male (Muscle Gain)",
            goal: "MUSCLE_GAIN",
            context: { gender: "MALE", profile: { fatigueIndex: 5, consistencyScore: 1.0 } },
            expected: 1.0 // Base
        },
        {
            name: "High Performance Female (Muscle Gain)",
            goal: "MUSCLE_GAIN",
            context: { gender: "FEMALE", profile: { fatigueIndex: 4, consistencyScore: 0.95 } },
            expected: 1.10 // 1.0 + 0.05 (Female) + 0.05 (Fresh) + 0.05 (Adherence)
        },
        {
            name: "Struggling Beginner (Fatigue + Low Adherence)",
            goal: "MUSCLE_GAIN",
            context: { gender: "MALE", profile: { fatigueIndex: 9, consistencyScore: 0.65 } },
            expected: 0.80 // 1.0 - 0.1 (Fatigue) - 0.1 (Adherence)
        },
        {
            name: "Intermediate Maintenance/Fat Loss Adjustment",
            goal: "MAINTAIN",
            context: { gender: "MALE", profile: { fatigueIndex: 5, consistencyScore: 1.0 } },
            expected: 0.90 // 1.0 * 0.9
        }
    ];

    testCases.forEach(tc => {
        const result = (VolumeEngine as any).calculateModifier(tc.goal, tc.context);
        const pass = Math.abs(result - tc.expected) < 0.01;
        console.log(`${pass ? "✅" : "❌"} ${tc.name}: Result ${result} (Expected ${tc.expected})`);
    });

    // --- TEST 2: High Frequency Distribution (Step 4) ---
    console.log("\nTEST 2: Frequency Distribution & Set Caps");

    const highVolumeWeeklySets = { CHEST: 12, BACK: 12, QUADS: 12 };

    // 3-Day Split (Full Body) - Should hit caps or spread
    const split3 = [
        { day: 1, focus: ["CHEST", "BACK", "QUADS"], rest: false },
        { day: 2, rest: true },
        { day: 3, focus: ["CHEST", "BACK", "QUADS"], rest: false },
        { day: 4, rest: true },
        { day: 5, focus: ["CHEST", "BACK", "QUADS"], rest: false },
        { day: 6, rest: true },
        { day: 7, rest: true },
    ];

    const dist3 = DistributionEngine.distribute(highVolumeWeeklySets, split3);
    console.log("\n3-Day Full Body Distribution (12 sets each):");
    dist3.forEach(s => {
        if (!s.exercises.length) return;
        console.log(`Day ${s.day}: ${s.exercises.map(e => `${e.muscle} ${e.sets}s`).join(", ")}`);
        s.exercises.forEach(e => {
            if (e.sets > 8) console.log(`❌ ERROR: Day ${s.day} ${e.muscle} exceeds cap! (${e.sets} sets)`);
        });
    });

    // --- TEST 3: Exercise Splitting (Step 5) ---
    console.log("\nTEST 3: Compound/Isolation Splitting (60/40 Rule)");

    const heavyDayWeekly = { CHEST: 10 }; // 10 sets on one day (if possible)
    const singleDaySplit = [{ day: 1, focus: ["CHEST"], rest: false }];

    const distSingle = DistributionEngine.distribute(heavyDayWeekly, singleDaySplit);
    console.log("\nExercise Split for 10 sets of CHEST:");
    distSingle[0].exercises.forEach(e => {
        console.log(`- ${e.type}: ${e.sets} sets (Pattern: ${e.pattern})`);
    });

    const compound = distSingle[0].exercises.filter(e => e.type === "COMPOUND").reduce((acc, e) => acc + e.sets, 0);
    const isolation = distSingle[0].exercises.filter(e => e.type === "ISOLATION").reduce((acc, e) => acc + e.sets, 0);
    console.log(`Results: ${compound} Compound, ${isolation} Isolation (Ratio: ${Math.round(compound / (compound + isolation) * 100)}% Compound)`);

    console.log("\n--- Verification Finished ---");
}

runTests().catch(console.error);
