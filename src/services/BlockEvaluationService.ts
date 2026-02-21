import { PrismaClient, UserPlan, UserSession } from "@prisma/client";

const prisma = new PrismaClient();

export class BlockEvaluationService {
  static async evaluateBlock(planId: string) {
    // 0. Check if evaluation already exists (idempotency)
    const existingEvaluation = await prisma.blockEvaluation.findUnique({
      where: { planId },
    });

    if (existingEvaluation) {
      console.log(
        `⚠️ Evaluation already exists for plan ${planId}, returning existing.`,
      );
      return existingEvaluation;
    }

    // 1. Fetch Plan Data
    const plan = await prisma.userPlan.findUnique({
      where: { id: planId },
      include: {
        sessions: {
          include: {
            exercises: {
              include: {
                exercise: {
                  include: {
                    muscles: {
                      include: {
                        muscle: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        user: {
          include: { trainingProfile: true },
        },
      },
    });

    if (!plan) throw new Error("Plan not found");

    const sessions = plan.sessions;
    const trainingDays = sessions.filter((s) => !(s.planned as any)?.rest);

    // 2. Calculate Metrics
    const compliance = this.calculateCompliance(trainingDays);
    const avgRPE = this.calculateAvgRPE(trainingDays);
    const fatigueTrend = this.calculateFatigueTrend(trainingDays);
    const performanceTrend = this.calculatePerformanceTrend(trainingDays);
    const muscleMetrics = this.calculateMuscleMetrics(trainingDays);

    // 3. Determine Actions
    const actions = this.determineActions(
      compliance,
      fatigueTrend,
      performanceTrend,
      avgRPE,
    );

    // 4. Save Evaluation & Update Profile within a Transaction
    const evaluation = await prisma.$transaction(async (tx: any) => {
      const savedEval = await tx.blockEvaluation.create({
        data: {
          planId: plan.id,
          completionRate: compliance,
          avgSessionDuration: this.calculateAvgDuration(trainingDays),
          avgRpe: avgRPE,
          performanceTrend: performanceTrend,
          muscleMetrics: muscleMetrics,
          actions: actions,
        },
      });

      // 5. Update User Profile
      await this.updateUserProfile(
        plan.userId,
        {
          fatigue: fatigueTrend,
          performance: performanceTrend,
          compliance: compliance,
          muscleMetrics: muscleMetrics,
        },
        tx,
      );

      return savedEval;
    });

    return evaluation;
  }

  private static calculateCompliance(sessions: UserSession[]): number {
    if (sessions.length === 0) return 0;
    const completed = sessions.filter((s) => s.completedStatus).length;
    return completed / sessions.length;
  }

  private static calculateAvgRPE(sessions: UserSession[]): number {
    const completed = sessions.filter((s) => s.completedStatus && s.avgRPE);
    if (completed.length === 0) return 0;
    const sum = completed.reduce((acc, s) => acc + (s.avgRPE || 0), 0);
    return sum / completed.length;
  }

  private static calculateAvgDuration(sessions: UserSession[]): number {
    const completed = sessions.filter(
      (s) => s.completedStatus && s.totalTimeSec,
    );
    if (completed.length === 0) return 0;
    const sum = completed.reduce((acc, s) => acc + (s.totalTimeSec || 0), 0);
    return sum / completed.length;
  }

  private static calculateFatigueTrend(sessions: UserSession[]): number {
    // Simple heuristic: Avg RPE of last 3 sessions - Avg RPE of first 3 sessions
    const completed = sessions.filter((s) => s.completedStatus && s.avgRPE);
    if (completed.length < 4) return 0;

    const firstHalf = completed.slice(0, Math.floor(completed.length / 2));
    const lastHalf = completed.slice(Math.ceil(completed.length / 2));

    const avgFirst =
      firstHalf.reduce((acc, s) => acc + (s.avgRPE || 0), 0) / firstHalf.length;
    const avgLast =
      lastHalf.reduce((acc, s) => acc + (s.avgRPE || 0), 0) / lastHalf.length;

    return avgLast - avgFirst; // Positive = Fatigue increasing
  }

  private static calculatePerformanceTrend(sessions: UserSession[]): number {
    // Compare volume load or performance score of late weeks vs early weeks
    const completed = sessions.filter(
      (s) => s.completedStatus && s.performanceScore,
    );
    if (completed.length < 4) return 0;

    const firstHalf = completed.slice(0, Math.floor(completed.length / 2));
    const lastHalf = completed.slice(Math.ceil(completed.length / 2));

    const avgFirst =
      firstHalf.reduce((acc, s) => acc + (s.performanceScore || 0), 0) /
      firstHalf.length;
    const avgLast =
      lastHalf.reduce((acc, s) => acc + (s.performanceScore || 0), 0) /
      lastHalf.length;

    return avgLast - avgFirst; // Positive = Performance improving
  }

  private static calculateMuscleMetrics(sessions: UserSession[]): any {
    const muscleStats: Record<string, { sets: number; volumeLoad: number }> = {};

    sessions.forEach((session) => {
      const logs = (session as any).exercises || [];
      logs.forEach((log: any) => {
        const actualSets = log.actualSets || 0;
        const exercise = log.exercise;
        if (!exercise || !exercise.muscles) return;

        exercise.muscles.forEach((em: any) => {
          const muscleName = em.muscle.name;
          const multiplier = em.activationMultiplier || 1.0;
          const effectiveSets = actualSets * multiplier;

          if (!muscleStats[muscleName]) {
            muscleStats[muscleName] = { sets: 0, volumeLoad: 0 };
          }

          muscleStats[muscleName].sets += effectiveSets;
          // volumeLoad = sets * weight * reps (simplified)
          const weights = (log.weightsPerSet as number[]) || [];
          const reps = (log.repsPerSet as number[]) || [];
          let logVolume = 0;
          for (let i = 0; i < Math.min(weights.length, reps.length); i++) {
            logVolume += weights[i] * reps[i];
          }
          muscleStats[muscleName].volumeLoad += logVolume * multiplier;
        });
      });
    });

    return muscleStats;
  }

  private static determineActions(
    compliance: number,
    fatigueTrend: number,
    perfTrend: number,
    avgRPE: number,
  ): string[] {
    const actions: string[] = [];

    // Compliance Check
    if (compliance < 0.7) {
      actions.push("DECREASE_FREQUENCY");
      actions.push("SIMPLIFY_VOLUME");
      return actions; // Critical failure, don't overload
    }

    // Performance/Fatigue Matrix
    if (perfTrend > 0 && fatigueTrend < 0.5 && avgRPE < 8.5) {
      // Strong adaptation, room to push
      actions.push("INCREASE_VOLUME");
      actions.push("INCREASE_INTENSITY");
    } else if (perfTrend <= 0 && fatigueTrend > 1.0) {
      // Stalling and tired
      actions.push("DELOAD");
      actions.push("DECREASE_VOLUME");
    } else if (Math.abs(perfTrend) < 0.1 && fatigueTrend < 0.5) {
      // Stalling but fresh -> Stimulus likely stale
      actions.push("CHANGE_VARIATIONS");
      actions.push("INCREASE_INTENSITY");
    } else {
      // Maintenance / Steady State
      actions.push("MAINTAIN");
    }

    return actions;
  }

  private static async updateUserProfile(userId: string, stats: any, tx?: any) {
    const db = tx || prisma;
    // Upsert profile
    const existing = await db.userTrainingProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      // Update running averages
      const prevProfile = (existing.muscleProfile as any) || {};
      const nextProfile = { ...prevProfile };

      // Update MEV/MRV logic (simplified)
      Object.entries(stats.muscleMetrics || {}).forEach(([muscle, data]: [string, any]) => {
        const prev = prevProfile[muscle] || { avgSets: 0, count: 0 };
        nextProfile[muscle] = {
          avgSets: (prev.avgSets * prev.count + data.sets) / (prev.count + 1),
          count: prev.count + 1,
        };
      });

      await db.userTrainingProfile.update({
        where: { userId },
        data: {
          fatigueIndex: (existing.fatigueIndex + stats.fatigue) / 2,
          performanceIndex: (existing.performanceIndex + stats.performance) / 2,
          consistencyScore: (existing.consistencyScore + stats.compliance) / 2,
          muscleProfile: nextProfile,
        },
      });
    } else {
      await db.userTrainingProfile.create({
        data: {
          userId,
          fatigueIndex: stats.fatigue,
          performanceIndex: stats.performance,
          consistencyScore: stats.compliance,
          muscleProfile: stats.muscleMetrics,
        },
      });
    }
  }
}
