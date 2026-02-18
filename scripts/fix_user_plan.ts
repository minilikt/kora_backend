import { PrismaClient } from "@prisma/client";
import { PlanService } from "../src/services/PlanService";
const prisma = new PrismaClient();

async function fixUserPlan() {
  const sessionId = "cmlp238fu000ivw30vhtuoz21";
  const session = await prisma.userSession.findUnique({
    where: { id: sessionId },
    select: { userId: true, plan: { select: { planJson: true } } },
  });

  if (!session || !session.userId) {
    console.log("Session or User not found");
    return;
  }

  console.log(`🚀 Regenerating plan for user ${session.userId}...`);

  // We reuse the original input but the code now has fixed logic
  const oldInput = (session.plan as any).planJson.input;

  // Manually trigger generation with the new logic
  await PlanService.createPlan(oldInput);

  console.log("✅ Plan successfully regenerated with exercises!");
}

fixUserPlan()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
