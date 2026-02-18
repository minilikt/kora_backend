import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function listMuscles() {
  const muscles = await prisma.muscle.findMany();
  console.log(
    "Database Muscles:",
    JSON.stringify(
      muscles.map((m) => m.name),
      null,
      2,
    ),
  );
}

listMuscles()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
