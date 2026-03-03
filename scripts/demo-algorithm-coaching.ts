import { PrismaClient } from "@prisma/client";
import { PlanService } from "../src/services/PlanService";

const prisma = new PrismaClient();

async function demonstrateCoaching() {
    console.log("🚀 STARTING AGENTIC ALGORITHM DEMO\n");

    const email = `coach-demo-${Date.now()}@example.com`;

    try {
        // 1. Setup User
        const user = await prisma.user.create({
            data: {
                email,
                password: "password123",
                name: "Demo Athlete",
                gender: "MALE",
                trainingLevel: "INTERMEDIATE",
                trainingDaysPerWeek: 4,
            }
        });

        // 2. Setup Training Profile (Fresh & Consistent)
        await prisma.userTrainingProfile.create({
            data: {
                userId: user.id,
                fatigueIndex: 3,
                consistencyScore: 1.0,
            }
        });

        // 3. Simulate HISTORY: User crushed their last session of Squats
        // Pattern: "Squat", Exercise: let's find one.
        const squatEx = await prisma.exercise.findFirst({
            where: { name: { contains: "Squat" }, type: "COMPOUND" }
        });

        if (squatEx) {
            console.log(`📝 Simulating history for: ${squatEx.name}`);
            const session = await prisma.userSession.create({
                data: {
                    userId: user.id,
                    planId: "dummy-plan",
                    dayNumber: 1,
                    week: 1,
                    planned: {},
                    completedStatus: true,
                }
            });

            await prisma.userExerciseLog.create({
                data: {
                    sessionId: session.id,
                    exerciseId: squatEx.id,
                    plannedSets: 3,
                    plannedReps: "8-10",
                    plannedRpe: 8,
                    actualSets: 3,
                    repsPerSet: [10, 10, 10], // Hit max reps!
                    weightsPerSet: [100, 100, 100],
                    rpePerSet: [8, 8, 9],
                    completed: true
                }
            });
        }

        // 4. GENERATE NEW PLAN
        console.log("🔨 Generating new adaptive plan...");
        const planResult = await PlanService.createPlan({
            userId: user.id,
            days: 4,
            goal: "HYPERTROPHY" as any,
            level: "INTERMEDIATE" as any,
            environment: "GYM" as any,
            progressionId: "LINEAR_INTERMEDIATE_4W",
            equipment: ["Barbell", "Dumbbells", "Bench", "Squat Rack"],
        });

        const fullPlan = planResult.planJson as any;

        console.log(`\n✅ SYSTEM OUTPUT FOR: ${user.name} (${user.gender})`);
        console.log(`- Goal: HYPERTROPHY`);
        console.log(`- Split Selected: ${fullPlan.input.days} Days (${fullPlan.input.days === 4 ? "Upper/Lower" : "Other"})`);
        console.log(`- Volume Modifier: ${fullPlan.modifier}`);

        console.log("\n--- EXERCISE LIST (Week 1, Session 1) ---");
        fullPlan.weeks[0].sessions[0].exercises.forEach((ex: any, i: number) => {
            const libEx = fullPlan.exerciseLibrary[ex.exerciseId];
            console.log(`${i + 1}. ${libEx?.name || ex.exerciseId}`);
            console.log(`   Targets: ${ex.sets} sets x ${ex.reps} @ ${ex.weight}kg (RPE ${ex.rpe})`);
            if (ex.note) console.log(`   Coach's Note: "${ex.note}"`);
        });

    } catch (err) {
        console.error("❌ Demo Failed:", err);
    } finally {
        await prisma.$disconnect();
    }
}

demonstrateCoaching();
