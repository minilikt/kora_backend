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

    // --- Volume Adjustment ---
    // If "INCREASE_VOLUME", boost weekly sets by ~10-20%
    if (actions.includes("INCREASE_VOLUME")) {
      // Example: Add 2 sets to major muscle groups
      // Ideally we'd modify the specific muscleProfile in UserTrainingProfile
      // For now, we don't have a direct "volume" slider in PlanInput other than "experienceLevel" or "goal"
      // OR we can inject a custom volume override if PlanGenerator supports it.
      // Assuming PlanGenerator reads from VolumeProfile based on Level:

      // Strategy: Upgrade Experience Level if possible
      if (lastInput.level === "BEGINNER") {
        nextInput.level = "INTERMEDIATE";
      } else if (lastInput.level === "INTERMEDIATE") {
        // Can't just jump to advanced easily, maybe we need a custom volume modifier in input?
        // For this iteration, let's assume we can pass a "volumeMultiplier"
        nextInput.volumeMultiplier = (lastInput.volumeMultiplier || 1.0) * 1.1;
      }
    } else if (
      actions.includes("DECREASE_VOLUME") ||
      actions.includes("SIMPLIFY_VOLUME")
    ) {
      nextInput.volumeMultiplier = (lastInput.volumeMultiplier || 1.0) * 0.85;
    }

    // --- Intensity Adjustment ---
    // If "INCREASE_INTENSITY", bump the RPE targets
    if (actions.includes("INCREASE_INTENSITY")) {
      // e.g. RPE 8 -> 9
      nextInput.rpeOffset = (lastInput.rpeOffset || 0) + 1;
    }

    // --- Frequency / Days ---
    if (actions.includes("DECREASE_FREQUENCY")) {
      if (nextInput.daysPerWeek > 2) {
        nextInput.daysPerWeek -= 1;
      }
    }

    return nextInput;
  }
}
