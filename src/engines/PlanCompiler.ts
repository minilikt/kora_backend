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
  volumeOverrides?: Record<string, number>;
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
    let preferredSplitType: string | undefined;
    if (input.days <= 3) preferredSplitType = "FULL_BODY";
    else if (input.days === 4) preferredSplitType = "UPPER_LOWER";
    else if (input.days >= 5) preferredSplitType = "PUSH_PULL_LEGS";

    const split = await SplitEngine.select(input.days, { type: preferredSplitType });

    // Fetch user context for personalization
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      include: {
        trainingProfile: true,
        plans: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { blockEvaluation: true }
        }
      },
    });

    const lastEvaluation = user?.plans[0]?.blockEvaluation;

    const volume = await VolumeEngine.getProfile(input.goal, input.level, {
      gender: user?.gender,
      profile: user?.trainingProfile,
      evaluation: lastEvaluation,
    });
    const progression = await ProgressionEngine.getModel(input.progressionId);

    // 3. Distribute weekly volume across the split structure
    const distribution = DistributionEngine.distribute(
      volume.weeklySets,
      split.structure,
      input.volumeOverrides,
    );

    // Muscle mapping helper (Generic -> Scientific)
    const muscleTranslator: Record<string, string> = {
      CHEST: "Pectoralis Major",
      BACK: "Latissimus Dorsi",
      QUADS: "Quadriceps",
      HAMSTRINGS: "Hamstrings",
      GLUTES: "Gluteus Maximus",
      SHOULDERS: "Deltoids",
      BICEPS: "Biceps Brachii",
      TRICEPS: "Triceps Brachii",
      CORE: "Abdominals",
      CALVES: "Gastrocnemius",
    };

    // 4. Compile base plan and build Exercise Library
    const exerciseLibrary: Record<string, any> = {};
    const basePlan: any[] = [];
    const repRange = (volume as any).repRange || { compound: [8, 12], isolation: [12, 15] };
    const intensityRange = (volume as any).intensityRange || [60, 75];

    for (const session of distribution) {
      const dayStructure = (split.structure as SplitDay[]).find(
        (d: SplitDay) => d.day === session.day,
      );

      if (dayStructure?.rest) {
        basePlan.push({ day: session.day, rest: true, exercises: [] });
        continue;
      }

      const sessionExercises = [];
      const usedExerciseIdsInSession = new Set<string>();

      for (const block of session.exercises) {
        let candidates = await ExerciseSelector.getByPattern(
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

        // Avoid duplicates in the same session
        let selected = candidates.find((ex: any) => !usedExerciseIdsInSession.has(ex.id)) || candidates[0];
        usedExerciseIdsInSession.add(selected.id);

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

        const exerciseReps = block.type === "COMPOUND" ? repRange.compound : repRange.isolation;

        const progression = await ProgressionEngine.applyProgression(
          input.userId,
          selected.id,
          exerciseReps as [number, number],
          (intensityRange[0] + intensityRange[1]) / 2,
        );

        sessionExercises.push({
          muscleId: muscleMap.get(
            muscleTranslator[block.muscle] || block.muscle,
          ),
          patternId: patternMap.get(block.pattern),
          sets: block.sets,
          exerciseId: selected.id,
          reps: progression.reps, // Dynamic reps from progression engine
          weight: progression.weight, // Load suggestion
          intensity: (intensityRange[0] + intensityRange[1]) / 2, // Midpoint intensity
          note: progression.note,
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
        intensity: weekDef.intensity || 0, // Fallback if missing
        rpe: weekDef.rpe || 7, // Fallback
        deload: weekDef.deload,
        sessions: basePlan.map((session) => ({
          day: session.day,
          rest: session.rest,
          focus: session.focus,
          exercises: (session.exercises || []).map((ex: any) => {
            // Calculate progression-adjusted intensity
            const baseIntensity = ex.intensity;
            // If weekDef.intensity is a multiplier (0-1), apply it. 
            // If it's a relative offset, add it.
            // For now, assume it's a relative factor if < 1.0
            const adjustedIntensity = weekDef.deload
              ? baseIntensity * 0.7
              : (weekDef.intensity ? baseIntensity + (weekDef.intensity * 10) : baseIntensity);

            return {
              ...ex,
              intensity: parseFloat(adjustedIntensity.toFixed(1)),
              rpe: weekDef.rpe || ex.rpe || 7,
            };
          }),
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
