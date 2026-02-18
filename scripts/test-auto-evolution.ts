console.log("🚀 Starting Auto-Evolution Test...");
import {
  PrismaClient,
  Gender,
  ExperienceLevel,
  ExerciseEnvironment,
  TrainingGoal,
} from "@prisma/client";
import { PlanService } from "../src/services/PlanService";
import { SessionService } from "../src/services/SessionService";

const prisma = new PrismaClient();

async function main() {
  console.log("🧪 Testing Automatic Plan Evolution...");

  const testEmail = `auto-evo-${Date.now()}@test.com`;

  // 1. Create User
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      name: "Auto Evo Test User",
      password: "password123",
      gender: Gender.MALE,
      age: 28,
      weight: 80,
      height: 180,
      trainingLevel: ExperienceLevel.BEGINNER,
      trainingEnvironment: ExerciseEnvironment.GYM,
      trainingDaysPerWeek: 3,
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

  // 2. Generate Initial Plan (3 days/week = 3 sessions per week)
  console.log("📅 Generating initial 1-week plan...");
  const planInput = {
    userId: user.id,
    days: 3,
    goal: TrainingGoal.HYPERTROPHY,
    level: ExperienceLevel.BEGINNER,
    progressionId: "LINEAR_BEGINNER_4W",
    environment: ExerciseEnvironment.GYM,
    equipment: ["Barbell", "Dumbbell"],
  };

  const initialPlan = await PlanService.createPlan(planInput);
  console.log(`✅ Initial Plan ID: ${initialPlan.id}`);

  // 3. Get all sessions for this plan
  const sessions = await prisma.userSession.findMany({
    where: { planId: initialPlan.id },
    orderBy: [{ week: "asc" }, { dayNumber: "asc" }],
  });

  console.log(`📊 Total sessions in plan: ${sessions.length}`);

  // 4. Complete all sessions except the last one
  console.log(`\n💪 Completing ${sessions.length - 1} sessions...`);
  for (let i = 0; i < sessions.length - 1; i++) {
    const session = sessions[i];
    const plannedData = session.planned as any;

    await SessionService.completeSession(user.id, {
      planId: initialPlan.id,
      week: session.week,
      day: session.dayNumber,
      startedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      completedAt: new Date().toISOString(),
      notes: `Test completion ${i + 1}`,
      exercises: (plannedData.exercises || []).map((ex: any) => ({
        exerciseId: ex.exerciseId,
        timeSpentSec: 300,
        sets: [
          { setIndex: 0, reps: 10, weight: 50, rpe: 7 },
          { setIndex: 1, reps: 10, weight: 50, rpe: 8 },
          { setIndex: 2, reps: 9, weight: 50, rpe: 8.5 },
        ],
      })),
    });
    console.log(`  ✓ Session ${i + 1}/${sessions.length - 1} completed`);
  }

  // 5. Verify no evolution happened yet
  let evaluationBefore = await prisma.blockEvaluation.findUnique({
    where: { planId: initialPlan.id },
  });
  let nextPlanBefore = await prisma.userPlan.findFirst({
    where: { previousPlanId: initialPlan.id },
  });

  console.log(`\n🔍 Before final session:`);
  console.log(`  Evaluation exists: ${!!evaluationBefore}`);
  console.log(`  Next plan exists: ${!!nextPlanBefore}`);

  // 6. Complete the FINAL session (should trigger auto-evolution)
  console.log(
    `\n🎯 Completing FINAL session (should trigger auto-evolution)...`,
  );
  const lastSession = sessions[sessions.length - 1];
  const lastPlannedData = lastSession.planned as any;

  await SessionService.completeSession(user.id, {
    planId: initialPlan.id,
    week: lastSession.week,
    day: lastSession.dayNumber,
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    completedAt: new Date().toISOString(),
    notes: "Final session!",
    exercises: (lastPlannedData.exercises || []).map((ex: any) => ({
      exerciseId: ex.exerciseId,
      timeSpentSec: 300,
      sets: [
        { setIndex: 0, reps: 10, weight: 50, rpe: 7 },
        { setIndex: 1, reps: 10, weight: 50, rpe: 8 },
        { setIndex: 2, reps: 10, weight: 50, rpe: 8 },
      ],
    })),
  });

  // 7. Wait a bit for async evolution to complete
  console.log(`⏳ Waiting for auto-evolution to complete...`);
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 8. Verify auto-evolution happened
  const evaluationAfter = await prisma.blockEvaluation.findUnique({
    where: { planId: initialPlan.id },
  });
  const nextPlanAfter = await prisma.userPlan.findFirst({
    where: { previousPlanId: initialPlan.id },
  });

  console.log(`\n✅ After final session:`);
  console.log(`  Evaluation exists: ${!!evaluationAfter}`);
  console.log(`  Next plan exists: ${!!nextPlanAfter}`);

  if (evaluationAfter && nextPlanAfter) {
    console.log(`\n🎉 SUCCESS! Auto-evolution worked!`);
    console.log(`  Evaluation ID: ${evaluationAfter.id}`);
    console.log(`  Actions: ${JSON.stringify(evaluationAfter.actions)}`);
    console.log(`  Next Plan ID: ${nextPlanAfter.id}`);

    const nextPlanJson = nextPlanAfter.planJson as any;
    console.log(`  Old Level: ${planInput.level}`);
    console.log(`  New Level: ${nextPlanJson.input.level}`);
  } else {
    console.log(`\n❌ FAILED! Auto-evolution did not trigger.`);
    if (!evaluationAfter) console.log(`  Missing: BlockEvaluation`);
    if (!nextPlanAfter) console.log(`  Missing: Next UserPlan`);
  }

  console.log(`\n🎉 Test Completed!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
