import { z } from "zod";

export const MuscleGroupSchema = z.enum([
  "CHEST",
  "BACK",
  "QUADS",
  "HAMSTRINGS",
  "GLUTES",
  "SHOULDERS",
  "BICEPS",
  "TRICEPS",
  "CORE",
  "CALVES",
]);

export const MovementBlockSchema = z.object({
  pattern: z.string(),
  sets: z.number().int().positive(),
  type: z.enum(["COMPOUND", "ISOLATION"]).default("COMPOUND"),
});

export const SplitDaySchema = z.object({
  day: z.number().int().positive(),
  focus: z.array(z.string()).optional(),
  blocks: z.array(MovementBlockSchema).optional(),
  rest: z.boolean().default(false),
});

export const SplitTemplateSchema = z.array(SplitDaySchema);

export const VolumeProfileSchema = z.record(
  z.string(),
  z.number().int().positive(),
);

export const ProgressionWeekSchema = z.object({
  week: z.number().int().positive(),
  intensity: z.number().min(0).max(1).optional(),
  rpe: z.number().min(0).max(10).optional(),
  deload: z.boolean().default(false),
});

export const ProgressionModelSchema = z.array(ProgressionWeekSchema);

export type MovementBlock = z.infer<typeof MovementBlockSchema>;
export type SplitDay = z.infer<typeof SplitDaySchema>;
export type SplitTemplate = z.infer<typeof SplitTemplateSchema>;
export type VolumeProfile = z.infer<typeof VolumeProfileSchema>;
export type ProgressionWeek = z.infer<typeof ProgressionWeekSchema>;
export type ProgressionModel = z.infer<typeof ProgressionModelSchema>;
