import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function listEverything() {
  const muscles = await prisma.muscle.findMany({ select: { name: true } });
  const patterns = await prisma.movementPattern.findMany({
    select: { name: true },
  });
  const equipment = await prisma.equipment.findMany({ select: { name: true } });

  console.log("--- MUSCLES ---");
  muscles.forEach((m) => console.log(m.name));
  console.log("\n--- PATTERNS ---");
  patterns.forEach((p) => console.log(p.name));
  console.log("\n--- EQUIPMENT ---");
  equipment.forEach((e) => console.log(e.name));
}

listEverything()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
