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

    const sessions = await prisma.userSession.findMany({
      where: {
        userId,
        completedStatus: true,
        completedAt: { gte: start, lte: end },
      },
      include: { exercises: { include: { exercise: true } } },
    });

    const totalWorkouts = sessions.length;
    const totalDuration = sessions.reduce(
      (sum, s) => sum + (s.totalTimeSec || 0),
      0,
    );
    const caloriesBurned = Math.round((totalDuration / 60) * 5); // ~5 cal/min estimate
    const totalTonnage = sessions.reduce((sum, s) => sum + (s.totalTonnage || 0), 0);

    // Streak
    const allSessions = await prisma.userSession.findMany({
      where: { userId, completedStatus: true },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true },
    });

    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const seen = new Set<string>();
    for (const s of allSessions) {
      if (!s.completedAt) continue;
      const d = new Date(s.completedAt);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString();
      if (!seen.has(key)) {
        seen.add(key);
        const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
        if (diff === currentStreak) currentStreak++;
        else break;
      }
    }

    // Remaining sessions in active plan
    const activePlan = await prisma.userPlan.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { sessions: { where: { completedStatus: false } } },
    });
    const remainingCount = activePlan?.sessions.length ?? 0;

    const totalSessions = activePlan
      ? await prisma.userSession.count({ where: { planId: activePlan.id } })
      : 0;
    const completedInPlan = totalSessions - remainingCount;
    const progressPercent =
      totalSessions > 0
        ? Math.round((completedInPlan / totalSessions) * 100)
        : 0;

    res.status(200).json({
      status: "success",
      data: {
        summary: {
          currentStreak,
          progressPercent,
          totalTonnage: Math.round(totalTonnage),
          remainingCount,
          caloriesBurned,
          totalDuration,
          totalWorkouts,
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

    const sessions = await prisma.userSession.findMany({
      where: {
        userId,
        completedStatus: true,
        completedAt: { gte: start, lte: end },
      },
      orderBy: { completedAt: "asc" },
    });

    // Group by date to avoid multiple points for the same day
    const groupedData: Record<string, number> = {};
    const m = String(metric).toLowerCase();

    for (const s of sessions) {
      if (!s.completedAt) continue;
      const dateKey = new Date(s.completedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      let value = 0;
      if (m === "weight" || m === "tonnage") {
        value = s.totalTonnage || 0;
      } else if (m === "calories") {
        value = Math.round(((s.totalTimeSec || 0) / 60) * 5);
      } else if (m === "time") {
        value = Math.round((s.totalTimeSec || 0) / 60);
      }

      groupedData[dateKey] = (groupedData[dateKey] || 0) + value;
    }

    const labels = Object.keys(groupedData);
    const dataPoints = Object.values(groupedData).map(v => Math.round(v));

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
      include: { trainingProfile: true },
    });
    if (!user) throw new AppError("User not found", 404);

    const totalWorkouts = await prisma.userSession.count({
      where: { userId, completedStatus: true },
    });

    const totalTimeSec = await prisma.userSession.aggregate({
      where: { userId, completedStatus: true },
      _sum: { totalTimeSec: true },
    });

    const totalExercises = await prisma.userExerciseLog.count({
      where: { session: { userId, completedStatus: true } },
    });

    // Streak
    const allSessions = await prisma.userSession.findMany({
      where: { userId, completedStatus: true },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true },
    });
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const seen = new Set<string>();
    for (const s of allSessions) {
      if (!s.completedAt) continue;
      const d = new Date(s.completedAt);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString();
      if (!seen.has(key)) {
        seen.add(key);
        const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
        if (diff === currentStreak) currentStreak++;
        else break;
      }
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

    // Best lifts (top 3 by weight - using max weight from any log)
    const topExercises = await prisma.userExerciseLog.findMany({
      where: { session: { userId, completedStatus: true } },
      include: { exercise: true },
    });

    // We need to sort manually or find a way to get max from JSON in query (easier to fetch and sort for now)
    const bestOf = topExercises
      .map((log: any) => {
        const weights = (log.weightsPerSet as number[]) || [];
        const maxWeight = weights.length > 0 ? Math.max(...weights) : 0;
        const reps = (log.repsPerSet as number[]) || [];
        const maxWeightIndex = weights.indexOf(maxWeight);
        return {
          name: log.exercise.name,
          weight: maxWeight,
          reps: reps[maxWeightIndex] || 0,
          icon: "🏆",
        };
      })
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3);

    res.status(200).json({
      status: "success",
      data: {
        stats: {
          totalWorkouts,
          totalHours:
            Math.round(((totalTimeSec._sum.totalTimeSec || 0) / 3600) * 10) /
            10,
          totalExercises,
          currentStreak,
          consistency: Math.round(consistency * 100),
          bmi: Math.round(bmi * 10) / 10,
          bmiStatus,
          goalWeight: user.targetWeight ?? 0,
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

    // Get best weight per exercise using max weight from JSON
    const logs = await prisma.userExerciseLog.findMany({
      where: { session: { userId, completedStatus: true } },
      include: { exercise: true, session: { select: { completedAt: true, createdAt: true } } },
    });

    const bestByExercise: Record<string, any> = {};
    for (const log of logs) {
      const weights = (log.weightsPerSet as number[]) || [];
      const reps = (log.repsPerSet as number[]) || [];
      const maxWeight = weights.length > 0 ? Math.max(...weights) : 0;
      const maxWeightIndex = weights.indexOf(maxWeight);

      if (
        maxWeight > 0 &&
        (!bestByExercise[log.exerciseId] ||
          maxWeight > bestByExercise[log.exerciseId].weight)
      ) {
        bestByExercise[log.exerciseId] = {
          exerciseName: log.exercise.name,
          weight: maxWeight,
          reps: reps[maxWeightIndex] || 0,
          date: log.session.completedAt || log.session.createdAt,
          icon: "🏅",
        };
      }
    }

    const records = Object.values(bestByExercise)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10);

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

    const sessions = await prisma.userSession.findMany({
      where: { userId, completedStatus: true },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const uniqueDays: Date[] = [];
    const seen = new Set<string>();
    for (const s of sessions) {
      if (!s.completedAt) continue;
      const d = new Date(s.completedAt);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueDays.push(d);
      }
    }

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    const lastWorkoutDate = uniqueDays[0] ? uniqueDays[0].toISOString() : "";

    // Calculate current streak (must have workout today or yesterday)
    if (uniqueDays.length > 0) {
      const diffSinceLast = Math.round((today.getTime() - uniqueDays[0].getTime()) / 86400000);
      if (diffSinceLast <= 1) {
        currentStreak = 1;
        for (let i = 1; i < uniqueDays.length; i++) {
          const diff = Math.round((uniqueDays[i - 1].getTime() - uniqueDays[i].getTime()) / 86400000);
          if (diff === 1) currentStreak++;
          else break;
        }
      }
    }

    // Calculate longest streak in history
    if (uniqueDays.length > 0) {
      tempStreak = 1;
      longestStreak = 1;
      for (let i = 1; i < uniqueDays.length; i++) {
        const diff = Math.round((uniqueDays[i - 1].getTime() - uniqueDays[i].getTime()) / 86400000);
        if (diff === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
        longestStreak = Math.max(longestStreak, tempStreak);
      }
    }

    res.status(200).json({
      status: "success",
      data: { currentStreak, longestStreak, lastWorkoutDate },
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
