import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient() as any;

async function main() {
  const counts = {
    exercises: await prisma.exercise.count(),
    muscles: await prisma.muscle.count(),
    equipment: await prisma.equipment.count(),
    patterns: await prisma.movementPattern.count(),
    categories: await prisma.category.count(),
    splits: await prisma.split.count(),
    exerciseMuscles: await prisma.exerciseMuscle.count(),
    exerciseEquipment: await prisma.exerciseEquipment.count(),
    userPlans: await prisma.userPlan.count(),
    users: await prisma.user.count(),
  };

  console.log("Database Counts:", JSON.stringify(counts, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
