import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function checkExerciseDetails() {
  const exercises = await prisma.exercise.findMany({
    where: { movementPattern: { name: "Horizontal Push" } },
    include: { equipment: { include: { equipment: true } } },
  });

  console.log("Horizontal Push Exercises:");
  exercises.forEach((ex) => {
    console.log(
      `- ${ex.name} (Level: ${ex.level}, Env: ${ex.environment}) Eq: ${ex.equipment.map((e: any) => e.equipment.name).join(", ")}`,
    );
  });

  // Check one for Vertical Pull too
  const verticalPull = await prisma.exercise.findMany({
    where: { movementPattern: { name: "Vertical Pull" } },
    include: { equipment: { include: { equipment: true } } },
  });
  console.log("\nVertical Pull Exercises:");
  verticalPull.forEach((ex) => {
    console.log(
      `- ${ex.name} (Level: ${ex.level}, Env: ${ex.environment}) Eq: ${ex.equipment.map((e: any) => e.equipment.name).join(", ")}`,
    );
  });
}

checkExerciseDetails()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
