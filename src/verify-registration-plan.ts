import { PrismaClient } from "@prisma/client";
import { UserService } from "./services/UserService";
import * as fs from "fs";

const prisma = new PrismaClient();
const logFile = "verification_output.log";

function log(message: string) {
  console.log(message);
  fs.appendFileSync(logFile, message + "\n");
}

async function main() {
  if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
  log("🚀 Starting Registration & Plan Verification...");

  const timestamp = Date.now();
  const testData = {
    email: `testuser_${timestamp}@example.com`,
    password: "password123",
    name: "Verification User",
    trainingLevel: "INTERMEDIATE" as any,
    trainingDaysPerWeek: 4,
    trainingEnvironment: "GYM" as any,
    goal: "HYPERTROPHY" as any,
  };

  log(`📝 Registering user: ${testData.email}`);

  try {
    // 1. Simluate registration which should trigger plan generation
    const result = await UserService.registerAndGeneratePlan(testData);
    const userId = result.user.id;

    log(`✅ User registered with ID: ${userId}`);

    // 2. Verify Plan Creation
    log("🔍 Checking for generated plan...");
    const plan = await prisma.userPlan.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (!plan) {
      log("❌ FAILED: No plan was generated for the user.");
      process.exit(1);
    }

    log(`✅ Plan found! ID: ${plan.id}`);
    log(
      `📅 Plan Period: ${plan.startDate.toISOString()} to ${plan.endDate?.toISOString()}`,
    );

    // 3. Verify Session Creation
    const sessions = await prisma.userSession.findMany({
      where: { planId: plan.id },
    });

    log(`✅ ${sessions.length} sessions were pre-populated.`);

    // 4. Output JSON Structure Preview
    log("\n--- Plan JSON Structure Preview ---");
    const planJson = plan.planJson as any;
    log(`Version: ${planJson.version}`);
    log("Keys in Plan JSON: " + Object.keys(planJson).join(", "));

    if (planJson.weeks && planJson.weeks.length > 0) {
      log(`\nSample Week 1 (Day 1) Exercises:`);
      const week1 = planJson.weeks[0];
      const session1 = week1.sessions.find((s: any) => !s.rest);
      if (session1) {
        log(JSON.stringify(session1.exercises.slice(0, 2), null, 2));
      }
    }

    log("\n--- API Info ---");
    log("Endpoint: GET /api/plans/active");
    log("Authentication: Required (Bearer Token)");
  } catch (error: any) {
    log(`❌ Verification failed with error: ${error.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
