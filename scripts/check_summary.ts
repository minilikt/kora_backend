import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function checkSummary() {
  const exerciseCount = await prisma.exercise.count();
  const patternCount = await prisma.movementPattern.count();
  const equipmentCount = await prisma.equipment.count();

  console.log({ exerciseCount, patternCount, equipmentCount });

  const patterns = await prisma.movementPattern.findMany({
    take: 10,
    select: { name: true },
  });
  console.log(
    "Sample Patterns:",
    patterns.map((p) => p.name),
  );

  const equipments = await prisma.equipment.findMany({
    take: 10,
    select: { name: true },
  });
  console.log(
    "Sample Equipment:",
    equipments.map((e) => e.name),
  );

  const sampleEx = await prisma.exercise.findFirst({
    include: {
      movementPattern: true,
      equipment: { include: { equipment: true } },
    },
  });
  console.log("Sample Exercise:", {
    name: sampleEx?.name,
    pattern: sampleEx?.movementPattern?.name,
    equipment: sampleEx?.equipment.map((e: any) => e.equipment.name),
  });
}

checkSummary()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
