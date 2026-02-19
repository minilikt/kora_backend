import { PrismaClient } from "@prisma/client";
import { PlanCompiler, PlanInput } from "../engines/PlanCompiler";

const prisma = new PrismaClient();

export class PlanService {
  /**
   * Generates a new workout plan and persists it to the database.
   * This includes creating the UserPlan record and pre-populating UserSessions.
   */
  static async createPlan(input: PlanInput) {
    console.log(
      `🤖 PlanService: Generating optimized plan for user ${input.userId}...`,
    );

    // 1. Generate the plan structure using the Compiler
    const { planJson, startDate, endDate } = await PlanCompiler.generate(input);

    // 2. Persist to UserPlan and Sessions
    const userPlan = await prisma.$transaction(async (tx: any) => {
      // Create the plan record
      const plan = await tx.userPlan.create({
        data: {
          userId: input.userId,
          planJson: planJson as any,
          startDate: startDate,
          endDate: endDate,
        },
      });

      // Create session records for each day of the plan
      for (const week of planJson.weeks) {
        for (const session of week.sessions) {
          await tx.userSession.create({
            data: {
              userId: input.userId,
              planId: plan.id,
              dayNumber: session.day,
              week: week.week,
              planned: session, // Store the optimized session JSON
            },
          });
        }
      }

      return plan;
    });

    console.log(
      `✅ PlanService: Created optimized plan ${userPlan.id} with ${planJson.weeks.length * planJson.weeks[0].sessions.length} sessions.`,
    );
    return userPlan;
  }

  /**
   * Retrieves all plans for a user.
   */
  static async getPlans(userId: string) {
    return prisma.userPlan.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        sessions: {
          orderBy: [{ week: "asc" }, { dayNumber: "asc" }],
        },
      },
    });
  }

  /**
   * Retrieves the active plan for a user.
   */
  static async getActivePlan(userId: string) {
    return prisma.userPlan.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        sessions: {
          orderBy: [{ week: "asc" }, { dayNumber: "asc" }],
        },
      },
    });
  }
}
