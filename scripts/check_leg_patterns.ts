import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function checkLegPatterns() {
  const legPatterns = [
    "Knee Dominant",
    "Hip Dominant",
    "Ankle Extension",
    "Elbow Flexion",
    "Elbow Extension",
    "Neck Extension",
    "Core",
  ];

  for (const name of legPatterns) {
    const p = await prisma.movementPattern.findUnique({
      where: { name: name },
    });
    const count = await prisma.exercise.count({
      where: { movementPattern: { name: name } },
    });
    console.log(
      `Pattern: [${name}] - Found in DB: ${!!p} - Exercises: ${count}`,
    );
  }
}

checkLegPatterns()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
