import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function findLegPatterns() {
  const all = await prisma.movementPattern.findMany({
    where: {
      OR: [
        { name: { contains: "Knee" } },
        { name: { contains: "Hip" } },
        { name: { contains: "Leg" } },
        { name: { contains: "Squat" } },
        { name: { contains: "Lower" } },
        { name: { contains: "Extension" } },
        { name: { contains: "Flexion" } },
      ],
    },
    select: { name: true },
  });
  console.log(
    "Similar Patterns:",
    JSON.stringify(
      all.map((p) => p.name),
      null,
      2,
    ),
  );
}

findLegPatterns()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
