import { PrismaClient } from "@prisma/client";
import { PlanService } from "./services/PlanService";
import { SessionService } from "./services/SessionService";

const prisma = new PrismaClient();

async function main() {
  console.log("🧪 Starting Execution Layer Verification...");

  // 1. Setup User
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: "execution-test@example.com",
        name: "Execution Tester",
        password: "password123",
      },
    });
    console.log(`👤 Created test user: ${user.id}`);
  }

  // 2. Generate Plan
  console.log("📅 Generating Plan...");
  const plan = await PlanService.createPlan({
    userId: user.id,
    days: 3,
    goal: "HYPERTROPHY",
    level: "INTERMEDIATE",
    progressionId: "LINEAR_HYPERTROPHY_4W",
    environment: "GYM",
    equipment: [
      "Barbell",
      "Dumbbell",
      "Flat Bench",
      "Incline Bench",
      "Dip Bar",
      "Pull-up Bar",
      "Cable Machine",
    ],
  });

  console.log(`✅ Plan Generated: ${plan.id}`);

  // Verify Sessions
  const sessions = await prisma.userSession.findMany({
    where: { planId: plan.id },
    orderBy: { dayNumber: "asc" },
  });

  console.log(`   Sessions Created: ${sessions.length}`);
  if (sessions.length === 0) throw new Error("No sessions created!");

  // 3. Simulate Session Completion
  const sessionToComplete = sessions[0];
  console.log(`💪 Completing Session 1 (ID: ${sessionToComplete.id})...`);

  // Mock exercise completion
  // We need to know what exercises are in the session.
  // The 'planned' field is JSON.
  const plannedData = sessionToComplete.planned as any;
  const firstExercise = plannedData.exercises[0]; // { exerciseId, sets, ... }

  if (!firstExercise) {
    console.warn(
      "   No exercises in first session, skipping completion logic check.",
    );
  } else {
    // We need to find the exerciseId from the name or use what's in there.
    // The compiler output has 'exerciseId' in the block usually?
    // Let's check PlanCompiler output.
    // It puts 'exerciseId' and 'exerciseName'.

    await SessionService.completeSession(user.id, {
      planId: plan.id,
      week: sessionToComplete.week,
      day: sessionToComplete.dayNumber,
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      completedAt: new Date().toISOString(),
      notes: "Verification session",
      exercises: [
        {
          exerciseId: firstExercise.exerciseId,
          sets: [
            { setIndex: 0, weight: 135, reps: 10, rpe: 8 },
            { setIndex: 1, weight: 135, reps: 10, rpe: 8.5 },
            { setIndex: 2, weight: 135, reps: 9, rpe: 9 },
          ],
        },
      ],
    });

    console.log("✅ Session Completed.");
  }

  // 4. Verify Logs and Adaptive State
  const logs = await prisma.userExerciseLog.findMany({
    where: { sessionId: sessionToComplete.id },
  });
  console.log(`📊 Exercise Logs: ${logs.length}`);
  console.log(`   First Log Volume: ${logs[0]?.actualSets} sets`);

  const adaptiveState = await prisma.userAdaptiveState.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  console.log(`🧠 Adaptive State Updated:`);
  console.log(`   Fatigue Score: ${adaptiveState?.fatigueScore}`);
  console.log(`   Snapshot ID: ${adaptiveState?.id}`);

  console.log("🎉 Verification Complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
