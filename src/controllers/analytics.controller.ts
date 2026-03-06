import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { ActivityService } from "../services/ActivityService";
import { AppError } from "../middlewares/error.middleware";

const prisma = new PrismaClient();

function getDateRange(filter: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  switch (filter?.toLowerCase()) {
    case "day":
      start.setDate(end.getDate() - 1);
      break;
    case "week":
      start.setDate(end.getDate() - 7);
      break;
    case "month":
      start.setMonth(end.getMonth() - 1);
      break;
    case "year":
      start.setFullYear(end.getFullYear() - 1);
      break;
    default:
      start.setDate(end.getDate() - 30);
  }
  return { start, end };
}

// ─── GET /analytics/daily-activity ───────────────────────────────────────────

export const getDailyActivity = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const activities = await ActivityService.getActivities(req.user.userId);
    res.status(200).json({ status: "success", data: { activities } });
  } catch (error) {
    next(error);
  }
};

// ─── GET /analytics/summary ──────────────────────────────────────────────────

export const getSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const { filter = "month" } = req.query;
    const { start, end } = getDateRange(String(filter));
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { streakCount: true, totalActiveHours: true }
    });

    const streakCount = user?.streakCount || 0;
    const totalActiveHours = user?.totalActiveHours || 0;

    // Use DailyActivity aggregation for tonnage and calories (much faster than scanning sessions)
    const stats = await prisma.dailyActivity.aggregate({
      where: {
        userId,
        date: { gte: start, lte: end },
      },
      _sum: {
        totalTonnage: true,
        caloriesBurned: true,
        activeMinutes: true,
        workoutsCount: true,
      }
    });

    const totalTonnage = stats._sum.totalTonnage || 0;
    const caloriesBurned = stats._sum.caloriesBurned || 0;
    const totalDuration = (stats._sum.activeMinutes || 0) * 60;
    const totalWorkouts = stats._sum.workoutsCount || 0;

    // Remaining sessions in active plan
    const activePlan = await prisma.userPlan.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { sessions: true }
        }
      }
    });

    const uncompletedSessionsCount = activePlan
      ? await prisma.userSession.count({ where: { planId: activePlan.id, completedStatus: false } })
      : 0;

    const totalSessions = activePlan?._count.sessions ?? 0;
    const completedInPlan = totalSessions - uncompletedSessionsCount;
    const progressPercent =
      totalSessions > 0
        ? Math.round((completedInPlan / totalSessions) * 100)
        : 0;

    res.status(200).json({
      status: "success",
      data: {
        summary: {
          currentStreak: streakCount,
          progressPercent,
          totalTonnage: Math.round(totalTonnage),
          remainingCount: uncompletedSessionsCount,
          caloriesBurned,
          totalDuration,
          totalWorkouts,
          totalActiveHours,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /analytics/trends ───────────────────────────────────────────────────

export const getTrends = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const { metric = "Weight", filter = "month" } = req.query;
    const { start, end } = getDateRange(String(filter));
    const userId = req.user.userId;

    const m = String(metric).toLowerCase();

    if (m === "bodyweight") {
      const weights = await (prisma as any).weightHistory.findMany({
        where: { userId, date: { gte: start, lte: end } },
        orderBy: { date: "asc" }
      });
      const labels = weights.map((w: any) => new Date(w.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }));
      const dataPoints = weights.map((w: any) => w.weight);
      return res.status(200).json({ status: "success", data: { labels, datasets: [{ data: dataPoints }] } });
    }

    // Pull directly from DailyActivity (much more efficient than session iteration)
    const activities = await prisma.dailyActivity.findMany({
      where: {
        userId,
        date: { gte: start, lte: end },
      },
      orderBy: { date: "asc" },
    });

    const labels = activities.map(a => new Date(a.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }));

    const dataPoints = activities.map(a => {
      if (m === "weight" || m === "tonnage") return Math.round(a.totalTonnage);
      if (m === "calories") return a.caloriesBurned;
      if (m === "time") return a.activeMinutes;
      return 0;
    });

    res.status(200).json({
      status: "success",
      data: { labels, datasets: [{ data: dataPoints }] },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /analytics/muscles ──────────────────────────────────────────────────

export const getMuscleDistribution = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const { filter = "month" } = req.query;
    const { start, end } = getDateRange(String(filter));
    const userId = req.user.userId;

    const volumeHistory = await prisma.muscleVolumeHistory.findMany({
      where: {
        userId,
        date: { gte: start, lte: end },
      },
      include: { muscle: true },
    });

    const distribution: Record<string, number> = {};
    for (const record of volumeHistory) {
      const name = record.muscle.name;
      distribution[name] = (distribution[name] || 0) + record.volume;
    }

    res.status(200).json({
      status: "success",
      data: { distribution },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /analytics/heatmap ──────────────────────────────────────────────────

export const getHeatmap = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const days = parseInt(String(req.query.days || "90"));
    const userId = req.user.userId;
    const start = new Date();
    start.setDate(start.getDate() - days);

    const sessions = await prisma.userSession.findMany({
      where: { userId, completedStatus: true, completedAt: { gte: start } },
      select: { completedAt: true },
    });

    const countByDate: Record<string, number> = {};
    for (const s of sessions) {
      if (!s.completedAt) continue;
      const key = new Date(s.completedAt).toISOString().split("T")[0];
      countByDate[key] = (countByDate[key] || 0) + 1;
    }

    const data = Object.entries(countByDate).map(([date, count]) => ({
      date,
      count,
    }));

    res.status(200).json({ status: "success", data: { data } });
  } catch (error) {
    next(error);
  }
};

// ─── GET /analytics/profile-summary ─────────────────────────────────────────

export const getProfileSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        trainingProfile: true,
        _count: {
          select: { userSessions: { where: { completedStatus: true } } }
        }
      },
    });
    if (!user) throw new AppError("User not found", 404);

    const totalWorkouts = user._count.userSessions;

    const totalTimeAgg = await prisma.dailyActivity.aggregate({
      where: { userId },
      _sum: { activeMinutes: true }
    });

    const totalExercises = await prisma.userExerciseLog.count({
      where: { session: { userId, completedStatus: true } },
    });

    // Progress Calculation
    const activePlan = await prisma.userPlan.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { sessions: true }
        }
      }
    });

    let progressPercent = 0;
    if (activePlan) {
      const totalSessions = activePlan._count.sessions;
      const completedSessions = await prisma.userSession.count({
        where: { planId: activePlan.id, completedStatus: true },
      });
      progressPercent =
        totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
    }

    const consistency = user.trainingProfile?.consistencyScore ?? 0;
    const bmi = user.bmi ?? 0;
    const bmiStatus =
      bmi < 18.5
        ? "Underweight"
        : bmi < 25
          ? "Normal"
          : bmi < 30
            ? "Overweight"
            : "Obese";

    // Best lifts - Querying the dedicated table (much faster)
    const bestPRs = await prisma.userPersonalRecord.findMany({
      where: { userId },
      include: { exercise: true },
      orderBy: { weight: "desc" },
      take: 3
    });

    const bestOf = bestPRs.map(pr => ({
      name: pr.exercise.name,
      weight: pr.weight,
      reps: pr.reps,
      icon: "🏆",
    }));

    res.status(200).json({
      status: "success",
      data: {
        stats: {
          totalWorkouts,
          totalHours: Math.round(((totalTimeAgg._sum.activeMinutes || 0) / 60) * 10) / 10,
          totalExercises,
          currentStreak: user.streakCount,
          consistency: Math.round(consistency * 100),
          bmi: Math.round(bmi * 10) / 10,
          bmiStatus,
          goalWeight: user.targetWeight ?? 0,
          progress: progressPercent,
        },
        bestOf,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /analytics/history ──────────────────────────────────────────────────

export const getHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const userId = req.user.userId;
    const limit = parseInt(String(req.query.limit || "20"));
    const offset = parseInt(String(req.query.offset || "0"));

    const sessions = await prisma.userSession.findMany({
      where: { userId, completedStatus: true },
      orderBy: { completedAt: "desc" },
      skip: offset,
      take: limit,
      include: {
        exercises: { include: { exercise: true } },
        plan: true,
      },
    });

    const history = sessions.map((s) => ({
      id: s.id,
      date: s.completedAt || s.createdAt,
      duration: s.totalTimeSec || 0,
      exercisesCompleted: s.exercises.length,
      caloriesBurned: Math.round(((s.totalTimeSec || 0) / 60) * 5),
      weightLifted: s.exercises.reduce((sum: number, log: any) => {
        const weights = (log.weightsPerSet as number[]) || [];
        const reps = (log.repsPerSet as number[]) || [];
        return sum + weights.reduce((v, w, i) => v + w * (reps[i] || 0), 0);
      }, 0),
      planName: (s.plan as any)?.planJson?.name || "Workout",
      sessionName:
        (s.planned as any)?.name || `Week ${s.week} Day ${s.dayNumber}`,
      performanceScore: s.performanceScore || 0,
    }));

    res.status(200).json({ status: "success", data: { history } });
  } catch (error) {
    next(error);
  }
};

// ─── GET /analytics/personal-records ─────────────────────────────────────────

export const getPersonalRecords = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const userId = req.user.userId;

    const prs = await prisma.userPersonalRecord.findMany({
      where: { userId },
      include: { exercise: true },
      orderBy: { updatedAt: "desc" },
      take: 20
    });

    const records = prs.map(pr => ({
      exerciseName: pr.exercise.name,
      weight: pr.weight,
      reps: pr.reps,
      date: pr.date,
      icon: "🏅",
    }));

    res.status(200).json({ status: "success", data: { records } });
  } catch (error) {
    next(error);
  }
};

// ─── GET /analytics/streak ───────────────────────────────────────────────────

export const getStreak = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { streakCount: true, longestStreak: true, lastActiveAt: true }
    });

    res.status(200).json({
      status: "success",
      data: {
        currentStreak: user?.streakCount || 0,
        longestStreak: user?.longestStreak || 0,
        lastWorkoutDate: user?.lastActiveAt || ""
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /analytics/last-workout ─────────────────────────────────────────────

export const getLastWorkout = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const userId = req.user.userId;

    const session = await prisma.userSession.findFirst({
      where: { userId, completedStatus: true },
      orderBy: { completedAt: "desc" },
      include: {
        exercises: { include: { exercise: true } },
        plan: true,
      },
    });

    if (!session) {
      return res
        .status(200)
        .json({ status: "success", data: { workout: null } });
    }

    const workout = {
      id: session.id,
      date: session.completedAt || session.createdAt,
      duration: session.totalTimeSec || 0,
      exercisesCompleted: session.exercises.length,
      totalExercises: session.exercises.length,
      caloriesBurned: Math.round(((session.totalTimeSec || 0) / 60) * 5),
      weightLifted: session.exercises.reduce((sum: number, log: any) => {
        const weights = (log.weightsPerSet as number[]) || [];
        const reps = (log.repsPerSet as number[]) || [];
        return sum + weights.reduce((v, w, i) => v + w * (reps[i] || 0), 0);
      }, 0),
      planName: (session.plan as any)?.planJson?.name || "Workout",
      sessionName:
        (session.planned as any)?.name ||
        `Week ${session.week} Day ${session.dayNumber}`,
    };

    res.status(200).json({ status: "success", data: { workout } });
  } catch (error) {
    next(error);
  }
};

// ─── GET /analytics/exercise/:exerciseId/history ────────────────────────────

export const getExerciseHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const { exerciseId } = req.params;
    const userId = req.user.userId;

    const logs = await prisma.userExerciseLog.findMany({
      where: {
        exerciseId: String(exerciseId),
        session: { userId, completedStatus: true },
      },
      orderBy: { createdAt: "desc" },
      include: {
        session: {
          select: { completedAt: true, performanceScore: true }
        }
      },
      take: 20
    });

    const history = logs.map((log: any) => {
      const weights = (log.weightsPerSet as number[]) || [];
      const reps = (log.repsPerSet as number[]) || [];
      const volume = weights.reduce((sum, w, i) => sum + w * (reps[i] || 0), 0);
      const maxWeight = weights.length > 0 ? Math.max(...weights) : 0;

      return {
        date: log.session.completedAt,
        volume,
        maxWeight,
        reps: reps.reduce((a, b) => a + b, 0),
        sets: log.actualSets,
        performanceScore: log.performanceScore,
        sessionPerformance: log.session.performanceScore
      };
    });

    res.status(200).json({
      status: "success",
      data: { history }
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /analytics/done-exercises ──────────────────────────────────────────

export const getDoneExercises = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const userId = req.user.userId;

    // Get unique exercise IDs performed by the user
    const logs = await prisma.userExerciseLog.findMany({
      where: {
        session: { userId, completedStatus: true },
      },
      select: {
        exercise: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Group by exercise ID to get unique list with last done date
    const uniqueExercises: Record<string, { id: string; name: string; lastDone: Date }> = {};

    for (const log of logs) {
      if (!uniqueExercises[log.exercise.id]) {
        uniqueExercises[log.exercise.id] = {
          id: log.exercise.id,
          name: log.exercise.name,
          lastDone: log.createdAt,
        };
      }
    }

    res.status(200).json({
      status: "success",
      data: { exercises: Object.values(uniqueExercises) },
    });
  } catch (error) {
    next(error);
  }
};
