import { VolumeEngine } from "../src/engines/VolumeEngine";
import { DistributionEngine } from "../src/engines/DistributionEngine";
import { TrainingGoal, ExperienceLevel, Gender } from "@prisma/client";

async function runTests() {
    console.log("🧪 Starting Algorithm Verification Tests...");

    // 1. Test Volume Modifiers
    console.log("\n--- Testing Volume Modifiers ---");
    const baseGoal = "HYPERTROPHY";

    // Case A: Default
    const modA = (VolumeEngine as any).calculateModifier(baseGoal);
    console.log(`Default Modifier: ${modA} (Expected: 1.0)`);

    // Case B: Female + High Fatigue
    const modB = (VolumeEngine as any).calculateModifier(baseGoal, {
        gender: "FEMALE",
        profile: { fatigueIndex: 9, consistencyScore: 1.0 }
    });
    console.log(`Female + High Fatigue: ${modB} (Expected: 1.0 + 0.05 - 0.1 = 0.95)`);

    // Case C: Male + Low Fatigue + High Adherence + Fat Loss
    const modC = (VolumeEngine as any).calculateModifier("FAT_LOSS", {
        gender: "MALE",
        profile: { fatigueIndex: 4, consistencyScore: 0.95 }
    });
    console.log(`Male + Low Fatigue + High Adherence + Fat Loss: ${modC} (Expected: (1.0 + 0.05 + 0.05) * 0.9 = 0.99)`);

    // 2. Test Distribution Logic
    console.log("\n--- Testing Distribution Logic ---");
    const weeklySets = { CHEST: 12, BACK: 10, QUADS: 10 };
    const split3Day = [
        { day: 1, focus: ["CHEST"], rest: false },
        { day: 2, rest: true },
        { day: 3, focus: ["BACK"], rest: false },
        { day: 4, rest: true },
        { day: 5, focus: ["QUADS"], rest: false },
        { day: 6, rest: true },
        { day: 7, rest: true },
    ];

    const dist3 = DistributionEngine.distribute(weeklySets, split3Day);
    console.log("3-Day Distribution (CHEST 12 sets):");
    dist3.forEach(s => {
        if (s.exercises.length > 0) {
            console.log(`Day ${s.day}: ${s.exercises.map(e => `${e.muscle} ${e.sets}s (${e.type})`).join(", ")}`);
        }
    });

    console.log("\n✅ Verification Tests Complete.");
}

runTests().catch(console.error);
