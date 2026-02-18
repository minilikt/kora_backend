import { PrismaClient } from "@prisma/client";
import { PlanService } from "../src/services/PlanService";

const prisma = new PrismaClient();

async function main() {
  console.log("🧪 Starting End-to-End Plan Generation Test...");

  const dummyEmail = "dummy@test.com";

  // 1. Find or Create Dummy User
  let user = await prisma.user.findUnique({
    where: { email: dummyEmail },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: dummyEmail,
        name: "Dummy Test User",
        password: "password123",
      },
    });
    console.log(`👤 Created dummy user: ${user.id}`);
  } else {
    console.log(`👤 Found existing dummy user: ${user.id}`);
  }

  // 2. Prepare Plan Input
  // We'll use values we know exist or are common
  const planInput = {
    userId: user.id,
    days: 3,
    goal: "HYPERTROPHY",
    level: "INTERMEDIATE",
    progressionId: "LINEAR_BEGINNER_4W",
    environment: "GYM" as const,
    equipment: [
      "Barbell",
      "Dumbbell",
      "Cable Machine",
      "Flat Bench",
      "Pull-up Bar",
    ],
  };

  console.log(
    "📅 Generating plan for 3 days/week, Hypertrophy, Intermediate...",
  );

  // 3. Generate Plan
  try {
    const plan = await PlanService.createPlan(planInput);
    console.log(`✅ Plan Generated! ID: ${plan.id}`);

    // 4. Verify Sessions
    const sessions = await prisma.userSession.findMany({
      where: { planId: plan.id },
      orderBy: [{ week: "asc" }, { dayNumber: "asc" }],
    });

    console.log(`📊 Number of sessions created: ${sessions.length}`);

    if (sessions.length > 0) {
      console.log("--- First Session Preview ---");
      const firstSession = sessions[0];
      console.log(`Week: ${firstSession.week}, Day: ${firstSession.dayNumber}`);

      const plannedData = firstSession.planned as any;
      if (plannedData && plannedData.exercises) {
        console.log("Exercises:");
        plannedData.exercises.forEach((ex: any, idx: number) => {
          console.log(`  ${idx + 1}. ${ex.exerciseName} (${ex.sets} sets)`);
        });
      } else {
        console.log("⚠️ No exercise data found in planned session JSON.");
      }
    } else {
      console.log("❌ No sessions were created for the plan.");
    }
  } catch (error) {
    console.error("❌ Error generating plan:", error);
  }

  console.log("🎉 Plan Generation Test Completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
