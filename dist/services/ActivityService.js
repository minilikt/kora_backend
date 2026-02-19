"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class ActivityService {
    /**
     * Records or updates daily activity based on a completed session.
     * Accepts an optional transaction client to ensure atomicity.
     */
    static async recordActivity(userId, totalTimeSec, performanceScore, tx) {
        const db = tx || prisma;
        const activityDate = new Date();
        activityDate.setHours(0, 0, 0, 0);
        const activeMinutes = Math.floor(totalTimeSec / 60);
        return db.dailyActivity.upsert({
            where: {
                userId_date: {
                    userId,
                    date: activityDate,
                },
            },
            update: {
                activeMinutes: { increment: activeMinutes },
                workoutsCount: { increment: 1 },
                // We'll store a cumulative success score and divide by workoutsCount in the getter if needed,
                // or just keep it as a running average. Let's do a running average for now.
                successScore: {
                    set: await this.calculateRunningSuccessScore(userId, activityDate, performanceScore, db),
                },
            },
            create: {
                userId,
                date: activityDate,
                activeMinutes: activeMinutes,
                workoutsCount: 1,
                successScore: performanceScore,
            },
        });
    }
    /**
     * Calculates a running average for the success score of the day.
     */
    static async calculateRunningSuccessScore(userId, date, newScore, tx) {
        const db = tx || prisma;
        const existing = await db.dailyActivity.findUnique({
            where: { userId_date: { userId, date } },
            select: { successScore: true, workoutsCount: true },
        });
        if (!existing)
            return newScore;
        const totalCount = existing.workoutsCount + 1;
        return ((existing.successScore * existing.workoutsCount + newScore) / totalCount);
    }
    /**
     * Retrieves daily activities for a user within a specific date range.
     */
    static async getActivities(userId, limit = 30) {
        return prisma.dailyActivity.findMany({
            where: { userId },
            orderBy: { date: "desc" },
            take: limit,
        });
    }
}
exports.ActivityService = ActivityService;
//# sourceMappingURL=ActivityService.js.map