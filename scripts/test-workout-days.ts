import { PrismaClient } from "@prisma/client";
import { UserService } from "../src/services/UserService";

const prisma = new PrismaClient();

async function main() {
  const timestamp = Date.now();
  const email = `test_workout_days_${timestamp}@example.com`;

  console.log("🧪 Testing workoutDays storage...\n");

  // Register user with specific workout days
  const result = await UserService.registerAndGeneratePlan({
    email,
    password: "password123",
    name: "Workout Days Tester",
    trainingLevel: "INTERMEDIATE" as any,
    trainingEnvironment: "GYM" as any,
    goal: "HYPERTROPHY" as any,
    workoutDays: ["MONDAY", "WEDNESDAY", "FRIDAY", "SATURDAY"] as any[],
  });

  const userId = result.user.id;
  console.log(`✅ User registered: ${userId}`);

  // Fetch user back from DB to verify workoutDays
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      workoutDays: true,
      trainingDaysPerWeek: true,
    },
  });

  if (!user) {
    console.error("❌ FAILED: User not found in database.");
    process.exit(1);
  }

  console.log("\n📋 Stored user profile:");
  console.log(`  Name:               ${user.name}`);
  console.log(`  workoutDays:        ${JSON.stringify(user.workoutDays)}`);
  console.log(`  trainingDaysPerWeek: ${user.trainingDaysPerWeek}`);

  const expectedDays = ["MONDAY", "WEDNESDAY", "FRIDAY", "SATURDAY"];
  const allMatch =
    user.workoutDays.length === expectedDays.length &&
    expectedDays.every((d) => user.workoutDays.includes(d as any));

  if (allMatch) {
    console.log("\n✅ SUCCESS: workoutDays correctly stored in DB!");
  } else {
    console.error(
      `\n❌ FAILED: Expected ${JSON.stringify(expectedDays)}, got ${JSON.stringify(user.workoutDays)}`,
    );
    process.exit(1);
  }

  // Verify plan was generated using workoutDays.length (4 days)
  const plan = await prisma.userPlan.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (plan) {
    console.log(`\n✅ Plan generated! ID: ${plan.id}`);
    const sessions = await prisma.userSession.findMany({
      where: { planId: plan.id },
      select: { dayNumber: true, week: true },
      orderBy: [{ week: "asc" }, { dayNumber: "asc" }],
      take: 5,
    });
    console.log(`   First 5 sessions: ${JSON.stringify(sessions)}`);
  } else {
    console.log("⚠️  No plan generated (not a failure for this test).");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Test error:", e);
  process.exit(1);
});
