import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function findClosePatterns() {
  const all = await prisma.movementPattern.findMany({ select: { name: true } });
  console.log(
    "ALL PATTERNS:",
    JSON.stringify(
      all.map((p) => p.name),
      null,
      2,
    ),
  );
}

findClosePatterns()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
