import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function listPatterns() {
  const patterns = await prisma.movementPattern.findMany({
    select: { name: true },
  });
  console.log(
    "Database Patterns:",
    JSON.stringify(
      patterns.map((p) => p.name),
      null,
      2,
    ),
  );
}

listPatterns()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
