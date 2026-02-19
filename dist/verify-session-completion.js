"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const SessionService_1 = require("./services/SessionService");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("🚀 Verifying Session Completion API...");
    // 1. Get the latest plan from the test user
    const plan = await prisma.userPlan.findFirst({
        orderBy: { createdAt: "desc" },
        include: { user: true },
    });
    if (!plan) {
        console.error("❌ No plan found to verify session completion.");
        process.exit(1);
    }
    const planJson = plan.planJson;
    const firstExerciseId = Object.keys(planJson.exerciseLibrary)[0];
    const payload = {
        planId: plan.id,
        week: 1,
        day: 1,
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        completedAt: new Date().toISOString(),
        notes: "Scripted verification session",
        exercises: [
            {
                exerciseId: firstExerciseId,
                timeSpentSec: 600,
                sets: [
                    { setIndex: 0, weight: 100, reps: 10, rpe: 8 },
                    { setIndex: 1, weight: 100, reps: 10, rpe: 8.5 },
                ],
            },
        ],
    };
    console.log(`📝 Submitting session for user: ${plan.user.email}`);
    try {
        const result = await SessionService_1.SessionService.completeSession(plan.userId, payload);
        console.log(`✅ Session completed successfully! ID: ${result.id}`);
        console.log(`📊 Performance Score: ${result.performanceScore}`);
        // Check if logs were created
        const logs = await prisma.userExerciseLog.findMany({
            where: { sessionId: result.id },
        });
        console.log(`✅ ${logs.length} exercise logs created.`);
    }
    catch (error) {
        console.error("❌ Session completion failed:", error.message);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
//# sourceMappingURL=verify-session-completion.js.map