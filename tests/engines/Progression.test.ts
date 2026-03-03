// PURE LOGIC TEST - NO DATABASE DEPENDENCIES

function calculateProgression(
    actualReps: number[],
    actualWeights: number[],
    rpePerSet: number[],
    baseRepRange: [number, number]
) {
    const [minReps, maxReps] = baseRepRange;
    const lastWeight = actualWeights[0] || 0;
    const avgRpe = rpePerSet.reduce((a, b) => a + b, 0) / rpePerSet.length || 8;

    let nextWeight = lastWeight;
    let nextReps = `${minReps}-${maxReps}`;
    let progressionNote = "";

    const allSetsHitMax = actualReps.every(r => r >= maxReps);
    const allSetsDroppedBelowMin = actualReps.every(r => r < minReps);

    if (allSetsHitMax && avgRpe < 9.5) {
        // LEVEL UP: Increase weight, reset reps
        nextWeight = lastWeight > 0 ? lastWeight + 2.5 : 2.5;
        nextReps = `${minReps}-${minReps + 1}`;
        progressionNote = `Progressing to ${nextWeight}kg as you hit max reps across all sets.`;
    } else if (allSetsDroppedBelowMin || avgRpe >= 10) {
        // STRUGGLE: Maintain or slightly reduce
        nextWeight = lastWeight;
        nextReps = `${minReps}-${minReps}`;
        progressionNote = "Struggled last time. Focus on form and hitting the bottom of the rep range.";
    } else {
        // STEADY: Maintain weight, try to climb reps
        nextWeight = lastWeight;
        nextReps = `${Math.min(maxReps, Math.max(...actualReps))}-${maxReps}`;
        progressionNote = "Keep the weight, aim for more reps per set.";
    }

    return { nextWeight, nextReps, progressionNote };
}

console.log("🧪 Testing Double Progression Logic (Pure Functions)\n");

const range: [number, number] = [8, 10];

console.log("Test A: Level Up (10, 10, 10 @ 100kg, RPE 8)");
const resA = calculateProgression([10, 10, 10], [100, 100, 100], [8, 8, 8], range);
console.log(`Result: ${resA.nextWeight}kg, reps: ${resA.nextReps} (${resA.progressionNote})\n`);

console.log("Test B: Steady (9, 9, 8 @ 100kg, RPE 9)");
const resB = calculateProgression([9, 9, 8], [100, 100, 100], [9, 9, 9], range);
console.log(`Result: ${resB.nextWeight}kg, reps: ${resB.nextReps} (${resB.progressionNote})\n`);

console.log("Test C: Struggle (7, 6, 6 @ 100kg, RPE 9.5)");
const resC = calculateProgression([7, 6, 6], [100, 100, 100], [9, 10, 10], range);
console.log(`Result: ${resC.nextWeight}kg, reps: ${resC.nextReps} (${resC.progressionNote})\n`);

process.exit(0);
