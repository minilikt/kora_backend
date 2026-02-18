import { PrismaClient, ExerciseType, MuscleRole } from "@prisma/client";
import exercisesJson from "../public/exercises.json";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // 1️⃣ Seed Ontology (Muscles, Equipment, Categories, Movement Patterns)
  const muscleSet = new Set<string>();
  const equipmentSet = new Set<string>();
  const categorySet = new Set<string>();
  const movementPatternSet = new Set<string>();

  exercisesJson.forEach((ex: any) => {
    ex.anatomy.primary.forEach((m: string) => muscleSet.add(m));
    ex.anatomy.secondary.forEach((m: string) => muscleSet.add(m));
    ex.anatomy.stabilizers.forEach((m: string) => muscleSet.add(m));

    ex.requirements.equipment.forEach((e: string) => equipmentSet.add(e));
    categorySet.add(ex.classification.category);
    movementPatternSet.add(ex.classification.movement_pattern);
  });

  const muscles = Array.from(muscleSet).map((name) => ({ name }));
  const equipment = Array.from(equipmentSet).map((name) => ({ name }));
  const categories = Array.from(categorySet).map((name) => ({ name }));
  const movementPatterns = Array.from(movementPatternSet).map((name) => ({
    name,
  }));

  await prisma.muscle.createMany({ data: muscles, skipDuplicates: true });
  await prisma.equipment.createMany({ data: equipment, skipDuplicates: true });
  await prisma.category.createMany({ data: categories, skipDuplicates: true });
  await prisma.movementPattern.createMany({
    data: movementPatterns,
    skipDuplicates: true,
  });

  // Seed Splits
  const splitSet = new Set<string>();
  exercisesJson.forEach((ex: any) => {
    splitSet.add(ex.classification.split);
  });
  const splits = Array.from(splitSet).map((name) => ({ name }));
  await prisma.split.createMany({ data: splits, skipDuplicates: true });

  console.log("✅ Ontology seeded");

  // Map names → IDs for fast reference
  const musclesMap = Object.fromEntries(
    (await prisma.muscle.findMany()).map((m) => [m.name, m.id]),
  );
  const equipmentMap = Object.fromEntries(
    (await prisma.equipment.findMany()).map((e) => [e.name, e.id]),
  );
  const categoriesMap = Object.fromEntries(
    (await prisma.category.findMany()).map((c) => [c.name, c.id]),
  );
  const movementPatternsMap = Object.fromEntries(
    (await prisma.movementPattern.findMany()).map((m) => [m.name, m.id]),
  );
  const splitsMap = Object.fromEntries(
    (await prisma.split.findMany()).map((s) => [s.name, s.id]),
  );

  // 2️⃣ Seed Exercises
  const exercisesData = exercisesJson.map((ex: any) => ({
    id: ex.id,
    name: ex.name,
    type: (ex.classification.type.toUpperCase() === "COMPOUND"
      ? ExerciseType.COMPOUND
      : ExerciseType.ISOLATION) as ExerciseType,
    splitId: splitsMap[ex.classification.split],
    categoryId: categoriesMap[ex.classification.category],
    movementPatternId: movementPatternsMap[ex.classification.movement_pattern],
    instructions: ex.instructions,
    gifUrl: ex.gifUrl,
    difficultyRpeMin: ex.requirements.difficulty_rpe.min,
    difficultyRpeMax: ex.requirements.difficulty_rpe.max,
    rawData: ex,
  }));

  // Insert exercises in batches
  const batchSize = 50;
  for (let i = 0; i < exercisesData.length; i += batchSize) {
    const batch = exercisesData.slice(i, i + batchSize);
    await prisma.exercise.createMany({ data: batch, skipDuplicates: true });
    console.log(`✅ Seeded exercises ${i + 1}-${i + batch.length}`);
  }

  // 3️⃣ Seed Join Tables
  const exerciseMuscles: any[] = [];
  const exerciseEquipment: any[] = [];
  const exerciseAlternatives: any[] = [];

  exercisesJson.forEach((ex: any) => {
    ex.anatomy.primary.forEach((m: string) =>
      exerciseMuscles.push({
        exerciseId: ex.id,
        muscleId: musclesMap[m],
        role: MuscleRole.PRIMARY as MuscleRole,
      }),
    );
    ex.anatomy.secondary.forEach((m: string) =>
      exerciseMuscles.push({
        exerciseId: ex.id,
        muscleId: musclesMap[m],
        role: MuscleRole.SECONDARY as MuscleRole,
      }),
    );
    ex.anatomy.stabilizers.forEach((m: string) =>
      exerciseMuscles.push({
        exerciseId: ex.id,
        muscleId: musclesMap[m],
        role: MuscleRole.STABILIZER as MuscleRole,
      }),
    );

    ex.requirements.equipment.forEach((e: string) =>
      exerciseEquipment.push({
        exerciseId: ex.id,
        equipmentId: equipmentMap[e],
      }),
    );

    ex.logic_assets.alternatives.forEach((alt: string) => {
      if (alt !== ex.id) {
        exerciseAlternatives.push({ exerciseId: ex.id, alternativeId: alt });
      }
    });
  });

  // Batch insert join tables
  for (let i = 0; i < exerciseMuscles.length; i += batchSize) {
    await prisma.exerciseMuscle.createMany({
      data: exerciseMuscles.slice(i, i + batchSize),
      skipDuplicates: true,
    });
  }
  for (let i = 0; i < exerciseEquipment.length; i += batchSize) {
    await prisma.exerciseEquipment.createMany({
      data: exerciseEquipment.slice(i, i + batchSize),
      skipDuplicates: true,
    });
  }
  for (let i = 0; i < exerciseAlternatives.length; i += batchSize) {
    await prisma.exerciseAlternative.createMany({
      data: exerciseAlternatives.slice(i, i + batchSize),
      skipDuplicates: true,
    });
  }

  console.log("✅ Join tables seeded");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
