import { ExerciseSelector } from "../src/engines/ExerciseSelector";

async function verifySelector() {
  const equipment = [
    "Barbell",
    "Dumbbell",
    "Cable Machine",
    "Flat Bench",
    "Pull-up Bar",
    "Squat Rack",
    "Incline Bench",
    "Adjustable Bench",
    "Leg Press",
    "Smith Machine",
    "Lat Pulldown Machine",
    "Dip Bar",
    "Kettlebell",
  ];

  const patterns = [
    "Horizontal Push",
    "Vertical Pull",
    "Vertical Push/Squat",
    "Vertical Push",
  ];

  for (const p of patterns) {
    const results = await ExerciseSelector.getByPattern(p, equipment, {
      level: "INTERMEDIATE",
      environment: "GYM",
    });
    console.log(`Pattern: [${p}] -> Found: ${results.length}`);
  }
}

verifySelector().catch(console.error);
