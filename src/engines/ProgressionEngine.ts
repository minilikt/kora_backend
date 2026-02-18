import { PrismaClient } from "@prisma/client";
import { ProgressionModelSchema } from "./validation";

const prisma = new PrismaClient() as any;

export class ProgressionEngine {
  static async getModel(idOrName: string) {
    const model = await prisma.progressionModel.findFirst({
      where: {
        OR: [{ id: idOrName }, { name: idOrName }],
      },
    });

    if (!model) {
      throw new Error(`No progression model found for: ${idOrName}.`);
    }

    const weeks = ProgressionModelSchema.parse(model.weeks);

    // Validate continuity
    const weekNumbers = weeks.map((w) => w.week).sort((a, b) => a - b);
    for (let i = 0; i < weekNumbers.length; i++) {
      if (weekNumbers[i] !== i + 1) {
        throw new Error(
          `Progression model weeks must be continuous and start from 1. Found gap at week ${i + 1}.`,
        );
      }
    }

    return {
      ...model,
      weeks,
    };
  }
}
