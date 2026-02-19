import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("--- DATABASE DIAGNOSTICS ---");

  const muscleCount = await prisma.muscle.count();
  const patternCount = await prisma.movementPattern.count();
  const exerciseCount = await prisma.exercise.count();
  const userCount = await prisma.user.count();
  const planCount = await prisma.userPlan.count();

  console.log(`Muscles: ${muscleCount}`);
  console.log(`Patterns: ${patternCount}`);
  console.log(`Exercises: ${exerciseCount}`);
  console.log(`Users: ${userCount}`);
  console.log(`User Plans: ${planCount}`);

  if (userCount > 0) {
    const latestUser = await prisma.user.findFirst({
      orderBy: { createdAt: "desc" },
    });
    console.log(`\nLatest User: ${latestUser?.email} (${latestUser?.id})`);

    if (latestUser) {
      const userPlans = await prisma.userPlan.findMany({
        where: { userId: latestUser.id },
      });
      console.log(`Plans for latest user: ${userPlans.length}`);
    }

    const allPlans = await prisma.userPlan.findMany({
      include: { user: { select: { email: true } } },
    });
    console.log(`\nTotal plans in DB: ${allPlans.length}`);
    allPlans.forEach((p) =>
      console.log(
        `- Plan ${p.id} for ${p.user.email} (Created: ${p.createdAt})`,
      ),
    );
  }

  console.log("\n--- TESTING PLAN COMPILATION ---");
  const { PlanCompiler } = require("./engines/PlanCompiler");
  const {
    TrainingGoal,
    ExperienceLevel,
    ExerciseEnvironment,
  } = require("@prisma/client");

  try {
    const testInput = {
      userId: "test-user-id",
      days: 3,
      goal: TrainingGoal.HYPERTROPHY,
      level: ExperienceLevel.INTERMEDIATE,
      environment: ExerciseEnvironment.GYM,
      progressionId: "LINEAR_BEGINNER_4W",
      equipment: [
        "Barbell",
        "Dumbbells",
        "Cable Machine",
        "Flat Bench",
        "Squat Rack",
      ],
    };

    const result = await PlanCompiler.generate(testInput);
    console.log("✅ Plan Compilation Success!");
    console.log(`Generated sessions: ${result.planJson.basePlan.length}`);

    const sessionsWithExercises = result.planJson.basePlan.filter(
      (s: any) => !s.rest && s.exercises.length > 0,
    );
    console.log(
      `Training days with exercises: ${sessionsWithExercises.length}`,
    );

    if (sessionsWithExercises.length > 0) {
      console.log(
        "Sample day exercises:",
        sessionsWithExercises[0].exercises.length,
      );
    } else {
      console.warn("❌ Plan generated but contains no exercises!");
    }
  } catch (err) {
    console.error("❌ Plan Compilation Failed:", err);
  }

  console.log("\n--- DIRECT EXERCISE SELECTOR TEST ---");
  const { ExerciseSelector } = require("./engines/ExerciseSelector");
  try {
    const pattern = "Horizontal Push";
    const equip = ["Barbell", "Dumbbells", "Flat Bench"];
    console.log(
      `Searching for "${pattern}" with equipment: ${equip.join(", ")}`,
    );
    const results = await ExerciseSelector.getByPattern(pattern, equip, {
      level: "INTERMEDIATE",
      environment: "GYM",
    });
    console.log(`Results found: ${results.length}`);
    if (results.length > 0) {
      console.log(`First result: ${results[0].name}`);
    } else {
      // Try without equipment
      console.log("Retrying WITHOUT equipment filter...");
      const allResults = await prisma.exercise.findMany({
        where: {
          movementPattern: { name: pattern },
          level: "INTERMEDIATE",
        },
      });
      console.log(
        `Total exercises for "${pattern}" at INTERMEDIATE level: ${allResults.length}`,
      );

      if (allResults.length > 0) {
        const first = await prisma.exercise.findFirst({
          where: { movementPattern: { name: pattern } },
          include: { equipment: { include: { equipment: true } } },
        });
        console.log(
          `Sample exercise equipment: ${first?.equipment.map((e: any) => e.equipment.name).join(", ")}`,
        );
      }
    }
  } catch (err) {
    console.error("❌ Selector Test Failed:", err);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
