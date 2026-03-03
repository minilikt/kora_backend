import { PrismaClient } from "@prisma/client";
import { ProgressionModelSchema } from "./validation";

const prisma = new PrismaClient() as any;

export class ProgressionEngine {
  static async getModel(idOrName: string) {
    const model = await prisma.progressionModel.findFirst({
      where: {
        OR: [{ id: idOrName }, { name: idOrName }],
      },
    });

    if (!model) {
      throw new Error(`No progression model found for: ${idOrName}.`);
    }

    const weeks = ProgressionModelSchema.parse(model.weeks);

    // Validate continuity
    const weekNumbers = weeks.map((w) => w.week).sort((a, b) => a - b);
    for (let i = 0; i < weekNumbers.length; i++) {
      if (weekNumbers[i] !== i + 1) {
        throw new Error(
          `Progression model weeks must be continuous and start from 1. Found gap at week ${i + 1}.`,
        );
      }
    }

    return {
      ...model,
      weeks,
    };
  }

  static async applyProgression(
    userId: string,
    exerciseId: string,
    baseRepRange: [number, number],
    baseIntensity: number
  ) {
    // 1. Fetch latest performance log for this user and exercise
    const latestLog = await prisma.userExerciseLog.findFirst({
      where: { userId, exerciseId, completed: true },
      orderBy: { createdAt: "desc" },
    });

    if (!latestLog || !latestLog.repsPerSet || !latestLog.weightsPerSet) {
      // No history: return base targets
      return {
        weight: 0, // In Kora, 0 might mean "TBD" or we can default to a % of 1RM if available
        reps: `${baseRepRange[0]}-${baseRepRange[1]}`,
        rpe: 7,
        note: "Initial session - find your baseline load."
      };
    }

    const actualReps = latestLog.repsPerSet as number[];
    const actualWeights = latestLog.weightsPerSet as number[];
    const avgRpe = (latestLog.rpePerSet as number[])?.reduce((a, b) => a + b, 0) / actualReps.length || 8;

    const [minReps, maxReps] = baseRepRange;
    const lastWeight = actualWeights[0] || 0;

    // 2. Progression Logic (Double Progression)
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
      nextReps = `${minReps}-${minReps}`; // Focus on hitting the bottom
      progressionNote = "Struggled last time. Focus on form and hitting the bottom of the rep range.";
    } else {
      // STEADY: Maintain weight, try to climb reps
      nextWeight = lastWeight;
      nextReps = `${Math.min(maxReps, Math.max(...actualReps))}-${maxReps}`;
      progressionNote = "Keep the weight, aim for more reps per set.";
    }

    return {
      weight: nextWeight,
      reps: nextReps,
      rpe: 8, // Standard target
      note: progressionNote
    };
  }
}
