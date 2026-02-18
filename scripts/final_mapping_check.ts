import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function findRepresentativeExercises() {
  const muscles = await prisma.muscle.findMany({
    where: {
      OR: [
        { name: { contains: "Pectoralis" } },
        { name: { contains: "Latissimus" } },
        { name: { contains: "Quadriceps" } },
        { name: { contains: "Biceps Femoris" } },
        { name: { contains: "Deltoid" } },
      ],
    },
  });

  for (const m of muscles) {
    const ex = await prisma.exercise.findFirst({
      where: { muscles: { some: { muscleId: m.id } } },
      include: { movementPattern: true },
    });
    console.log(
      `Muscle: [${m.name}] -> Exercise: [${ex?.name}] -> Pattern: [${ex?.movementPattern?.name}]`,
    );
  }
}

findRepresentativeExercises()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
