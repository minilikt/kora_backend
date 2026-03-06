import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient() as any;

// Maps generic muscle names from DistributionEngine to scientific names in the DB
const MUSCLE_NAME_MAP: Record<string, string> = {
  CHEST: "Pectoralis Major",
  BACK: "Latissimus Dorsi",
  QUADS: "Quadriceps",
  HAMSTRINGS: "Hamstrings",
  GLUTES: "Gluteus Maximus",
  SHOULDERS: "Deltoids",
  BICEPS: "Biceps Brachii",
  TRICEPS: "Triceps Brachii",
  CORE: "Abdominals",
  CALVES: "Gastrocnemius",
};

// Split categories that don't have dedicated DB split tags — skip split filtering for these
const SKIP_SPLIT_CATEGORIES = ["FULL_BODY", "UPPER", "LOWER"];

export class ExerciseSelector {
  static async getByPattern(
    patternName: string,
    equipmentNames: string[],
    options: {
      muscleName?: string;
      type?: "COMPOUND" | "ISOLATION";
      level?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
      environment?: "GYM" | "HOME" | "OUTDOOR" | "ANY";
      minRpe?: number;
      maxRpe?: number;
      splitCategory?: string;
    } = {},
  ): Promise<any[]> {
    // Normalize equipment names to match DB (pluralization issues)
    const normalizedEquipment = equipmentNames.map((e) => {
      const lower = e.toLowerCase();
      if (lower === "dumbbell") return "Dumbbells";
      if (lower === "barbell") return "Barbell"; // Usually singular in DB
      if (lower === "kettlebell") return "Kettlebells";
      return e;
    });

    console.log(`[ExerciseSelector] Searching for pattern: "${patternName}"`);
    console.log(
      `[ExerciseSelector] Equipment allowed: ${JSON.stringify([...normalizedEquipment, ...equipmentNames])}`,
    );
    console.log(`[ExerciseSelector] Options: ${JSON.stringify(options)}`);

    const allPatterns = await prisma.movementPattern.findMany();
    const normalize = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "_").replace(/_+/g, "_");

    const targetPattern = allPatterns.find((p: any) => normalize(p.name) === normalize(patternName));

    if (!targetPattern) {
      console.warn(`[ExerciseSelector] Pattern not found in DB: ${patternName}`);
      return [];
    }

    const exercises = await prisma.exercise.findMany({
      where: {
        movementPatternId: targetPattern.id,
        type: options.type,
        level: options.level
          ? { in: [options.level, "BEGINNER", "INTERMEDIATE"] }
          : undefined,
        environment: options.environment
          ? { in: [options.environment, "ANY"] }
          : undefined,
        difficultyRpeMin: options.minRpe ? { gte: options.minRpe } : undefined,
        difficultyRpeMax: options.maxRpe ? { lte: options.maxRpe } : undefined,
        split: options.splitCategory ? {
          name: {
            contains: options.splitCategory.replace(/_/g, " "),
            mode: 'insensitive'
          }
        } : undefined,
        equipment: {
          every: {
            equipment: {
              name: {
                in: [...normalizedEquipment, ...equipmentNames], // Try both
              },
            },
          },
        },
      },
      include: {
        muscles: { include: { muscle: true } },
        equipment: { include: { equipment: true } },
        split: true,
      },
    });

    console.log(
      `[ExerciseSelector] Query returned ${exercises.length} total possible exercises`,
    );
    if (exercises.length > 0) {
      console.log(
        `[ExerciseSelector] First 3 results: ${exercises
          .slice(0, 3)
          .map((ex: any) => ex.name)
          .join(", ")}`,
      );
    }

    if (exercises.length === 0 && options.type === "COMPOUND") {
      console.log(
        `[ExerciseSelector] Retrying ${patternName} without type restriction...`,
      );
      return this.getByPattern(patternName, equipmentNames, {
        ...options,
        type: undefined,
      });
    }

    if (exercises.length === 0 && options.muscleName) {
      // Translate generic muscle name (e.g. "BACK") to scientific name (e.g. "Latissimus Dorsi")
      const dbMuscleName = MUSCLE_NAME_MAP[options.muscleName.toUpperCase()] || options.muscleName;
      // Skip split filter for categories not directly indexed in DB (e.g. FULL_BODY)
      const useSplitFilter =
        options.splitCategory && !SKIP_SPLIT_CATEGORIES.includes(options.splitCategory.toUpperCase());

      console.log(
        `[ExerciseSelector] Pattern "${patternName}" failed, falling back to muscle search for "${dbMuscleName}" in split "${useSplitFilter ? options.splitCategory : 'ANY'}"`
      );

      const muscleExercises = await prisma.exercise.findMany({
        where: {
          muscles: {
            some: {
              muscle: {
                name: {
                  contains: dbMuscleName,
                  mode: 'insensitive'
                }
              }
            }
          },
          split: useSplitFilter ? {
            name: {
              contains: options.splitCategory!.replace(/_/g, " "),
              mode: 'insensitive'
            }
          } : undefined,
          level: options.level
            ? { in: [options.level, "BEGINNER", "INTERMEDIATE"] }
            : undefined,
          environment: options.environment
            ? { in: [options.environment, "ANY"] }
            : undefined,
          equipment: {
            every: {
              equipment: {
                name: {
                  in: [...normalizedEquipment, ...equipmentNames],
                },
              },
            },
          },
        },
        include: {
          muscles: { include: { muscle: true } },
          equipment: { include: { equipment: true } },
          split: true,
        },
      });

      console.log(`[ExerciseSelector] Muscle fallback returned ${muscleExercises.length} results`);
      return muscleExercises;
    }

    // Sort: Compound first
    return exercises.sort((a: any, b: any) => {
      if (a.type === "COMPOUND" && b.type === "ISOLATION") return -1;
      if (a.type === "ISOLATION" && b.type === "COMPOUND") return 1;
      return 0;
    });
  }

  static async getByMuscle(
    muscleName: string,
    role: any,
    equipmentNames: string[],
    options: {
      level?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
      environment?: "GYM" | "HOME" | "OUTDOOR" | "ANY";
    } = {},
  ) {
    const exercises = await prisma.exercise.findMany({
      where: {
        muscles: {
          some: {
            muscle: { name: muscleName },
            role: role,
          },
        },
        level: options.level,
        environment: options.environment
          ? { in: [options.environment, "ANY"] }
          : undefined,
        equipment: {
          some: {
            equipment: {
              name: { in: equipmentNames },
            },
          },
        },
      },
      include: {
        muscles: { include: { muscle: true } },
        equipment: { include: { equipment: true } },
      },
    });

    return exercises.sort((a: any, b: any) => {
      if (a.type === "COMPOUND" && b.type === "ISOLATION") return -1;
      if (a.type === "ISOLATION" && b.type === "COMPOUND") return 1;
      return 0;
    });
  }
}
