import { PrismaClient, TrainingGoal, ExperienceLevel, Gender, ExerciseEnvironment } from "@prisma/client";
import { PlanService } from "../src/services/PlanService";

const prisma = new PrismaClient();

async function runE2E() {
    console.log("🧪 Starting E2E Algorithm Validation...");

    const testEmail = `adaptive-user-${Date.now()}@example.com`;
    const staffEmail = `staff-${Date.now()}@example.com`;

    try {
        // 1. Create a Staff User
        console.log("👤 Creating Staff User...");
        const staff = await prisma.user.create({
            data: {
                email: staffEmail,
                password: "hashed_password",
                name: "Staff Member",
            }
        });
        console.log(`✅ Staff created: ${staff.id}`);

        // 2. Create a Test User with specific adaptive profile
        console.log("👤 Creating Adaptive Test User...");
        const user = await prisma.user.create({
            data: {
                email: testEmail,
                password: "hashed_password",
                name: "Kora Tester",
                gender: "FEMALE",
                trainingLevel: "INTERMEDIATE",
                trainingDaysPerWeek: 4,
                trainingEnvironment: "GYM",
            }
        });

        // 3. Create Training Profile (High consistency, but low recovery)
        console.log("📊 Setting up training profile...");
        await prisma.userTrainingProfile.create({
            data: {
                userId: user.id,
                fatigueIndex: 7, // High fatigue -> -0.05
                consistencyScore: 0.95, // High adherence -> +0.05
                performanceIndex: 1.0,
            }
        });

        // 4. Generate Plan
        console.log("🔨 Generating plan...");
        const plan = await PlanService.createPlan({
            userId: user.id,
            days: 4,
            goal: "HYPERTROPHY" as any,
            level: "INTERMEDIATE" as any,
            environment: "GYM" as any,
            progressionId: "LINEAR_INTERMEDIATE_4W",
            equipment: ["Barbell", "Dumbbells", "Bench", "Pull-up Bar", "Squat Rack"],
        });

        console.log("\n✨ PLAN GENERATED SUCCESSFULY ✨");
        console.log(`User Gender: ${user.gender}`);
        console.log(`Goal: HYPERTROPHY`);
        console.log(`Modifier Applied: ${(plan.planJson as any).modifier}`);

        console.log("\n--- Weekly Sets Breakdown ---");
        const weeklySets = (plan.planJson as any).weeks[0].sessions.reduce((acc: any, session: any) => {
            session.exercises.forEach((ex: any) => {
                acc[ex.muscleId] = (acc[ex.muscleId] || 0) + ex.sets;
            });
            return acc;
        }, {});

        console.log(weeklySets);

        console.log("\n--- Split Inspection (First 4 sessions) ---");
        (plan.planJson as any).weeks[0].sessions.slice(0, 7).forEach((s: any) => {
            if (s.rest) {
                console.log(`Day ${s.day}: REST`);
            } else {
                console.log(`Day ${s.day}: ${s.exercises.length} exercises`);
                s.exercises.forEach((ex: any) => {
                    console.log(`  - Ex ${ex.exerciseId}: ${ex.sets} sets @ Intensity ${ex.intensity}`);
                });
            }
        });

    } catch (err) {
        console.error("❌ E2E Validation failed:", err);
    } finally {
        await prisma.$disconnect();
    }
}

runE2E();
