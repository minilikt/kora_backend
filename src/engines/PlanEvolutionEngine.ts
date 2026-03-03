import {
  PrismaClient,
  UserPlan,
  BlockEvaluation,
  UserTrainingProfile,
} from "@prisma/client";
import { PlanCompiler } from "./PlanCompiler";

const prisma = new PrismaClient();

export class PlanEvolutionEngine {
  static async evolvePlan(planId: string) {
    // 0. Check if next plan already exists (prevent duplicates)
    const existingNextPlan = await prisma.userPlan.findFirst({
      where: { previousPlanId: planId },
    });

    if (existingNextPlan) {
      console.log(
        `⚠️ Next plan already exists for plan ${planId}, returning existing.`,
      );
      return existingNextPlan;
    }

    // 1. Fetch Context
    const currentPlan = await prisma.userPlan.findUnique({
      where: { id: planId },
      include: {
        blockEvaluation: true,
        user: { include: { trainingProfile: true } },
      },
    });

    if (
      !currentPlan ||
      !currentPlan.blockEvaluation ||
      !currentPlan.user.trainingProfile
    ) {
      throw new Error("Cannot evolve plan: Missing evaluation or profile data");
    }

    const { blockEvaluation, user } = currentPlan;
    const profile = user.trainingProfile!;
    const lastInput = (currentPlan.planJson as any).input; // The input used for the *current* plan

    // 2. Determine Mutations
    const nextInput = this.applyMutations(lastInput, blockEvaluation, profile);

    // 3. Generate New Plan
    const { planJson } = await PlanCompiler.generate(nextInput);

    // 4. Save New Plan
    const newPlan = await prisma.userPlan.create({
      data: {
        userId: user.id,
        planJson: planJson as any,
        startDate: new Date(), // Starts now
        previousPlanId: currentPlan.id,
      },
    });

    return newPlan;
  }

  private static applyMutations(
    lastInput: any,
    evaluation: BlockEvaluation,
    profile: UserTrainingProfile,
  ): any {
    const nextInput = { ...lastInput };
    const actions = evaluation.actions as string[];
    const muscleMetrics = (evaluation as any).muscleMetrics || {};
    const muscleOverrides: Record<string, number> = { ...(lastInput.volumeOverrides || {}) };

    // --- Volume Adjustment ---
    if (actions.includes("INCREASE_VOLUME")) {
      // Strategy: Add ~5% weekly sets to muscles tracked in evaluation
      Object.entries(muscleMetrics).forEach(([muscle, data]: [string, any]) => {
        const currentOverride = muscleOverrides[muscle] || 0;
        const baselineSets = data.sets; // This is what the user actually did
        const increase = Math.max(1, Math.round(baselineSets * 0.05));

        // Safety bound: max +6 total override sets per muscle from baseline
        if (currentOverride < 6) {
          muscleOverrides[muscle] = currentOverride + increase;
        }
      });
      nextInput.volumeOverrides = muscleOverrides;
    } else if (actions.includes("DECREASE_VOLUME") || actions.includes("SIMPLIFY_VOLUME")) {
      Object.entries(muscleMetrics).forEach(([muscle, data]: [string, any]) => {
        const currentOverride = muscleOverrides[muscle] || 0;
        const baselineSets = data.sets;
        const decrease = Math.max(1, Math.round(baselineSets * 0.1));

        muscleOverrides[muscle] = Math.max(-6, currentOverride - decrease);
      });
      nextInput.volumeOverrides = muscleOverrides;
    }

    if (actions.includes("DELOAD")) {
      nextInput.isDeloadBlock = true; // Flag for PlanCompiler to potentially shift logic
    }

    // --- Intensity Adjustment ---
    if (actions.includes("INCREASE_INTENSITY")) {
      nextInput.rpeOffset = (lastInput.rpeOffset || 0) + 0.5;
    }

    // --- Frequency / Days ---
    if (actions.includes("DECREASE_FREQUENCY")) {
      if (nextInput.days > 2) {
        nextInput.days -= 1;
      }
    }

    return nextInput;
  }
}
