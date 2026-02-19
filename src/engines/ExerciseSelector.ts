import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient() as any;

export class ExerciseSelector {
  static async getByPattern(
    patternName: string,
    equipmentNames: string[],
    options: {
      type?: "COMPOUND" | "ISOLATION";
      level?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
      environment?: "GYM" | "HOME" | "OUTDOOR" | "ANY";
      minRpe?: number;
      maxRpe?: number;
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

    const exercises = await prisma.exercise.findMany({
      where: {
        movementPattern: {
          name: patternName,
        },
        type: options.type,
        level: options.level
          ? { in: [options.level, "BEGINNER", "INTERMEDIATE"] }
          : undefined,
        environment: options.environment
          ? { in: [options.environment, "ANY"] }
          : undefined,
        difficultyRpeMin: options.minRpe ? { gte: options.minRpe } : undefined,
        difficultyRpeMax: options.maxRpe ? { lte: options.maxRpe } : undefined,
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
