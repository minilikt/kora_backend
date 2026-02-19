"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressionModelSchema = exports.ProgressionWeekSchema = exports.VolumeProfileSchema = exports.SplitTemplateSchema = exports.SplitDaySchema = exports.MovementBlockSchema = exports.MuscleGroupSchema = void 0;
const zod_1 = require("zod");
exports.MuscleGroupSchema = zod_1.z.enum([
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
exports.MovementBlockSchema = zod_1.z.object({
    pattern: zod_1.z.string(),
    sets: zod_1.z.number().int().positive(),
    type: zod_1.z.enum(["COMPOUND", "ISOLATION"]).default("COMPOUND"),
});
exports.SplitDaySchema = zod_1.z.object({
    day: zod_1.z.number().int().positive(),
    focus: zod_1.z.array(zod_1.z.string()).optional(),
    blocks: zod_1.z.array(exports.MovementBlockSchema).optional(),
    rest: zod_1.z.boolean().default(false),
});
exports.SplitTemplateSchema = zod_1.z.array(exports.SplitDaySchema);
exports.VolumeProfileSchema = zod_1.z.record(zod_1.z.string(), zod_1.z.number().int().positive());
exports.ProgressionWeekSchema = zod_1.z.object({
    week: zod_1.z.number().int().positive(),
    intensity: zod_1.z.number().min(0).max(1).optional(),
    rpe: zod_1.z.number().min(0).max(10).optional(),
    deload: zod_1.z.boolean().default(false),
});
exports.ProgressionModelSchema = zod_1.z.array(exports.ProgressionWeekSchema);
//# sourceMappingURL=validation.js.map