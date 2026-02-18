import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function listAllPatternsClean() {
  const patterns = await prisma.movementPattern.findMany({
    select: { name: true },
  });
  for (const p of patterns) {
    process.stdout.write(`PATTERN: [${p.name}]\n`);
  }
}

listAllPatternsClean()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
