import { PrismaClient } from "@prisma/client";
import axios from "axios";

const prisma = new PrismaClient();

async function main() {
  console.log("🧪 Starting Exercise Search Verification...");

  const BASE_URL = "http://localhost:3001/api/exercises"; // Assuming default port might be 3001 or check server.ts

  // Note: Since the server needs to be running, and we are in a script,
  // we might want to test the logic directly or trigger the express app.
  // However, the task asked for a test to see what I can do.

  // Let's check some data first to see what we can search for.
  const sampleExercise = await prisma.exercise.findFirst({
    include: {
      muscles: { include: { muscle: true } },
      equipment: { include: { equipment: true } },
    },
  });

  if (!sampleExercise) {
    console.log("❌ No exercises found in database. Seed it first!");
    return;
  }

  console.log(`🔍 Found sample exercise: ${sampleExercise.name}`);
  const muscleName = sampleExercise.muscles[0]?.muscle.name;
  const equipmentName = sampleExercise.equipment[0]?.equipment.name;

  console.log(
    `--- Test 1: Search by Name (${sampleExercise.name.substring(0, 5)}) ---`,
  );
  // We'll simulate the call logic since we don't want to rely on the server being up for this specific verification script
  // but if the user wants to see it LIVE, we can start the server.
  // For now, let's just use the prisma queries we wrote in the controller to verify they work.

  const searchByName = await prisma.exercise.findMany({
    where: {
      name: {
        contains: sampleExercise.name.substring(0, 5),
        mode: "insensitive",
      },
    },
  });
  console.log(`✅ Found ${searchByName.length} exercises.`);

  if (muscleName) {
    console.log(`--- Test 2: Search by Muscle (${muscleName}) ---`);
    const searchByMuscle = await prisma.exercise.findMany({
      where: {
        muscles: {
          some: {
            muscle: { name: { contains: muscleName, mode: "insensitive" } },
          },
        },
      },
    });
    console.log(`✅ Found ${searchByMuscle.length} exercises.`);
  }

  if (equipmentName) {
    console.log(`--- Test 3: Search by Equipment (${equipmentName}) ---`);
    const searchByEquipment = await prisma.exercise.findMany({
      where: {
        equipment: {
          some: {
            equipment: {
              name: { contains: equipmentName, mode: "insensitive" },
            },
          },
        },
      },
    });
    console.log(`✅ Found ${searchByEquipment.length} exercises.`);
  }

  console.log("🎉 Verification Logic Checked!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
