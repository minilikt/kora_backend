import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class MuscleAggregationService {
    /**
     * Aggregates volume per muscle for a specific session and updates MuscleVolumeHistory.
     * Standard attribution: Primary Muscles = 100%, Secondary = 50%, Stabilizers = 0%.
     */
    static async aggregateSessionVolume(sessionId: string, userId: string, date: Date, tx?: any) {
        const db = tx || prisma;
        const activityDate = new Date(date);
        activityDate.setHours(0, 0, 0, 0);

        // 1. Fetch all exercise logs for this session with their muscle roles
        const exerciseLogs = await db.userExerciseLog.findMany({
            where: { sessionId },
            include: {
                exercise: {
                    include: {
                        muscles: true,
                    },
                },
            },
        });

        const muscleAttributions: Record<number, { volume: number; sets: number }> = {};

        for (const log of exerciseLogs) {
            if (!log.repsPerSet || !log.weightsPerSet) continue;

            const reps = log.repsPerSet as number[];
            const weights = log.weightsPerSet as number[];
            const setsCount = log.actualSets || 0;

            // Calculate raw volume for this exercise
            let exerciseVolume = 0;
            for (let i = 0; i < reps.length; i++) {
                exerciseVolume += (reps[i] || 0) * (weights[i] || 0);
            }

            // Attribute to muscles
            for (const muscleRelation of log.exercise.muscles) {
                let factor = 0;
                if (muscleRelation.role === "PRIMARY") factor = 1.0;
                else if (muscleRelation.role === "SECONDARY") factor = 0.5;

                if (factor > 0) {
                    const muscleId = muscleRelation.muscleId;
                    if (!muscleAttributions[muscleId]) {
                        muscleAttributions[muscleId] = { volume: 0, sets: 0 };
                    }
                    muscleAttributions[muscleId].volume += exerciseVolume * factor;
                    muscleAttributions[muscleId].sets += setsCount;
                }
            }
        }

        // 2. Upsert into MuscleVolumeHistory
        const upserts = Object.entries(muscleAttributions).map(([muscleId, data]) => {
            return db.muscleVolumeHistory.upsert({
                where: {
                    userId_date_muscleId: {
                        userId,
                        date: activityDate,
                        muscleId: parseInt(muscleId),
                    },
                },
                update: {
                    volume: { increment: data.volume },
                    setsCount: { increment: data.sets },
                },
                create: {
                    userId,
                    date: activityDate,
                    muscleId: parseInt(muscleId),
                    volume: data.volume,
                    setsCount: data.sets,
                },
            });
        });

        await Promise.all(upserts);
    }

    /**
     * Updates the hourly distribution for a user's daily activity.
     */
    static async recordHourlyActivity(userId: string, date: Date, tx?: any) {
        const db = tx || prisma;
        const activityDate = new Date(date);
        activityDate.setHours(0, 0, 0, 0);
        const hour = date.getHours();

        const existing = await db.dailyActivity.findUnique({
            where: { userId_date: { userId, date: activityDate } },
        });

        let distribution: Record<string, number> = {};
        if (existing && existing.hourlyDistribution) {
            distribution = existing.hourlyDistribution as Record<string, number>;
        }

        distribution[hour.toString()] = (distribution[hour.toString()] || 0) + 1;

        await db.dailyActivity.upsert({
            where: { userId_date: { userId, date: activityDate } },
            update: {
                hourlyDistribution: distribution,
            },
            create: {
                userId,
                date: activityDate,
                hourlyDistribution: distribution,
                workoutsCount: 0, // Should be incremented by SessionService, but safe here
                activeMinutes: 0,
                successScore: 0,
            },
        });
    }
}
