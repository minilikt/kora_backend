import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function checkExerciseMatrix() {
  const matrix = await prisma.exercise.groupBy({
    by: ["level", "environment"],
    _count: { id: true },
  });
  console.log("Exercise Level/Env Matrix:", JSON.stringify(matrix, null, 2));

  const patternCounts = await prisma.exercise.groupBy({
    by: ["movementPatternId"],
    _count: { id: true },
  });

  // Get pattern names for those IDs
  for (const pc of patternCounts) {
    const p = await (prisma as any).movementPattern.findUnique({
      where: { id: pc.movementPatternId },
    });
    console.log(`Pattern: ${p?.name} - Count: ${pc._count.id}`);
  }
}

checkExerciseMatrix()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
