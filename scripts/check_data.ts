import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function checkEquipment() {
  const equipment = await prisma.equipment.findMany();
  console.log(
    "Available Equipment:",
    equipment.map((e) => e.name),
  );

  // Check one exercise to see its equipment
  const ex = await prisma.exercise.findFirst({
    include: { equipment: { include: { equipment: true } } },
  });
  console.log(
    "Sample Exercise:",
    ex?.name,
    "Equipment:",
    ex?.equipment.map((e: any) => e.equipment.name),
  );

  // Check patterns
  const patterns = await prisma.movementPattern.findMany();
  console.log(
    "Patterns:",
    patterns.map((p) => p.name),
  );
}

checkEquipment()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
