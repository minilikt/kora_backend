"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanService = void 0;
const client_1 = require("@prisma/client");
const PlanCompiler_1 = require("../engines/PlanCompiler");
const prisma = new client_1.PrismaClient();
class PlanService {
    /**
     * Generates a new workout plan and persists it to the database.
     * This includes creating the UserPlan record and pre-populating UserSessions.
     */
    static async createPlan(input) {
        console.log(`🤖 PlanService: Generating optimized plan for user ${input.userId}...`);
        // 1. Generate the plan structure using the Compiler
        const { planJson, startDate, endDate } = await PlanCompiler_1.PlanCompiler.generate(input);
        // 2. Persist to UserPlan and Sessions
        const userPlan = await prisma.$transaction(async (tx) => {
            // Create the plan record
            const plan = await tx.userPlan.create({
                data: {
                    userId: input.userId,
                    planJson: planJson,
                    startDate: startDate,
                    endDate: endDate,
                },
            });
            // Create session records for each day of the plan
            for (const week of planJson.weeks) {
                for (const session of week.sessions) {
                    await tx.userSession.create({
                        data: {
                            userId: input.userId,
                            planId: plan.id,
                            dayNumber: session.day,
                            week: week.week,
                            planned: session, // Store the optimized session JSON
                        },
                    });
                }
            }
            return plan;
        });
        console.log(`✅ PlanService: Created optimized plan ${userPlan.id} with ${planJson.weeks.length * planJson.weeks[0].sessions.length} sessions.`);
        return userPlan;
    }
    /**
     * Retrieves all plans for a user.
     */
    static async getPlans(userId) {
        return prisma.userPlan.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            include: {
                sessions: {
                    orderBy: [{ week: "asc" }, { dayNumber: "asc" }],
                },
            },
        });
    }
    /**
     * Retrieves the active plan for a user.
     */
    static async getActivePlan(userId) {
        return prisma.userPlan.findFirst({
            where: { userId },
            orderBy: { createdAt: "desc" },
            include: {
                sessions: {
                    orderBy: [{ week: "asc" }, { dayNumber: "asc" }],
                },
            },
        });
    }
}
exports.PlanService = PlanService;
//# sourceMappingURL=PlanService.js.map