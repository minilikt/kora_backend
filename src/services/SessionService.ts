import { PrismaClient } from "@prisma/client";
import { BlockEvaluationService } from "./BlockEvaluationService";
import { PlanEvolutionEngine } from "../engines/PlanEvolutionEngine";
import { ActivityService } from "./ActivityService";

const prisma = new PrismaClient();

export interface ExerciseSet {
  setIndex: number;
  reps: number;
  weight: number;
  rpe: number;
}

export interface CompletedExercise {
  exerciseId: string;
  timeSpentSec?: number;
  equipmentUsed?: string[];
  notes?: string;
  sets: ExerciseSet[];
}

export interface FinalCompletionPayload {
  planId: string;
  week: number;
  day: number;
  startedAt: string;
  completedAt: string;
  notes?: string;
  exercises: CompletedExercise[];
}

export class SessionService {
  /**
   * Starts a session by marking the startedAt timestamp.
   */
  static async startSession(sessionId: string) {
    return prisma.userSession.update({
      where: { id: sessionId },
      data: {
        startedAt: new Date(),
      },
    });
  }

  /**
   * Completes a session, logs all exercises, and calculates performance metrics.
   */
  static async completeSession(userId: string, input: FinalCompletionPayload) {
    console.log(
      `💪 SessionService: Completing session for plan ${input.planId}, Week ${input.week}, Day ${input.day}...`,
    );

    // 1. Find the UserSession record
    const sessionRecord = await prisma.userSession.findFirst({
      where: {
        planId: input.planId,
        week: input.week,
        dayNumber: input.day,
      },
    });

    if (!sessionRecord) {
      throw new Error(
        `Session not found for Plan ${input.planId}, W${input.week}D${input.day}`,
      );
    }

    const start = new Date(input.startedAt);
    const end = new Date(input.completedAt);
    const totalTimeSec = Math.floor((end.getTime() - start.getTime()) / 1000);

    const updatedSession = await prisma.$transaction(async (tx: any) => {
      let totalActualVolume = 0;
      let totalPlannedVolume = 0;
      let allRpes: number[] = [];

      const plannedData = sessionRecord.planned as any;
      const plannedExercises = plannedData.exercises || [];

      for (const actualEx of input.exercises) {
        const plannedEx = plannedExercises.find(
          (p: any) => p.exerciseId === actualEx.exerciseId,
        );

        const reps = actualEx.sets.map((s) => s.reps);
        const weights = actualEx.sets.map((s) => s.weight);
        const rpes = actualEx.sets.map((s) => s.rpe);
        allRpes.push(...rpes.filter((r) => r > 0));

        // Volume Calculation
        const actualExVolume = actualEx.sets.reduce(
          (sum, s) => sum + s.reps * s.weight,
          0,
        );
        totalActualVolume += actualExVolume;

        if (plannedEx) {
          // Approximate planned volume assuming planned.reps is a number or range (took 10 if range 8-12)
          const pReps =
            typeof plannedEx.reps === "number" ? plannedEx.reps : 10;
          const pWeight = plannedEx.weight || 0;
          totalPlannedVolume += plannedEx.sets * pReps * pWeight;
        }

        // Create log entry
        await tx.userExerciseLog.create({
          data: {
            sessionId: sessionRecord.id,
            exerciseId: actualEx.exerciseId,
            plannedSets: plannedEx?.sets || 0,
            plannedReps: String(plannedEx?.reps || "8-12"),
            plannedRpe: plannedEx?.rpe || 8,
            actualSets: actualEx.sets.length,
            repsPerSet: reps as any,
            weightsPerSet: weights as any,
            rpePerSet: rpes as any,
            timeSpentSec: actualEx.timeSpentSec,
            notes: actualEx.notes,
            equipmentUsed: actualEx.equipmentUsed as any,
            performanceScore: plannedEx
              ? actualExVolume / (plannedEx.sets * 10 * (plannedEx.weight || 1))
              : 1.0,
            completed: true,
          },
        });
      }

      const avgRPE =
        allRpes.length > 0
          ? allRpes.reduce((a, b) => a + b, 0) / allRpes.length
          : null;
      const performanceScore =
        totalPlannedVolume > 0 ? totalActualVolume / totalPlannedVolume : 1.0;

      // 2. Update Session Record
      const updatedSession = await tx.userSession.update({
        where: { id: sessionRecord.id },
        data: {
          startedAt: start,
          completedAt: end,
          completedStatus: true,
          exercisesCount: input.exercises.length,
          totalTimeSec: totalTimeSec,
          avgRPE: avgRPE,
          performanceScore: performanceScore,
          fatigueScore: avgRPE ? avgRPE * 1.2 : 5.0, // Simplified fatigue proxy
          notes: input.notes,
        },
      });

      // 3. Update Adaptive State
      await tx.userAdaptiveState.create({
        data: {
          userId: userId,
          fatigueScore: avgRPE || 5,
          recoveryScore: 5,
          performanceScore: performanceScore,
        },
      });

      // 4. Update Daily Activity via dedicated service
      await ActivityService.recordActivity(
        userId,
        totalTimeSec,
        performanceScore,
        tx,
      );

      return updatedSession;
    });

    // 4. Check if this was the last session and trigger auto-evolution
    const isLast = await this.isLastSession(input.planId, sessionRecord.id);
    if (isLast) {
      console.log(
        `🎉 Final session completed for plan ${input.planId}! Triggering auto-evolution...`,
      );
      // Run evolution asynchronously to not block the response
      // Using setImmediate to ensure it runs after the response is sent
      setImmediate(() => {
        this.triggerAutoEvolution(input.planId, userId);
      });
    }

    return updatedSession;
  }

  /**
   * Checks if the given session is the last session in the plan.
   * Returns true if all sessions in the plan are now completed.
   */
  private static async isLastSession(
    planId: string,
    completedSessionId: string,
  ): Promise<boolean> {
    const allSessions = await prisma.userSession.findMany({
      where: { planId },
      select: { id: true, completedStatus: true },
    });

    // Check if all sessions are completed
    const allCompleted = allSessions.every(
      (s) => s.completedStatus || s.id === completedSessionId,
    );

    return allCompleted;
  }

  /**
   * Triggers automatic plan evolution after the last session is completed.
   * This runs evaluation and generates the next personalized plan.
   */
  private static async triggerAutoEvolution(
    planId: string,
    userId: string,
  ): Promise<void> {
    try {
      console.log(
        `🔄 Auto-evolution triggered for plan ${planId} after final session completion...`,
      );

      // 1. Evaluate the completed training block
      const evaluation = await BlockEvaluationService.evaluateBlock(planId);
      console.log(
        `✅ Block evaluation complete. Actions: ${JSON.stringify(evaluation.actions)}`,
      );

      // 2. Generate the next personalized plan
      const newPlan = await PlanEvolutionEngine.evolvePlan(planId);
      console.log(
        `✅ Next plan generated automatically! Plan ID: ${newPlan.id}`,
      );

      // TODO: Send notification to user that their next plan is ready
      // This could be a push notification, email, or in-app notification
    } catch (error) {
      // Log error but don't fail the session completion
      console.error(
        `❌ Auto-evolution failed for plan ${planId}:`,
        error instanceof Error ? error.message : error,
      );
      // In production, you might want to:
      // - Send an alert to monitoring system
      // - Queue a retry job
      // - Notify admins
    }
  }

  /**
   * Gets the next uncompleted session for the user.
   */
  static async getCurrentSession(userId: string) {
    // 1. Get the current active plan
    const activePlan = await prisma.userPlan.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (!activePlan) return null;

    // 2. Find the first uncompleted session
    return prisma.userSession.findFirst({
      where: {
        userId,
        planId: activePlan.id,
        completedStatus: false,
      },
      orderBy: [{ week: "asc" }, { dayNumber: "asc" }],
      include: {
        exercises: {
          include: {
            exercise: true,
          },
        },
      },
    });
  }
}
