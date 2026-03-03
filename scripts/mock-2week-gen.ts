import fs from "fs";
import path from "path";

// 1. Mock Engines or Import them if they don't depend on DB
// VolumeEngine depends on Prisma for fetching profiles.
// I'll read the JSONs directly.

const volumes = JSON.parse(fs.readFileSync(path.join(__dirname, "../public/volumes.json"), "utf8"));
const splits = JSON.parse(fs.readFileSync(path.join(__dirname, "../public/split_type.json"), "utf8"));

// Simple Mock Logic for engines to bypass DB
class MockVolumeEngine {
    static getProfile(goal: string, level: string) {
        return volumes.find((v: any) => v.goal === goal && v.experienceLevel === level);
    }
}

class MockSplitEngine {
    static select(daysPerWeek: number) {
        return splits.find((s: any) => s.daysPerWeek === daysPerWeek);
    }
}

// Logic from DistributionEngine (re-implemented or imported)
// I'll re-implement the core distribution logic here for a quick report
function distributeSets(weeklySets: any, structure: any[]) {
    const trainingDays = structure.filter(d => !d.rest);
    const sessions = structure.map(d => ({ day: d.day, rest: d.rest, exercises: [] as any[] }));

    for (const [muscle, totalSets] of Object.entries(weeklySets)) {
        if (typeof totalSets !== 'number' || totalSets <= 0) continue;

        const setsPerDay = Math.floor(totalSets / trainingDays.length);
        const remainder = totalSets % trainingDays.length;

        trainingDays.forEach((day, i) => {
            const session = sessions.find(s => s.day === day.day);
            if (session) {
                let setsForDay = setsPerDay + (i < remainder ? 1 : 0);
                if (setsForDay > 0) {
                    session.exercises.push({ muscle, sets: setsForDay });
                }
            }
        });
    }
    return sessions;
}

const scenarios = [
    { days: 1, name: "1-Day Full Body" },
    { days: 2, name: "2-Day Full Body" },
    { days: 3, name: "3-Day Full Body" },
    { days: 5, name: "5-Day PPL/UL" }
];

scenarios.forEach(sc => {
    console.log(`\n=========================================`);
    console.log(`SCENARIO: ${sc.name} (${sc.days} Days/Week)`);
    console.log(`=========================================`);

    const profile = MockVolumeEngine.getProfile("HYPERTROPHY", "INTERMEDIATE");
    const split = MockSplitEngine.select(sc.days);

    if (!profile || !split) return;

    const sessions = distributeSets(profile.weeklySets, split.structure);

    for (let w = 1; w <= 2; w++) {
        console.log(`\n--- WEEK ${w} ---`);
        sessions.forEach(s => {
            if (s.rest) return;
            console.log(`Day ${s.day}:`);
            s.exercises.forEach((ex: any, idx: number) => {
                // Progression logic simulation: add 2.5kg each week for demo if they "hit" it
                const weight = 60 + (w - 1) * 2.5;
                console.log(`  ${idx + 1}. ${ex.muscle} Exercise - ${ex.sets} sets x 8-10 @ ${weight}kg`);
            });
        });
    }
});
