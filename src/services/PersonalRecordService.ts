import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class PersonalRecordService {
    /**
     * Scans session logs for new personal records and updates the UserPersonalRecord table.
     */
    static async updatePRsFromSession(userId: string, logs: any[], date: Date, tx?: any) {
        const db = tx || prisma;

        for (const log of logs) {
            const weights = (log.weightsPerSet as number[]) || [];
            const reps = (log.repsPerSet as number[]) || [];
            if (weights.length === 0) continue;

            // Find max weight in this exercise log
            let maxWeight = 0;
            let associatedReps = 0;

            for (let i = 0; i < weights.length; i++) {
                const w = weights[i] || 0;
                const r = reps[i] || 0;
                if (w > maxWeight) {
                    maxWeight = w;
                    associatedReps = r;
                } else if (w === maxWeight && r > associatedReps) {
                    // If weights are equal, higher reps win for the record
                    associatedReps = r;
                }
            }

            if (maxWeight <= 0) continue;

            // Check existing record
            const existingRecord = await db.userPersonalRecord.findUnique({
                where: {
                    userId_exerciseId: {
                        userId,
                        exerciseId: log.exerciseId,
                    },
                },
            });

            if (!existingRecord || maxWeight > existingRecord.weight || (maxWeight === existingRecord.weight && associatedReps > existingRecord.reps)) {
                await db.userPersonalRecord.upsert({
                    where: {
                        userId_exerciseId: {
                            userId,
                            exerciseId: log.exerciseId,
                        },
                    },
                    update: {
                        weight: maxWeight,
                        reps: associatedReps,
                        date: date,
                    },
                    create: {
                        userId,
                        exerciseId: log.exerciseId,
                        weight: maxWeight,
                        reps: associatedReps,
                        date: date,
                    },
                });
            }
        }
    }
}
