import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

async function debug() {
  const data: any = {};

  data.patterns = await prisma.movementPattern.findMany({
    select: { name: true },
  });
  data.equipment = await prisma.equipment.findMany({ select: { name: true } });
  data.exerciseCount = await prisma.exercise.count();
  data.sampleExercises = await prisma.exercise.findMany({
    take: 5,
    include: {
      movementPattern: true,
      equipment: { include: { equipment: true } },
    },
  });

  fs.writeFileSync("db_debug_output.json", JSON.stringify(data, null, 2));
  console.log("✅ Debug data written to db_debug_output.json");
  await prisma.$disconnect();
}

debug();
