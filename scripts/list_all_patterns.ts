import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function listAllPatterns() {
  const patterns = await prisma.movementPattern.findMany();
  patterns.forEach((p) => console.log(`PATTERN_NAME: "${p.name}"`));
}

listAllPatterns()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
