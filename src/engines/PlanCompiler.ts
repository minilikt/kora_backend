import {
  TrainingGoal,
  ExperienceLevel,
  ExerciseEnvironment,
} from "@prisma/client";
import prisma from "../lib/prisma";
import { SplitEngine } from "./SplitEngine";
import { VolumeEngine } from "./VolumeEngine";
import { ProgressionEngine } from "./ProgressionEngine";
import { DistributionEngine } from "./DistributionEngine";
import { ExerciseSelector } from "./ExerciseSelector";
import { SplitDay, ProgressionWeek } from "./validation";

// Split categories that don't have dedicated split tags in the exercises DB.
// For these, we skip the split filter so exercises are selected by pattern/muscle only.
const SKIP_SPLIT_CATEGORIES = new Set(["FULL_BODY", "UPPER", "LOWER"]);

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

    // Normalize keys: Remove special chars, spaces, and uppercase
    const normalize = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "_").replace(/_+/g, "_");

    const muscleMap = new Map(muscles.map((m: any) => [normalize(m.name), m.id]));
    const patternMap = new Map(patterns.map((p: any) => [normalize(p.name), p.id]));

    // Fuzzy matcher for muscles that might have (Clavicular Head) etc.
    const findMuscleFuzzy = (target: string) => {
      const normalizedTarget = normalize(target);
      const exact = muscleMap.get(normalizedTarget);
      if (exact) return exact;

      // Try startsWith fuzzy match (e.g. "PECTORALIS_MAJOR" matches "PECTORALIS_MAJOR_CLAVICULAR_HEAD")
      for (const [name, id] of muscleMap.entries() as IterableIterator<[string, string]>) {
        if (name.startsWith(normalizedTarget)) return id;
      }
      return undefined;
    };

    // 2. Select rule modules
    let preferredSplitType: string | undefined;
    if (input.days <= 1) preferredSplitType = "FULL_BODY";
    else if (input.days <= 3) preferredSplitType = "FULL_BODY";
    else if (input.days === 4) preferredSplitType = "UPPER_LOWER";
    else if (input.days >= 5) preferredSplitType = "HYBRID"; // Hypertrophy/Strength usually Hybrid for 5+ days

    // Resilient split selection
    let split;
    try {
      split = await SplitEngine.select(input.days, { type: preferredSplitType });
    } catch (e) {
      console.warn(`[PlanCompiler] Failed to pick preferred split ${preferredSplitType}, trying generic search`);
      split = await SplitEngine.select(input.days);
    }

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
            muscleName: block.muscle,
            type: block.type as any,
            level: input.level as any,
            environment: input.environment as any,
            // Don't filter by split tag for categories not indexed in DB (FULL_BODY, UPPER, LOWER)
            splitCategory: dayStructure?.category && !SKIP_SPLIT_CATEGORIES.has(dayStructure.category.toUpperCase())
              ? dayStructure.category
              : undefined,
          },
        );

        if (candidates.length === 0) {
          console.warn(
            `⚠️ [PlanCompiler] No exercises found for pattern "${block.pattern}" (Type: ${block.type}, Level: ${input.level}, Env: ${input.environment})`,
          );
          continue;
        }

        // Avoid duplicates in the same session
        let selected = candidates.find((ex: any) => !usedExerciseIdsInSession.has(ex.id)) || candidates[0];
        console.log(`✅ [PlanCompiler] Selected "${selected.name}" for pattern "${block.pattern}"`);
        usedExerciseIdsInSession.add(selected.id);

        // Add to library if not present
        if (!exerciseLibrary[selected.id]) {
          console.log(`📚 [PlanCompiler] Adding "${selected.name}" to exercise library`);
          exerciseLibrary[selected.id] = {
            id: selected.id,
            name: selected.name,
            instructions: selected.instructions,
            gifUrl: selected.gifUrl,
            equipment: selected.equipment.map((e: any) => e.equipment.name),
          };
        }

        const exerciseReps = block.type === "COMPOUND" ? repRange.compound : repRange.isolation;

        const progressionResult = await ProgressionEngine.applyProgression(
          input.userId,
          selected.id,
          exerciseReps as [number, number],
          (intensityRange[0] + intensityRange[1]) / 2,
        );

        const targetMuscle = muscleTranslator[block.muscle.toUpperCase()] || block.muscle;
        const muscleId = findMuscleFuzzy(targetMuscle);
        const patternId = patternMap.get(normalize(block.pattern));

        if (!muscleId || !patternId) {
          console.error(`❌ [PlanCompiler] Mapping failure! Muscle: ${targetMuscle} -> ${muscleId}, Pattern: ${block.pattern} -> ${patternId}`);
          continue; // Avoid pushing invalid records to DB
        }

        sessionExercises.push({
          muscleId,
          patternId,
          sets: block.sets,
          exerciseId: selected.id,
          reps: progressionResult.reps, // Dynamic reps from progression engine
          weight: progressionResult.weight, // Load suggestion
          intensity: (intensityRange[0] + intensityRange[1]) / 2, // Midpoint intensity
          note: progressionResult.note,
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

    console.log(`✅ [PlanCompiler] Plan compilation complete for user ${input.userId}`);
    return {
      planJson: fullPlanJson,
      startDate,
      endDate,
    };
  }
}
