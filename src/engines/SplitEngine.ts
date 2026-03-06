import prisma from "../lib/prisma";
import { SplitTemplateSchema } from "./validation";
import { AppError } from "../middlewares/error.middleware";

export class SplitEngine {
  static async select(daysPerWeek: number, options: { name?: string; type?: string } = {}) {
    let template = await prisma.splitTemplate.findFirst({
      where: {
        daysPerWeek,
        ...(options.name && { name: options.name }),
        ...(options.type && { type: options.type as any }),
      },
      orderBy: { version: "desc" },
    });

    // Fallback: If no template found with specific type, try any template for that daysPerWeek
    if (!template && options.type) {
      console.warn(`[SplitEngine] No ${options.type} split found for ${daysPerWeek} days, falling back to any split.`);
      template = await prisma.splitTemplate.findFirst({
        where: { daysPerWeek },
        orderBy: { version: "desc" },
      });
    }

    if (!template) {
      throw new AppError(
        `No split template found for ${daysPerWeek} days per week.`,
        404
      );
    }

    // Validation and Normalization
    const rawStructure = SplitTemplateSchema.parse(template.structure);
    const structure = rawStructure.map((day: any) => {
      // Create focus array from primary/secondary muscles if not explicitly provided
      const focus = day.focus || [
        ...(day.primaryMuscles || []),
        ...(day.secondaryMuscles || [])
      ];

      return {
        ...day,
        focus,
        blocks: day.blocks?.map((block: any) => ({
          ...block,
          pattern: block.pattern.toUpperCase().replace(/\s+/g, "_")
        }))
      };
    });

    return {
      ...template,
      structure,
    };
  }
}
