import { UserTrainingProfile, BlockEvaluation, TrainingGoal, ExperienceLevel } from "@prisma/client";
import prisma from "../lib/prisma";
import { VolumeProfileSchema } from "./validation";

export class VolumeEngine {
  static async getProfile(
    goal: string,
    level: string,
    context?: {
      gender?: string | null;
      profile?: UserTrainingProfile | null;
      evaluation?: BlockEvaluation | null;
    }
  ) {
    const profile = await (prisma.volumeProfile as any).findFirst({
      where: {
        goal: goal as TrainingGoal,
        experienceLevel: level as ExperienceLevel
      },
    });

    if (!profile) {
      throw new Error(
        `No volume profile found for goal: ${goal} and level: ${level}.`,
      );
    }

    const baseWeeklySets = VolumeProfileSchema.parse(profile.weeklySets);
    const modifier = this.calculateModifier(goal, context);

    const weeklySets: Record<string, number> = {};
    Object.entries(baseWeeklySets).forEach(([muscle, sets]) => {
      weeklySets[muscle] = Math.round(sets * modifier);
    });

    return {
      ...profile,
      weeklySets,
      modifier,
    };
  }

  private static calculateModifier(
    goal: string,
    context?: {
      gender?: string | null;
      profile?: UserTrainingProfile | null;
      evaluation?: BlockEvaluation | null;
    }
  ): number {
    let modifier = 1.0;

    if (!context) return modifier;

    // 2B -- Sex Adjustment
    if (context.gender === "FEMALE") {
      modifier += 0.05;
    }

    // 2C -- Recovery Trend Adjustment
    if (context.profile) {
      const fatigue = context.profile.fatigueIndex;
      if (fatigue > 8) modifier -= 0.1;
      else if (fatigue >= 6) modifier -= 0.05;
      else if (fatigue < 5) modifier += 0.05;
    }

    // 2D -- Adherence Adjustment
    // Use evaluation completion rate if available, otherwise fallback to consistency score
    const adherence = context.evaluation
      ? context.evaluation.completionRate
      : (context.profile?.consistencyScore || 1.0);

    if (adherence > 0.9) modifier += 0.05;
    else if (adherence < 0.7) modifier -= 0.1;

    // 2E -- Goal Adjustment
    if (goal === "MAINTENANCE" || goal === "FAT_LOSS") {
      modifier *= 0.9;
    }

    return parseFloat(modifier.toFixed(2));
  }
}
