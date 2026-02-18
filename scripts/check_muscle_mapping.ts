import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function checkMusclePatterns() {
  const muscles = ["QUADS", "HAMSTRINGS", "GLUTES", "BACK"];
  for (const mName of muscles) {
    const exercises = await prisma.exercise.findMany({
      where: { muscles: { some: { muscle: { name: mName } } } },
      include: { movementPattern: true },
      take: 1,
    });
    if (exercises.length > 0) {
      console.log(
        `Muscle: ${mName} -> Pattern: ${exercises[0].movementPattern?.name}`,
      );
    } else {
      console.log(`Muscle: ${mName} -> No exercises found`);
    }
  }
}

checkMusclePatterns()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
