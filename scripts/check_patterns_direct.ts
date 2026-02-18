import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function checkPatternsDirectly() {
  const patterns = [
    "Horizontal Push",
    "Vertical Pull",
    "Knee Dominant",
    "Hip Dominant",
    "Vertical Push",
    "Elbow Flexion",
    "Elbow Extension",
    "Core",
    "Ankle Extension",
  ];

  for (const name of patterns) {
    const count = await prisma.exercise.count({
      where: { movementPattern: { name: name } },
    });
    console.log(`Pattern: [${name}] - Exercises: ${count}`);
  }
}

checkPatternsDirectly()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
