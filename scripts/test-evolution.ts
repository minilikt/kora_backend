console.log("🚀 Script started");
import {
  PrismaClient,
  Gender,
  ExperienceLevel,
  ExerciseEnvironment,
  TrainingGoal,
} from "@prisma/client";
import { PlanEvolutionEngine } from "../src/engines/PlanEvolutionEngine";
import { PlanService } from "../src/services/PlanService";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting Plan Evolution Engine Test...");

  const testEmail = `evo-test-${Date.now()}@test.com`;

  // 1. Create User & Profile
  // Corrected to match schema.prisma
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      name: "Evo Test User",
      password: "password123",

      // User Demo/Physio fields
      gender: Gender.MALE,
      age: 30,
      weight: 75,
      height: 175,

      // Training preferences on User
      trainingLevel: ExperienceLevel.BEGINNER,
      trainingEnvironment: ExerciseEnvironment.GYM,
      trainingDaysPerWeek: 3,

      // Create empty profile
      trainingProfile: {
        create: {
          fatigueIndex: 0,
          performanceIndex: 0,
          consistencyScore: 1.0,
        },
      },
    },
    include: { trainingProfile: true },
  });

  console.log(`👤 Created user: ${user.id}`);

  // 2. Generate Initial Plan
  console.log("📅 Generating initial plan...");
  const planInput = {
    userId: user.id,
    days: 3,
    goal: TrainingGoal.HYPERTROPHY,
    level: ExperienceLevel.BEGINNER,
    progressionId: "LINEAR_BEGINNER_4W", // Assuming this exists or will fallback
    environment: ExerciseEnvironment.GYM,
    equipment: ["Barbell", "Dumbbell"],
  };

  const initialPlan = await PlanService.createPlan(planInput);
  console.log(`✅ Initial Plan ID: ${initialPlan.id}`);

  // 3. Create Block Evaluation (Mock Feedback)
  console.log("📝 Creating mock block evaluation (INCREASE_VOLUME)...");

  await prisma.blockEvaluation.create({
    data: {
      planId: initialPlan.id,
      completionRate: 0.9,
      avgSessionDuration: 60,
      avgRpe: 7,
      performanceTrend: 1.0,

      // Actions for next block
      actions: ["INCREASE_VOLUME"],

      // Note: submittedAt might not be in schema, checked schema and it has createdAt default now()
    },
  });

  // 4. Run Evolution Engine
  console.log("🔄 Evolving plan...");
  try {
    const newPlan = await PlanEvolutionEngine.evolvePlan(initialPlan.id);
    console.log(`✅ New Plan Generated! ID: ${newPlan.id}`);

    // 5. Verify Mutation
    const newPlanJson = newPlan.planJson as any;
    console.log("🔍 Verifying mutations...");
    console.log(`Old Level: ${planInput.level}`);
    console.log(`New Level: ${(newPlanJson.input as any).level}`);

    if ((newPlanJson.input as any).level === "INTERMEDIATE") {
      console.log(
        "✅ SUCCESS: Level upgraded to INTERMEDIATE as expected from INCREASE_VOLUME action.",
      );
    } else {
      console.log(
        `⚠️ WARNING: Level did not change. Value is ${(newPlanJson.input as any).level}`,
      );
    }
  } catch (error) {
    console.error("❌ Evolve Plan Failed:", error);
  }

  console.log("🎉 Evolution Test Completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
