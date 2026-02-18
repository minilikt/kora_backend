import {
  PrismaClient,
  TrainingGoal,
  ExperienceLevel,
  ExerciseEnvironment,
} from "@prisma/client";
import { SplitEngine } from "./SplitEngine";
import { VolumeEngine } from "./VolumeEngine";
import { ProgressionEngine } from "./ProgressionEngine";
import { DistributionEngine } from "./DistributionEngine";
import { ExerciseSelector } from "./ExerciseSelector";
import { SplitDay, ProgressionWeek } from "./validation";

const prisma = new PrismaClient();

export interface PlanInput {
  userId: string;
  days: number;
  goal: TrainingGoal;
  level: ExperienceLevel;
  progressionId: string;
  environment: ExerciseEnvironment;
  equipment: string[];
}

export class PlanCompiler {
  static async generate(input: PlanInput) {
    console.log(`🔨 Compiling plan (v2) for user ${input.userId}...`);

    // 1. Fetch Lookups for Normalization
    const [muscles, patterns] = await Promise.all([
      prisma.muscle.findMany(),
      prisma.movementPattern.findMany(),
    ]);

    const muscleMap = new Map(muscles.map((m: any) => [m.name, m.id]));
    const patternMap = new Map(patterns.map((p: any) => [p.name, p.id]));

    // 2. Select rule modules
    const split = await SplitEngine.select(input.days);
    const volume = await VolumeEngine.getProfile(input.goal, input.level);
    const progression = await ProgressionEngine.getModel(input.progressionId);

    // 3. Distribute weekly volume across the split structure
    const distribution = DistributionEngine.distribute(
      volume.weeklySets,
      split.structure,
    );

    // Muscle mapping helper (Generic -> Scientific)
    const muscleTranslator: Record<string, string> = {
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
    const exerciseLibrary: Record<string, any> = {};
    const basePlan: any[] = [];

    for (const session of distribution) {
      const dayStructure = (split.structure as SplitDay[]).find(
        (d: SplitDay) => d.day === session.day,
      );

      if (dayStructure?.rest) {
        basePlan.push({ day: session.day, rest: true, exercises: [] });
        continue;
      }

      const sessionExercises = [];
      for (const block of session.exercises) {
        const candidates = await ExerciseSelector.getByPattern(
          block.pattern,
          input.equipment,
          {
            type: block.type as any,
            level: input.level as any,
            environment: input.environment as any,
          },
        );

        if (candidates.length === 0) {
          console.warn(
            `⚠️ No exercises found for pattern ${block.pattern} for user ${input.userId}`,
          );
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
            equipment: selected.equipment.map((e: any) => e.equipment.name),
          };
        }

        sessionExercises.push({
          muscleId: muscleMap.get(
            muscleTranslator[block.muscle] || block.muscle,
          ),
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
    const weeks = (progression.weeks as ProgressionWeek[]).map(
      (weekDef: ProgressionWeek) => ({
        week: weekDef.week,
        intensity: weekDef.intensity,
        rpe: weekDef.rpe,
        deload: weekDef.deload,
        sessions: basePlan.map((session) => ({
          day: session.day,
          rest: session.rest,
          focus: session.focus,
          exercises: (session.exercises || []).map((ex: any) => ({
            ...ex,
            // These deviate per week based on progression
            intensity: weekDef.intensity,
            rpe: weekDef.rpe,
          })),
        })),
      }),
    );

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
