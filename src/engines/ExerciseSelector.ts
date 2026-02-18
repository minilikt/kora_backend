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
  ) {
    const exercises = await prisma.exercise.findMany({
      where: {
        movementPattern: {
          name: patternName,
        },
        type: options.type,
        level: options.level,
        environment: options.environment
          ? { in: [options.environment, "ANY"] }
          : undefined,
        difficultyRpeMin: options.minRpe ? { gte: options.minRpe } : undefined,
        difficultyRpeMax: options.maxRpe ? { lte: options.maxRpe } : undefined,
        equipment: {
          every: {
            equipment: {
              name: {
                in: equipmentNames,
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
