import {
  PrismaClient,
  SplitType,
  TrainingGoal,
  ExperienceLevel,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Seeding engine configurations...");

  // 1. Split Templates
  await prisma.splitTemplate.upsert({
    where: { id: "ppl-3" },
    update: {},
    create: {
      id: "ppl-3",
      name: "Push Pull Legs (3 Day)",
      type: SplitType.PUSH_PULL_LEGS,
      daysPerWeek: 3,
      structure: [
        {
          day: 1,
          focus: ["CHEST", "SHOULDERS", "TRICEPS"],
          blocks: [
            { pattern: "Horizontal Push", sets: 5 },
            { pattern: "Vertical Push", sets: 3 },
          ],
        },
        {
          day: 2,
          focus: ["BACK", "BICEPS"],
          blocks: [
            { pattern: "Vertical Pull", sets: 5 },
            { pattern: "Horizontal Pull", sets: 3 },
          ],
        },
        { day: 3, rest: true },
        {
          day: 4,
          focus: ["QUADS", "HAMSTRINGS", "GLUTES"],
          blocks: [
            { pattern: "Knee Dominant", sets: 5 },
            { pattern: "Hip Dominant", sets: 5 },
          ],
        },
        { day: 5, rest: true },
        { day: 6, rest: true },
        { day: 7, rest: true },
      ],
      constraints: {},
    },
  });

  // 2. Volume Profiles
  await prisma.volumeProfile.upsert({
    where: { id: "intermediate-hypertrophy" },
    update: {},
    create: {
      id: "intermediate-hypertrophy",
      goal: TrainingGoal.HYPERTROPHY,
      priority: "BALANCED",
      experienceLevel: ExperienceLevel.INTERMEDIATE,
      weeklySets: {
        CHEST: 12,
        BACK: 14,
        QUADS: 10,
        HAMSTRINGS: 8,
        SHOULDERS: 8,
        BICEPS: 6,
        TRICEPS: 6,
      },
      repRange: { compound: [6, 10], isolation: [10, 15] },
      intensityRange: [65, 80],
    },
  });

  // 3. Progression Models
  await prisma.progressionModel.upsert({
    where: { id: "linear-overload-4w" },
    update: {},
    create: {
      id: "linear-overload-4w",
      name: "Linear Overload (4 Weeks)",
      type: "LINEAR",
      durationWeeks: 4,
      weeks: [
        { week: 1, intensity: 0.7, rpe: 7 },
        { week: 2, intensity: 0.75, rpe: 8 },
        { week: 3, intensity: 0.8, rpe: 9 },
        { week: 4, deload: true, intensity: 0.6, rpe: 6 },
      ],
    },
  });

  console.log("✅ Configuration seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
