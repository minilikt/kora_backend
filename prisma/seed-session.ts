import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Seeding a sample workout session...");

  // 1. Get a user and their latest plan
  const user = await prisma.user.findFirst({
    include: { plans: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  if (!user || user.plans.length === 0) {
    console.error("❌ No user or plan found. Please run main seed first.");
    return;
  }

  const plan = user.plans[0];

  // 2. Get some exercises for the log
  const exercises = await prisma.exercise.findMany({ take: 3 });

  if (exercises.length < 3) {
    console.error("❌ Not enough exercises found. Please run main seed first.");
    return;
  }

  // 3. Create a UserSession
  const session = await prisma.userSession.create({
    data: {
      userId: user.id,
      planId: plan.id,
      dayNumber: 1,
      week: 1,
      planned: {
        exercises: [
          { id: exercises[0].id, sets: 3, reps: "10-12", rpe: 7 },
          { id: exercises[1].id, sets: 3, reps: "8-10", rpe: 8 },
          { id: exercises[2].id, sets: 3, reps: "12-15", rpe: 6 },
        ],
      },
      exercisesCount: 3,
      totalTimeSec: 3600, // 60 minutes
      avgRPE: 7.0,
      performanceScore: 1.05,
      fatigueScore: 0.5,
      notes:
        "First workout recorded with the new granular tracking! Felt great.",
      completedStatus: true,
      startedAt: new Date(Date.now() - 3600 * 1000),
      completedAt: new Date(),
    },
  });

  // 4. Create UserExerciseLogs for the session
  await prisma.userExerciseLog.createMany({
    data: [
      {
        sessionId: session.id,
        exerciseId: exercises[0].id,
        plannedSets: 3,
        plannedReps: "10-12",
        plannedRpe: 7,
        actualSets: 3,
        repsPerSet: [12, 11, 10],
        weightsPerSet: [60, 60, 60],
        rpePerSet: [7, 7.5, 8],
        timeSpentSec: 900, // 15 mins
        notes: "Solid sets, hit the top of the rep range.",
        completed: true,
      },
      {
        sessionId: session.id,
        exerciseId: exercises[1].id,
        plannedSets: 3,
        plannedReps: "8-10",
        plannedRpe: 8,
        actualSets: 3,
        repsPerSet: [10, 9, 8],
        weightsPerSet: [80, 80, 80],
        rpePerSet: [8, 8, 8.5],
        timeSpentSec: 1200, // 20 mins
        notes: "Heavy but manageable.",
        completed: true,
      },
      {
        sessionId: session.id,
        exerciseId: exercises[2].id,
        plannedSets: 3,
        plannedReps: "12-15",
        plannedRpe: 6,
        actualSets: 3,
        repsPerSet: [15, 15, 15],
        weightsPerSet: [30, 30, 30],
        rpePerSet: [6, 6, 6],
        timeSpentSec: 600, // 10 mins
        notes: "Good pump.",
        completed: true,
      },
    ],
  });

  console.log(
    `✅ Seeded session ${session.id} with ${exercises.length} exercise logs`,
  );
}

main()
  .catch((e) => {
    console.error("❌ Seeding session failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
