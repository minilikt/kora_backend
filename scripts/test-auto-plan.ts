import { UserService } from "../src/services/UserService";
import {
  TrainingGoal,
  Gender,
  ExperienceLevel,
  ExerciseEnvironment,
} from "@prisma/client";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧪 Starting Automatic Plan Generation Test...");

  const testEmail = `auto-gen-${Date.now()}@test.com`;

  const registrationData: any = {
    email: testEmail,
    password: "password123",
    name: "Auto Gen User",
    preferredName: "Auto",
    gender: Gender.MALE,
    age: 25,
    weight: 80,
    targetWeight: 75,
    height: 180,
    bmi: 24.7,
    sleepHours: 8,
    waterDaily: 3,
    trainingLevel: ExperienceLevel.INTERMEDIATE,
    trainingEnvironment: ExerciseEnvironment.GYM,
    trainingDaysPerWeek: 4,
    goal: TrainingGoal.HYPERTROPHY,
  };

  console.log(`📝 Registering user ${testEmail} with training preferences...`);

  try {
    const result = await UserService.registerAndGeneratePlan(registrationData);
    console.log(`✅ Registration successful! User ID: ${result.user.id}`);

    // Verify Plan Creation
    const plan = await prisma.userPlan.findFirst({
      where: { userId: result.user.id },
    });

    if (plan) {
      console.log(`✅ Plan automatically generated! Plan ID: ${plan.id}`);
      const sessions = await prisma.userSession.findMany({
        where: { planId: plan.id },
      });
      console.log(`📊 Sessions created: ${sessions.length}`);

      const planData = plan.planJson as any;
      console.log(`📑 Plan Version: ${planData.version}`);
      console.log(
        `🏋️ Exercises in library: ${Object.keys(planData.exerciseLibrary || {}).length}`,
      );
    } else {
      console.log("❌ Failed to automatically generate plan.");
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }

  console.log("🎉 Auto-Plan Generation Test Completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
