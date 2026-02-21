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
      // Strategy: Add 1-2 sets to frequently trained muscles
      Object.keys(muscleMetrics).forEach((muscle) => {
        const currentOverride = muscleOverrides[muscle] || 0;
        // Safety bound: max +4 total override sets per muscle from baseline
        if (currentOverride < 4) {
          muscleOverrides[muscle] = currentOverride + 1;
        }
      });
      nextInput.volumeOverrides = muscleOverrides;
    } else if (actions.includes("DECREASE_VOLUME") || actions.includes("SIMPLIFY_VOLUME")) {
      Object.keys(muscleMetrics).forEach((muscle) => {
        const currentOverride = muscleOverrides[muscle] || 0;
        muscleOverrides[muscle] = Math.max(-4, currentOverride - 1);
      });
      nextInput.volumeOverrides = muscleOverrides;
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
