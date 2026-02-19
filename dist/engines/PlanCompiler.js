"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanCompiler = void 0;
const client_1 = require("@prisma/client");
const SplitEngine_1 = require("./SplitEngine");
const VolumeEngine_1 = require("./VolumeEngine");
const ProgressionEngine_1 = require("./ProgressionEngine");
const DistributionEngine_1 = require("./DistributionEngine");
const ExerciseSelector_1 = require("./ExerciseSelector");
const prisma = new client_1.PrismaClient();
class PlanCompiler {
    static async generate(input) {
        console.log(`🔨 Compiling plan (v2) for user ${input.userId}...`);
        // 1. Fetch Lookups for Normalization
        const [muscles, patterns] = await Promise.all([
            prisma.muscle.findMany(),
            prisma.movementPattern.findMany(),
        ]);
        const muscleMap = new Map(muscles.map((m) => [m.name, m.id]));
        const patternMap = new Map(patterns.map((p) => [p.name, p.id]));
        // 2. Select rule modules
        const split = await SplitEngine_1.SplitEngine.select(input.days);
        const volume = await VolumeEngine_1.VolumeEngine.getProfile(input.goal, input.level);
        const progression = await ProgressionEngine_1.ProgressionEngine.getModel(input.progressionId);
        // 3. Distribute weekly volume across the split structure
        const distribution = DistributionEngine_1.DistributionEngine.distribute(volume.weeklySets, split.structure);
        // Muscle mapping helper (Generic -> Scientific)
        const muscleTranslator = {
            CHEST: "Pectoralis Major",
            BACK: "Latissimus Dorsi",
            QUADS: "Quadriceps (Rectus Femoris)",
            HAMSTRINGS: "Biceps Femoris (Long Head)",
            GLUTES: "Gluteus Maximus",
            SHOULDERS: "Deltoids (Anterior)",
            BICEPS: "Biceps Brachii (Long Head)",
            TRICEPS: "Triceps Brachii (Long Head)",
            CORE: "Rectus Abdominis",
            CALVES: "Gastrocnemius (Medial Head)",
        };
        // 4. Compile base plan and build Exercise Library
        const exerciseLibrary = {};
        const basePlan = [];
        for (const session of distribution) {
            const dayStructure = split.structure.find((d) => d.day === session.day);
            if (dayStructure?.rest) {
                basePlan.push({ day: session.day, rest: true, exercises: [] });
                continue;
            }
            const sessionExercises = [];
            for (const block of session.exercises) {
                const candidates = await ExerciseSelector_1.ExerciseSelector.getByPattern(block.pattern, input.equipment, {
                    type: block.type,
                    level: input.level,
                    environment: input.environment,
                });
                if (candidates.length === 0) {
                    console.warn(`⚠️ No exercises found for pattern ${block.pattern} for user ${input.userId}`);
                    continue;
                }
                const selected = candidates[0];
                // Add to library if not present
                if (!exerciseLibrary[selected.id]) {
                    exerciseLibrary[selected.id] = {
                        id: selected.id,
                        name: selected.name,
                        instructions: selected.instructions,
                        gifUrl: selected.gifUrl,
                        equipment: selected.equipment.map((e) => e.equipment.name),
                    };
                }
                sessionExercises.push({
                    muscleId: muscleMap.get(muscleTranslator[block.muscle] || block.muscle),
                    patternId: patternMap.get(block.pattern),
                    sets: block.sets,
                    exerciseId: selected.id,
                });
            }
            basePlan.push({
                day: session.day,
                focus: dayStructure?.focus || [],
                exercises: sessionExercises,
            });
        }
        // 5. Build Mesocycle (Multi-week) with Deviations only
        const weeks = progression.weeks.map((weekDef) => ({
            week: weekDef.week,
            intensity: weekDef.intensity,
            rpe: weekDef.rpe,
            deload: weekDef.deload,
            sessions: basePlan.map((session) => ({
                day: session.day,
                rest: session.rest,
                focus: session.focus,
                exercises: (session.exercises || []).map((ex) => ({
                    ...ex,
                    // These deviate per week based on progression
                    intensity: weekDef.intensity,
                    rpe: weekDef.rpe,
                })),
            })),
        }));
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + weeks.length * 7);
        const fullPlanJson = {
            version: 2,
            input,
            exerciseLibrary,
            basePlan, // Canonical template
            weeks, // Detailed weekly sessions
        };
        console.log(`✅ Plan compilation (v2) complete for user ${input.userId}`);
        return {
            planJson: fullPlanJson,
            startDate,
            endDate,
        };
    }
}
exports.PlanCompiler = PlanCompiler;
//# sourceMappingURL=PlanCompiler.js.map