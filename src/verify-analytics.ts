import { PrismaClient } from "@prisma/client";
import { SessionService } from "./services/SessionService";

const prisma = new PrismaClient();

async function verify() {
    console.log("🔍 Verifying Analytics Optimization...");

    const user = await prisma.user.findFirst({
        orderBy: { createdAt: 'desc' }
    });

    if (!user) {
        console.error("No user found");
        return;
    }

    const plan = await prisma.userPlan.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
    });

    if (!plan) {
        console.error("No plan found");
        return;
    }

    const exerciseId = Object.keys((plan.planJson as any).exerciseLibrary)[0];

    // 1. Submit a session with a PR
    const payload = {
        planId: plan.id,
        week: 1,
        day: 1,
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        completedAt: new Date().toISOString(),
        exercises: [
            {
                exerciseId: exerciseId,
                sets: [
                    { setIndex: 1, weight: 500, reps: 5, rpe: 9 }, // Very heavy for PR
                ],
            },
        ],
    };

    console.log("🚀 Submitting session...");
    const session = await SessionService.completeSession(user.id, payload as any);

    // 2. Check DailyActivity
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daily = await prisma.dailyActivity.findUnique({
        where: { userId_date: { userId: user.id, date: today } }
    });

    console.log("📊 Daily Activity Tonnage:", daily?.totalTonnage);
    if (daily?.totalTonnage === 2500) {
        console.log("✅ Tonnage calculation correct (500 * 5 = 2500)");
    } else {
        console.log("❌ Tonnage calculation mismatch", daily?.totalTonnage);
    }

    // 3. Check PR
    const pr = await prisma.userPersonalRecord.findUnique({
        where: { userId_exerciseId: { userId: user.id, exerciseId } }
    });

    console.log("🏆 PR Weight:", pr?.weight);
    if (pr?.weight === 500) {
        console.log("✅ Personal Record updated successfully");
    } else {
        console.log("❌ Personal Record not found or incorrect weight");
    }

    await prisma.$disconnect();
}

verify().catch(console.error);
