import { PrismaClient, TrainingGoal, ExperienceLevel } from "@prisma/client";
import { PlanService } from "../src/services/PlanService";

const prisma = new PrismaClient();

async function runTwoWeekScenarios() {
    console.log("📂 GENERATING 2-WEEK MULTI-FREQUENCY REPORT\n");

    const scenarios = [
        { id: "FREQ_1", days: 1, name: "1-Day Minimalist" },
        { id: "FREQ_2", days: 2, name: "2-Day Weekend Warrior" },
        { id: "FREQ_3", days: 3, name: "3-Day Standard" },
        { id: "FREQ_5", days: 5, name: "5-Day Serious" }
    ];

    for (const sc of scenarios) {
        console.log(`\n=========================================`);
        console.log(`Scenario: ${sc.name} (${sc.days} Days/Week)`);
        console.log(`=========================================`);

        const email = `two-week-${sc.id.toLowerCase()}@example.com`;

        try {
            await prisma.user.deleteMany({ where: { email } });
            const user = await prisma.user.create({
                data: {
                    email,
                    password: "password",
                    name: sc.name,
                    gender: "MALE",
                    trainingLevel: "INTERMEDIATE",
                    trainingDaysPerWeek: sc.days,
                }
            });

            const plan = await PlanService.createPlan({
                userId: user.id,
                days: sc.days,
                goal: "HYPERTROPHY",
                level: "INTERMEDIATE",
                environment: "GYM",
                progressionId: "LINEAR_INTERMEDIATE_4W",
                equipment: ["Barbell", "Dumbbells", "Cable Machine", "Squat Rack", "Bench"],
            });

            const planJson = plan.planJson as any;
            const lib = planJson.exerciseLibrary;

            for (let w = 0; w < 2; w++) {
                console.log(`\n--- WEEK ${w + 1} ---`);
                const week = planJson.weeks[w];
                week.sessions.forEach((session: any) => {
                    if (session.rest) return;
                    console.log(`Day ${session.day}:`);
                    session.exercises.forEach((ex: any, idx: number) => {
                        const exName = lib[ex.exerciseId]?.name || ex.exerciseId;
                        console.log(`  ${idx + 1}. ${exName} (${ex.sets}x${ex.reps})`);
                    });
                });
            }

        } catch (err) {
            console.error(`Failed scenario ${sc.name}:`, err);
        }
    }

    process.exit(0);
}

runTwoWeekScenarios();
