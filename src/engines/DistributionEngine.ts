import { SplitDay, VolumeProfile, MovementBlock } from "./validation";

export interface AllocatedSession {
  day: number;
  exercises: {
    muscle: string;
    sets: number;
    type: "COMPOUND" | "ISOLATION";
    pattern: string;
  }[];
}

export class DistributionEngine {
  static distribute(
    weeklySets: VolumeProfile,
    splitStructure: SplitDay[],
    volumeOverrides?: Record<string, number>,
  ): AllocatedSession[] {
    const finalWeeklySets = { ...weeklySets };

    // Apply overrides
    if (volumeOverrides) {
      Object.entries(volumeOverrides).forEach(([muscle, delta]) => {
        if (finalWeeklySets[muscle] !== undefined) {
          finalWeeklySets[muscle] = Math.max(0, finalWeeklySets[muscle] + delta);
        }
      });
    }

    const trainingDays = splitStructure.filter((d) => !d.rest);
    const sessions: AllocatedSession[] = splitStructure.map((day) => ({
      day: day.day,
      exercises: [],
    }));

    if (trainingDays.length === 0) return sessions;

    const SET_CAP_PER_SESSION = 8; // Max sets per muscle per session

    // Iterate through all muscles in volume profile
    for (const [muscle, totalSets] of Object.entries(finalWeeklySets)) {
      if (totalSets <= 0) continue;

      let remainingSets = totalSets;

      // Determine target days based on focus or all training days
      const focusDays = trainingDays.filter((d) => d.focus?.includes(muscle));
      let targetDays = focusDays.length > 0 ? focusDays : trainingDays;

      // Rule: Spread across days if exceeding cap
      const minDaysRequired = Math.ceil(totalSets / SET_CAP_PER_SESSION);
      if (minDaysRequired > targetDays.length) {
        targetDays = trainingDays; // Fallback to all training days to spread load
      }

      const setsPerDay = Math.floor(remainingSets / targetDays.length);
      const remainder = remainingSets % targetDays.length;

      targetDays.forEach((day, index) => {
        const session = sessions.find((s) => s.day === day.day);
        if (session) {
          let setsForDay = setsPerDay + (index < remainder ? 1 : 0);
          if (setsForDay <= 0) return;

          // Split setsForDay into exercises based on Compound/Isolation ratio (60/40)
          // For CHEST 12 sets total, example says 6 compound, 3 compound, 3 isolation
          // For a single session with 6 sets: maybe 4 compound (1 ex), 2 isolation (1 ex)

          if (setsForDay <= 4) {
            // Single exercise, usually compound if possible
            session.exercises.push({
              muscle,
              sets: setsForDay,
              type: setsForDay > 2 ? "COMPOUND" : "ISOLATION",
              pattern: this.mapMuscleToDefaultPattern(muscle),
            });
          } else {
            // Split into two or more exercises
            const compoundSets = Math.ceil(setsForDay * 0.6);
            const isolationSets = setsForDay - compoundSets;

            // Add Primary Compound
            session.exercises.push({
              muscle,
              sets: compoundSets,
              type: "COMPOUND",
              pattern: this.mapMuscleToDefaultPattern(muscle),
            });

            // Add Isolation or secondary
            if (isolationSets > 0) {
              session.exercises.push({
                muscle,
                sets: isolationSets,
                type: "ISOLATION",
                pattern: this.mapMuscleToDefaultPattern(muscle), // PlanCompiler will handle variation
              });
            }
          }
        }
      });
    }

    // Sort exercises within sessions: Compound first
    sessions.forEach((session) => {
      session.exercises.sort((a, b) => {
        if (a.type === "COMPOUND" && b.type === "ISOLATION") return -1;
        if (a.type === "ISOLATION" && b.type === "COMPOUND") return 1;
        return 0;
      });
    });

    return sessions;
  }

  private static mapMuscleToDefaultPattern(muscle: string): string {
    const map: Record<string, string> = {
      CHEST: "Horizontal Push",
      BACK: "Horizontal Pull", // Fallback to horizontal if vertical isn't found
      QUADS: "Squat",
      HAMSTRINGS: "Hinge",
      GLUTES: "Hinge",
      SHOULDERS: "Vertical Push",
      BICEPS: "Bicep Curl Arc",
      TRICEPS: "Overhead Arc", // Often triceps dominant in the arc or isolation
      CORE: "Spinal Flexion",
      CALVES: "Plantar Flexion",
    };
    return map[muscle] || "Horizontal Push"; // Safe fallback
  }
}
