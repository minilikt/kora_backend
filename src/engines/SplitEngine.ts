import prisma from "../lib/prisma";
import { SplitTemplateSchema } from "./validation";

export class SplitEngine {
  static async select(daysPerWeek: number, options: { name?: string; type?: string } = {}) {
    const template = await prisma.splitTemplate.findFirst({
      where: {
        daysPerWeek,
        ...(options.name && { name: options.name }),
        ...(options.type && { type: options.type as any }),
      },
      orderBy: { version: "desc" }, // Get latest version
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
