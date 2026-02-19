import { UserService } from "./src/services/UserService";
import { PrismaClient, Gender } from "@prisma/client";

const prisma = new PrismaClient();

async function testGeneration() {
  const email = `test-${Date.now()}@example.com`;
  console.log(`🧪 Testing plan generation for ${email}...`);

  try {
    const result = await UserService.registerAndGeneratePlan({
      email,
      password: "password123",
      name: "Test User",
      trainingDaysPerWeek: 3,
      goal: "HYPERTROPHY" as any,
    });

    console.log("✅ Registration result:", {
      userId: result.user.id,
      hasTokens: !!result.accessToken && !!result.refreshToken,
    });

    const plan = await prisma.userPlan.findFirst({
      where: { userId: result.user.id },
    });

    if (plan) {
      console.log("✨ SUCCESS: Plan generated!");
    } else {
      console.error("❌ FAILURE: Plan not generated.");
    }
  } catch (error) {
    console.error("❌ Test failed with error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testGeneration();
