import { PrismaClient, TrainingGoal, ExperienceLevel, ExerciseEnvironment, DayOfWeek } from "@prisma/client";
import bcrypt from "bcrypt";
import * as fs from "fs";
import testUserData from "./test-user-meta.json";

const LOG_FILE = "prisma/seed.log";
function log(msg: string) {
    console.log(msg);
    fs.appendFileSync(LOG_FILE, `${new Date().toISOString()}: ${msg}\n`);
}

const prisma = new PrismaClient();

async function main() {
    const { user: userMeta, planJson, planMeta } = testUserData;
    const email = userMeta.email;

    log(`🚀 Seeding process started for: ${email}...`);

    // 1. Create/Cleanup User
    log("🧹 Cleaning up old user...");
    await prisma.user.deleteMany({ where: { email } }).catch((e) => log(`Note: Clean up failed or was empty: ${e.message}`));

    log("🔑 Creating user...");
    const passwordHash = await bcrypt.hash("password123", 10); // Standard test password
    const user = await prisma.user.create({
        data: {
            email,
            password: passwordHash,
            name: userMeta.name,
            trainingLevel: userMeta.trainingLevel as ExperienceLevel,
            workoutDays: userMeta.workoutDays as DayOfWeek[],
            age: userMeta.age,
            weight: userMeta.weight,
            height: userMeta.height,
            gender: userMeta.gender as any,
            targetWeight: userMeta.targetWeight,
            trainingEnvironment: userMeta.trainingEnvironment as ExerciseEnvironment,
        },
    });

    log(`✅ User created: ${user.id}`);

    // 2. Training Profile (Initial state)
    await prisma.userTrainingProfile.create({
        data: {
            userId: user.id,
            fatigueIndex: 0.2,
            performanceIndex: 0.5,
            muscleProfile: {} as any,
        },
    });

    // 3. Save the Plan
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 28); // Started 4 weeks ago

    const userPlan = await prisma.userPlan.create({
        data: {
            userId: user.id,
            planJson: planJson as any,
            startDate: startDate,
            endDate: new Date(),
        },
    });

    // 4. Create Sessions and Logs (Backdated)
    log(`📅 Generating 4 weeks of detailed session history...`);

    let currentFatigue = 0.2;
    let currentPerformance = 0.5;
    let totalActiveSec = 0;
    const sessionDates: Date[] = [];

    for (const weekData of planJson.weeks) {
        const w = weekData.week;
        log(`  Processing Week ${w}...`);
        const weekStartDate = new Date(startDate);
        weekStartDate.setDate(weekStartDate.getDate() + (w - 1) * 7);

        for (const session of weekData.sessions) {
            const sessionDate = new Date(weekStartDate);
            sessionDate.setDate(sessionDate.getDate() + (session.day - 1));

            let totalTonnage = 0;
            const exercisesToLog = [];

            // Simulate session variance
            const sessionAdherence = w === 4 ? 0.9 : 1.0; // Slightly less intensity in deload
            const sessionRpeVariation = (Math.random() - 0.5) * 1.0;

            for (const ex of session.exercises) {
                const plannedSets = ex.sets;
                // Realistic weight scaling: start with something sensible and progress
                const baseWeight = (ex.exerciseId.length % 10) * 10 + 20;
                const actualWeight = baseWeight + (w * 2.5);
                const reps = parseInt(ex.reps.split('-')[0]) || 10;

                totalTonnage += plannedSets * reps * actualWeight;
                exercisesToLog.push({
                    ex,
                    plannedSets,
                    actualWeight,
                    reps,
                    rpe: ex.rpe + sessionRpeVariation
                });
            }

            // Simulate session variance and progression
            const intensityMultiplier = weekData.intensity;
            const weekProgression = (w - 1) / 3; // 0 to 1 over 4 weeks
            const performanceScore = 0.75 + (weekProgression * 0.15) + (Math.random() * 0.1);

            // Fatigue builds up during the block, drops in deload (Week 4)
            if (w < 4) {
                currentFatigue = Math.min(0.9, currentFatigue + 0.15);
            } else {
                currentFatigue = Math.max(0.2, currentFatigue - 0.4);
            }
            currentPerformance = 0.4 + (weekProgression * 0.4) + (Math.random() * 0.1);

            const userSession = await prisma.userSession.create({
                data: {
                    planId: userPlan.id,
                    userId: user.id,
                    week: w,
                    dayNumber: session.day,
                    completedStatus: true,
                    completedAt: sessionDate,
                    totalTimeSec: 2700 + Math.random() * 1200,
                    avgRPE: session.exercises.reduce((acc: number, e: any) => acc + e.rpe, 0) / session.exercises.length + sessionRpeVariation,
                    totalTonnage: totalTonnage,
                    performanceScore: performanceScore,
                    fatigueScore: currentFatigue,
                    planned: {
                        focus: session.focus,
                        exercises: session.exercises
                    } as any,
                },
            });

            totalActiveSec += userSession.totalTimeSec;
            sessionDates.push(new Date(sessionDate));

            for (const logData of exercisesToLog) {
                const { ex, plannedSets, actualWeight, reps, rpe } = logData;
                await prisma.userExerciseLog.create({
                    data: {
                        sessionId: userSession.id,
                        exerciseId: ex.exerciseId,
                        plannedSets: plannedSets,
                        plannedReps: ex.reps,
                        plannedRpe: ex.rpe,
                        actualSets: plannedSets,
                        repsPerSet: Array(plannedSets).fill(reps),
                        weightsPerSet: Array(plannedSets).fill(actualWeight),
                        rpePerSet: Array(plannedSets).fill(rpe),
                        performanceScore: performanceScore,
                        completed: true,
                    },
                });

                // Populate MuscleVolumeHistory
                const exercise = await prisma.exercise.findUnique({
                    where: { id: ex.exerciseId },
                    include: { muscles: true }
                });

                if (exercise) {
                    for (const m of exercise.muscles) {
                        if (m.role === 'PRIMARY') {
                            await prisma.muscleVolumeHistory.upsert({
                                where: {
                                    userId_date_muscleId: {
                                        userId: user.id,
                                        date: sessionDate,
                                        muscleId: m.muscleId
                                    }
                                },
                                update: {
                                    volume: { increment: plannedSets * reps * actualWeight * m.activationMultiplier },
                                    setsCount: { increment: plannedSets }
                                },
                                create: {
                                    userId: user.id,
                                    date: sessionDate,
                                    muscleId: m.muscleId,
                                    volume: plannedSets * reps * actualWeight * m.activationMultiplier,
                                    setsCount: plannedSets
                                }
                            });
                        }
                    }
                }
            }

            const activityDate = new Date(sessionDate);
            activityDate.setHours(0, 0, 0, 0);

            // Update user adaptive state after each session
            await prisma.userAdaptiveState.create({
                data: {
                    userId: user.id,
                    fatigueScore: currentFatigue,
                    recoveryScore: Math.min(1.0, 1.2 - currentFatigue),
                    performanceScore: currentPerformance,
                    volumeMultiplier: intensityMultiplier,
                    intensityMultiplier: intensityMultiplier,
                    date: activityDate,
                    createdAt: sessionDate
                }
            });

            // Populate DailyActivity with hourly distribution
            const sessionHour = sessionDate.getHours();
            const hourlyDistribution: Record<string, number> = {};
            hourlyDistribution[sessionHour.toString()] = 1;

            await prisma.dailyActivity.upsert({
                where: { userId_date: { userId: user.id, date: activityDate } },
                update: {
                    activeMinutes: { increment: Math.floor(userSession.totalTimeSec / 60) },
                    workoutsCount: { increment: 1 },
                    successScore: { set: performanceScore }, // Running average logic not needed for simple seed
                    hourlyDistribution: hourlyDistribution as any
                },
                create: {
                    userId: user.id,
                    date: activityDate,
                    activeMinutes: Math.floor(userSession.totalTimeSec / 60),
                    workoutsCount: 1,
                    successScore: performanceScore,
                    hourlyDistribution: hourlyDistribution as any
                }
            });
        }

        // Recover slightly at end of week
        currentFatigue = Math.max(0.1, currentFatigue - 0.15);
    }

    // 5. Block Evaluation (Simulate end of 4 week block)
    log(`📊 Generating block evaluation...`);
    await prisma.blockEvaluation.create({
        data: {
            planId: userPlan.id,
            completionRate: 1.0,
            avgSessionDuration: 3200,
            avgRpe: 7.5,
            performanceTrend: 0.15,
            actions: {
                recommendedVolumeShift: 1.05,
                suggestedIntensityIncrease: 0.025
            } as any,
            muscleMetrics: {
                Chest: { volumeTrend: 1.1, consistency: 1.0 },
                Back: { volumeTrend: 1.05, consistency: 0.95 },
                Legs: { volumeTrend: 1.2, consistency: 1.0 }
            } as any
        }
    });

    // 6. Final User Profile Update (Streaks & Total Hours)
    log(`📈 Calculating final user metrics...`);

    // Sort dates to calculate streak
    const sortedDates = sessionDates.sort((a, b) => a.getTime() - b.getTime());
    const uniqueDates = Array.from(new Set(sortedDates.map(d => d.toISOString().split('T')[0])))
        .map(s => new Date(s));

    let currentStreak = 0;
    let longestStreak = 0;

    if (uniqueDates.length > 0) {
        let tempStreak = 1;
        for (let i = 1; i < uniqueDates.length; i++) {
            const diffTime = Math.abs(uniqueDates[i].getTime() - uniqueDates[i - 1].getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                tempStreak++;
            } else {
                longestStreak = Math.max(longestStreak, tempStreak);
                tempStreak = 1;
            }
        }
        longestStreak = Math.max(longestStreak, tempStreak);

        // Check if current streak is ongoing (compared to today)
        const lastDate = uniqueDates[uniqueDates.length - 1];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastDateDate = new Date(lastDate);
        lastDateDate.setHours(0, 0, 0, 0);

        const diffToToday = Math.abs(today.getTime() - lastDateDate.getTime());
        const daysToToday = Math.ceil(diffToToday / (1000 * 60 * 60 * 24));

        if (daysToToday <= 1) {
            currentStreak = tempStreak;
        } else {
            currentStreak = 0;
        }
    }

    await prisma.user.update({
        where: { id: user.id },
        data: {
            streakCount: currentStreak,
            longestStreak: longestStreak,
            totalActiveHours: parseFloat((totalActiveSec / 3600).toFixed(2)),
            lastActiveAt: new Date()
        }
    });

    log(`✅ Final Update: Streak: ${currentStreak}, Longest: ${longestStreak}, Total Hours: ${(totalActiveSec / 3600).toFixed(2)}`);
    console.log(`✅ Fully seeded test user: ${email} / password123`);
    console.log(`✅ 4 weeks of data, adaptive states, and block evaluation populated.`);
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
