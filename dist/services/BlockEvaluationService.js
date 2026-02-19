"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockEvaluationService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class BlockEvaluationService {
    static async evaluateBlock(planId) {
        // 0. Check if evaluation already exists (idempotency)
        const existingEvaluation = await prisma.blockEvaluation.findUnique({
            where: { planId },
        });
        if (existingEvaluation) {
            console.log(`⚠️ Evaluation already exists for plan ${planId}, returning existing.`);
            return existingEvaluation;
        }
        // 1. Fetch Plan Data
        const plan = await prisma.userPlan.findUnique({
            where: { id: planId },
            include: {
                sessions: {
                    include: {
                        exercises: true,
                    },
                    orderBy: { createdAt: "asc" },
                },
                user: {
                    include: { trainingProfile: true },
                },
            },
        });
        if (!plan)
            throw new Error("Plan not found");
        const sessions = plan.sessions;
        const trainingDays = sessions.filter((s) => !s.planned?.rest);
        // 2. Calculate Metrics
        const compliance = this.calculateCompliance(trainingDays);
        const avgRPE = this.calculateAvgRPE(trainingDays);
        const fatigueTrend = this.calculateFatigueTrend(trainingDays);
        const performanceTrend = this.calculatePerformanceTrend(trainingDays);
        // 3. Determine Actions
        const actions = this.determineActions(compliance, fatigueTrend, performanceTrend, avgRPE);
        // 4. Save Evaluation & Update Profile within a Transaction
        const evaluation = await prisma.$transaction(async (tx) => {
            const savedEval = await tx.blockEvaluation.create({
                data: {
                    planId: plan.id,
                    completionRate: compliance,
                    avgSessionDuration: this.calculateAvgDuration(trainingDays),
                    avgRpe: avgRPE,
                    performanceTrend: performanceTrend,
                    actions: actions,
                },
            });
            // 5. Update User Profile
            await this.updateUserProfile(plan.userId, {
                fatigue: fatigueTrend,
                performance: performanceTrend,
                compliance: compliance,
            }, tx);
            return savedEval;
        });
        return evaluation;
    }
    static calculateCompliance(sessions) {
        if (sessions.length === 0)
            return 0;
        const completed = sessions.filter((s) => s.completedStatus).length;
        return completed / sessions.length;
    }
    static calculateAvgRPE(sessions) {
        const completed = sessions.filter((s) => s.completedStatus && s.avgRPE);
        if (completed.length === 0)
            return 0;
        const sum = completed.reduce((acc, s) => acc + (s.avgRPE || 0), 0);
        return sum / completed.length;
    }
    static calculateAvgDuration(sessions) {
        const completed = sessions.filter((s) => s.completedStatus && s.totalTimeSec);
        if (completed.length === 0)
            return 0;
        const sum = completed.reduce((acc, s) => acc + (s.totalTimeSec || 0), 0);
        return sum / completed.length;
    }
    static calculateFatigueTrend(sessions) {
        // Simple heuristic: Avg RPE of last 3 sessions - Avg RPE of first 3 sessions
        const completed = sessions.filter((s) => s.completedStatus && s.avgRPE);
        if (completed.length < 4)
            return 0;
        const firstHalf = completed.slice(0, Math.floor(completed.length / 2));
        const lastHalf = completed.slice(Math.ceil(completed.length / 2));
        const avgFirst = firstHalf.reduce((acc, s) => acc + (s.avgRPE || 0), 0) / firstHalf.length;
        const avgLast = lastHalf.reduce((acc, s) => acc + (s.avgRPE || 0), 0) / lastHalf.length;
        return avgLast - avgFirst; // Positive = Fatigue increasing
    }
    static calculatePerformanceTrend(sessions) {
        // Compare volume load or performance score of late weeks vs early weeks
        const completed = sessions.filter((s) => s.completedStatus && s.performanceScore);
        if (completed.length < 4)
            return 0;
        const firstHalf = completed.slice(0, Math.floor(completed.length / 2));
        const lastHalf = completed.slice(Math.ceil(completed.length / 2));
        const avgFirst = firstHalf.reduce((acc, s) => acc + (s.performanceScore || 0), 0) /
            firstHalf.length;
        const avgLast = lastHalf.reduce((acc, s) => acc + (s.performanceScore || 0), 0) /
            lastHalf.length;
        return avgLast - avgFirst; // Positive = Performance improving
    }
    static determineActions(compliance, fatigueTrend, perfTrend, avgRPE) {
        const actions = [];
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
        }
        else if (perfTrend <= 0 && fatigueTrend > 1.0) {
            // Stalling and tired
            actions.push("DELOAD");
            actions.push("DECREASE_VOLUME");
        }
        else if (Math.abs(perfTrend) < 0.1 && fatigueTrend < 0.5) {
            // Stalling but fresh -> Stimulus likely stale
            actions.push("CHANGE_VARIATIONS");
            actions.push("INCREASE_INTENSITY");
        }
        else {
            // Maintenance / Steady State
            actions.push("MAINTAIN");
        }
        return actions;
    }
    static async updateUserProfile(userId, stats, tx) {
        const db = tx || prisma;
        // Upsert profile
        const existing = await db.userTrainingProfile.findUnique({
            where: { userId },
        });
        if (existing) {
            // Update running averages
            await db.userTrainingProfile.update({
                where: { userId },
                data: {
                    fatigueIndex: (existing.fatigueIndex + stats.fatigue) / 2,
                    performanceIndex: (existing.performanceIndex + stats.performance) / 2,
                    consistencyScore: (existing.consistencyScore + stats.compliance) / 2,
                },
            });
        }
        else {
            await db.userTrainingProfile.create({
                data: {
                    userId,
                    fatigueIndex: stats.fatigue,
                    performanceIndex: stats.performance,
                    consistencyScore: stats.compliance,
                },
            });
        }
    }
}
exports.BlockEvaluationService = BlockEvaluationService;
//# sourceMappingURL=BlockEvaluationService.js.map