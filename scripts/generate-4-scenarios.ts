import { PrismaClient, TrainingGoal, ExperienceLevel, Gender } from "@prisma/client";
import { PlanService } from "../src/services/PlanService";

const prisma = new PrismaClient();

async function runScenarios() {
    console.log("📂 GENERATING 4 USER SCENARIOS\n");

    const scenarios = [
        {
            id: "FB_BEGINNER_F",
            name: "Struggling Beginner Female",
            gender: "FEMALE",
            level: "BEGINNER",
            days: 3,
            goal: "MUSCLE_GAIN",
            fatigue: 9,
            consistency: 0.6,
        },
        {
            id: "UL_INTER_M",
            name: "High-Recovery Intermediate Male",
            gender: "MALE",
            level: "INTERMEDIATE",
            days: 4,
            goal: "HYPERTROPHY",
            fatigue: 2,
            consistency: 1.0,
        },
        {
            id: "PPL_ADV_M",
            name: "Cutting Advanced Male",
            gender: "MALE",
            level: "ADVANCED",
            days: 5,
            goal: "FAT_LOSS",
            fatigue: 5,
            consistency: 0.9,
        },
        {
            id: "PPL_INTER_F",
            name: "High-Adherence Intermediate Female",
            gender: "FEMALE",
            level: "INTERMEDIATE",
            days: 6,
            goal: "HYPERTROPHY",
            fatigue: 4,
            consistency: 1.0,
        }
    ];

    for (const sc of scenarios) {
        console.log(`--- Scenario: ${sc.name} ---`);
        const email = `scenario-${sc.id.toLowerCase()}@example.com`;

        try {
            // Cleanup existing
            await prisma.user.deleteMany({ where: { email } });

            const user = await prisma.user.create({
                data: {
                    email,
                    password: "password",
                    name: sc.name,
                    gender: sc.gender as any,
                    trainingLevel: sc.level as any,
                    trainingDaysPerWeek: sc.days,
                }
            });

            await prisma.userTrainingProfile.create({
                data: {
                    userId: user.id,
                    fatigueIndex: sc.fatigue,
                    consistencyScore: sc.consistency,
                }
            });

            const plan = await PlanService.createPlan({
                userId: user.id,
                days: sc.days,
                goal: sc.goal as any,
                level: sc.level as any,
                environment: "GYM",
                progressionId: "LINEAR_INTERMEDIATE_4W",
                equipment: ["Barbell", "Dumbbells", "Cable Machine", "Squat Rack", "Bench"],
            });

            const planJson = plan.planJson as any;
            console.log(`Split: ${planJson.input.days} Days (${sc.days <= 3 ? "Full Body" : sc.days === 4 ? "Upper/Lower" : "PPL/Hybrid"})`);
            console.log(`Modifier: ${planJson.modifier}`);
            console.log(`Day 1 Exercises:`);
            planJson.weeks[0].sessions[0].exercises.forEach((ex: any, idx: number) => {
                const name = planJson.exerciseLibrary[ex.exerciseId]?.name || ex.exerciseId;
                console.log(`  ${idx + 1}. ${name} (${ex.sets}x${ex.reps})`);
            });
            console.log("\n");

        } catch (err) {
            console.error(`Failed scenario ${sc.name}:`, err);
        }
    }

    process.exit(0);
}

runScenarios();
