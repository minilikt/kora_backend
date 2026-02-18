import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";

interface Exercise {
  id: string;
  name: string;
  classification: any;
  requirements: any;
  anatomy: any;
  programming: any;
  logic_assets: {
    alternatives: string[];
    tags: string[];
  };
  gifUrl: string;
  instructions: string[];
}

async function migrateExerciseIds() {
  console.log("🔄 Starting Exercise ID migration to UUIDs...\n");

  // Read the exercises.json file
  const exercisesPath = path.join(__dirname, "../public/exercises.json");
  const exercisesData = JSON.parse(
    fs.readFileSync(exercisesPath, "utf-8"),
  ) as Exercise[];

  console.log(`📊 Found ${exercisesData.length} exercises to migrate`);

  // Create a mapping of old ID → new UUID
  const idMapping = new Map<string, string>();
  exercisesData.forEach((exercise) => {
    idMapping.set(exercise.id, randomUUID());
  });

  console.log(`✅ Generated ${idMapping.size} UUIDs\n`);

  // Update exercise IDs
  console.log("🔧 Updating exercise IDs...");
  exercisesData.forEach((exercise) => {
    exercise.id = idMapping.get(exercise.id)!;
  });

  // Update alternative references
  console.log("🔗 Updating alternative references...");
  let updatedAlternatives = 0;
  exercisesData.forEach((exercise) => {
    const updatedAlts = exercise.logic_assets.alternatives
      .map((oldId) => idMapping.get(oldId))
      .filter((id): id is string => id !== undefined);

    updatedAlternatives += updatedAlts.length;
    exercise.logic_assets.alternatives = updatedAlts;
  });

  console.log(`✅ Updated ${updatedAlternatives} alternative references\n`);

  // Write the updated data back to the file
  console.log("💾 Writing updated exercises.json...");
  fs.writeFileSync(
    exercisesPath,
    JSON.stringify(exercisesData, null, 2),
    "utf-8",
  );

  console.log("✅ Migration complete!\n");
  console.log("📋 Summary:");
  console.log(`   - Exercises migrated: ${exercisesData.length}`);
  console.log(`   - UUIDs generated: ${idMapping.size}`);
  console.log(`   - Alternative references updated: ${updatedAlternatives}`);
}

migrateExerciseIds()
  .then(() => {
    console.log("\n🎉 Exercise ID migration successful!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  });
