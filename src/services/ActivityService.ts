import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class ActivityService {
  /**
   * Records or updates daily activity based on a completed session.
   * Also updates user-level aggregate metrics (total hours, streaks).
   */
  static async recordActivity(
    userId: string,
    totalTimeSec: number,
    totalTonnage: number,
    performanceScore: number,
    date?: Date,
    tx?: any,
  ) {
    const db = tx || prisma;
    const activityDate = new Date(date || Date.now());
    const originalDate = new Date(activityDate);
    activityDate.setHours(0, 0, 0, 0);

    const activeMinutes = Math.floor(totalTimeSec / 60);
    const activeHours = totalTimeSec / 3600;

    // 1. Update DailyActivity record
    const daily = await db.dailyActivity.upsert({
      where: {
        userId_date: {
          userId,
          date: activityDate,
        },
      },
      update: {
        activeMinutes: { increment: activeMinutes },
        workoutsCount: { increment: 1 },
        totalTonnage: { increment: totalTonnage },
        caloriesBurned: { increment: Math.round((totalTimeSec / 60) * 5) },
        successScore: {
          set: await this.calculateRunningSuccessScore(
            userId,
            activityDate,
            performanceScore,
            db,
          ),
        },
      },
      create: {
        userId,
        date: activityDate,
        activeMinutes: activeMinutes,
        workoutsCount: 1,
        totalTonnage: totalTonnage,
        caloriesBurned: Math.round((totalTimeSec / 60) * 5),
        successScore: performanceScore,
      },
    });

    // 2. Update User-level aggregates
    // We calculate streak by fetching recent activity dates
    const streakData = await this.calculateStreak(userId, db);

    await db.user.update({
      where: { id: userId },
      data: {
        totalActiveHours: { increment: activeHours },
        lastActiveAt: originalDate,
        streakCount: streakData.currentStreak,
        longestStreak: {
          set: streakData.currentStreak > streakData.longestStreak
            ? streakData.currentStreak
            : streakData.longestStreak
        }
      },
    });

    return daily;
  }

  /**
   * Logs user body weight and updates the profile.
   */
  static async logWeight(userId: string, weight: number, date?: Date, tx?: any) {
    const db = tx || prisma;
    const logDate = new Date(date || Date.now());
    logDate.setHours(0, 0, 0, 0);

    await db.weightHistory.upsert({
      where: {
        userId_date: {
          userId,
          date: logDate,
        },
      },
      update: { weight },
      create: { userId, weight, date: logDate },
    });

    return db.user.update({
      where: { id: userId },
      data: { weight },
    });
  }

  /**
   * Calculates current streak based on daily activity records.
   */
  private static async calculateStreak(userId: string, tx: any) {
    const activities = await tx.dailyActivity.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      select: { date: true },
      take: 100, // Reasonable window for streak
    });

    if (activities.length === 0) return { currentStreak: 0, longestStreak: 0 };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { longestStreak: true },
    });

    let currentStreak = 0;
    const dates = activities.map((a: any) => {
      const d = new Date(a.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    });

    // Check if the most recent activity is today or yesterday
    const lastActivityTime = dates[0];
    const diffDays = Math.round((today.getTime() - lastActivityTime) / (1000 * 3600 * 24));

    if (diffDays <= 1) {
      currentStreak = 1;
      for (let i = 1; i < dates.length; i++) {
        const prevTime = dates[i - 1];
        const currTime = dates[i];
        const diff = Math.round((prevTime - currTime) / (1000 * 3600 * 24));

        if (diff === 1) {
          currentStreak++;
        } else if (diff === 0) {
          continue; // Same day multiple workouts
        } else {
          break;
        }
      }
    }

    return {
      currentStreak,
      longestStreak: user?.longestStreak || 0
    };
  }

  /**
   * Calculates a running average for the success score of the day.
   */
  private static async calculateRunningSuccessScore(
    userId: string,
    date: Date,
    newScore: number,
    tx?: any,
  ): Promise<number> {
    const db = tx || prisma;
    const existing = await db.dailyActivity.findUnique({
      where: { userId_date: { userId, date } },
      select: { successScore: true, workoutsCount: true },
    });

    if (!existing) return newScore;

    const totalCount = existing.workoutsCount + 1;
    return (
      (existing.successScore * existing.workoutsCount + newScore) / totalCount
    );
  }

  /**
   * Retrieves daily activities for a user within a specific date range.
   */
  static async getActivities(userId: string, limit: number = 30) {
    return prisma.dailyActivity.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: limit,
    });
  }
}
