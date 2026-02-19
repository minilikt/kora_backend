"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const PlanCompiler_1 = require("./engines/PlanCompiler");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("🧪 Starting compiler verification...");
    // 1. Get or Create a test user
    let user = await prisma.user.findFirst();
    if (!user) {
        user = await prisma.user.create({
            data: {
                email: "test@example.com",
                name: "Test User",
                password: "password123",
            },
        });
        console.log(`👤 Created test user: ${user.id}`);
    }
    // 2. Run Compiler
    try {
        const plan = await PlanCompiler_1.PlanCompiler.generate({
            userId: user.id,
            days: 3,
            goal: "HYPERTROPHY",
            level: "INTERMEDIATE",
            progressionId: "linear-overload-4w",
            environment: "GYM",
            equipment: [
                "Barbell",
                "Dumbbells",
                "Flat Bench",
                "Incline Bench",
                "Decline Bench",
            ],
        });
        console.log(`✨ Successfully generated plan prototype`);
        console.log("--- Plan Preview ---");
        const planJson = plan.planJson;
        console.log(`Weeks: ${planJson.weeks.length}`);
        console.log(`Start Date: ${plan.startDate}`);
        // Check Day 1
        const week1 = planJson.weeks[0];
        const day1 = week1.sessions.find((s) => s.day === 1);
        if (day1) {
            console.log(`Day 1 Exercises: ${day1.exercises?.length || 0}`);
            (day1.exercises || []).forEach((ex) => {
                console.log(`- ${ex.exerciseName} (${ex.sets} sets) @ ${(ex.intensity || 0) * 100}% intensity`);
            });
        }
        else {
            console.log("No exercises found for Day 1.");
        }
    }
    catch (error) {
        console.error("❌ Compilation failed:", error);
    }
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=verify-compiler.js.map