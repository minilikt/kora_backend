import { PrismaClient } from "@prisma/client";
import { SplitTemplateSchema } from "./validation";

const prisma = new PrismaClient() as any;

export class SplitEngine {
  static async select(daysPerWeek: number, name?: string) {
    const template = await prisma.splitTemplate.findFirst({
      where: {
        daysPerWeek,
        name: name,
      },
    });

    if (!template) {
      throw new Error(
        `No split template found for ${daysPerWeek} days per week.`,
      );
    }

    // Validation
    const structure = SplitTemplateSchema.parse(template.structure);

    if (structure.length !== 7 && structure.length !== daysPerWeek) {
      // Allowing for 7-day sequences or exact day matches
    }

    return {
      ...template,
      structure,
    };
  }
}
