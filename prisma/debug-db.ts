import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("📊 Database Table Counts:");
  console.log("Muscles:", await prisma.muscle.count());
  console.log("Equipment:", await prisma.equipment.count());
  console.log("Categories:", await prisma.category.count());
  console.log("Movement Patterns:", await prisma.movementPattern.count());
  console.log("Splits:", await prisma.split.count());
  console.log("Exercises:", await prisma.exercise.count());
  console.log("Exercise Muscles:", await prisma.exerciseMuscle.count());
  console.log("Exercise Equipment:", await prisma.exerciseEquipment.count());
  console.log(
    "Exercise Alternatives:",
    await prisma.exerciseAlternative.count(),
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
