import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  const exercisesPath = path.join(__dirname, "../public/exercises.json");
  const rawData = fs.readFileSync(exercisesPath, "utf8");
  const exercises = JSON.parse(rawData);

  console.log(
    `🚀 Starting ontology seeding from ${exercises.length} exercises...`,
  );

  const muscles = new Set<string>();
  const equipment = new Set<string>();
  const patterns = new Set<string>();
  const categories = new Set<string>();
  const splits = new Set<string>();

  // Helper to normalize equipment names
  const normalizeEquipment = (name: string) => {
    const n = name.toLowerCase().trim();
    if (n === "dumbbells") return "Dumbbell";
    if (n === "barbells") return "Barbell";
    if (n === "kettlebells") return "Kettlebell";
    return name;
  };

  exercises.forEach((ex: any) => {
    if (ex.anatomy?.primary)
      ex.anatomy.primary.forEach((m: string) => muscles.add(m));
    if (ex.anatomy?.secondary)
      ex.anatomy.secondary.forEach((m: string) => muscles.add(m));
    if (ex.anatomy?.stabilizers)
      ex.anatomy.stabilizers.forEach((m: string) => muscles.add(m));

    if (ex.requirements?.equipment) {
      ex.requirements.equipment.forEach((e: string) => {
        equipment.add(normalizeEquipment(e));
      });
    }

    if (ex.classification?.movement_pattern)
      patterns.add(ex.classification.movement_pattern);
    if (ex.classification?.category) categories.add(ex.classification.category);
    if (
      ex.classification?.split &&
      typeof ex.classification.split === "string"
    ) {
      splits.add(ex.classification.split.toUpperCase().replace("/", "-"));
    }
  });

  console.log(
    `📦 Found ${muscles.size} muscles, ${equipment.size} equipment, ${patterns.size} patterns, ${categories.size} categories, ${splits.size} splits.`,
  );

  // 1. Categories
  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log("✅ Categories seeded.");

  // 2. Movement Patterns
  for (const name of patterns) {
    try {
      console.log(`🔹 Processing pattern: "${name}" (type: ${typeof name})`);
      const existing = await prisma.movementPattern.findUnique({
        where: { name },
      });
      if (!existing) {
        await prisma.movementPattern.create({
          data: { name },
        });
        console.log(`✅ Created pattern: "${name}"`);
      } else {
        console.log(`ℹ️ Pattern already exists: "${name}"`);
      }
    } catch (err: any) {
      console.warn(`⚠️ Failed to process pattern "${name}": ${err.message}`);
      if (err instanceof Error) {
        console.error(err.stack);
      }
    }
  }
  console.log("✅ Movement Patterns seeded.");

  // 3. Muscles
  for (const name of muscles) {
    try {
      console.log(`🔹 Upserting muscle: "${name}"`);
      await prisma.muscle.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    } catch (err: any) {
      console.warn(`⚠️ Failed to upsert muscle "${name}": ${err.message}`);
    }
  }
  console.log("✅ Muscles seeded.");

  // 4. Equipment
  for (const name of equipment) {
    try {
      console.log(`🔹 Upserting equipment: "${name}"`);
      await prisma.equipment.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    } catch (err: any) {
      console.warn(`⚠️ Failed to upsert equipment "${name}": ${err.message}`);
    }
  }
  console.log("✅ Equipment seeded.");

  // 5. Splits
  for (const name of splits) {
    try {
      await prisma.split.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    } catch (err: any) {
      console.warn(`⚠️ Failed to upsert split "${name}": ${err.message}`);
    }
  }
  console.log("✅ Splits seeded.");

  console.log("🏁 Ontology seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
