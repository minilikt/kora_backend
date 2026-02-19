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
  ): AllocatedSession[] {
    const trainingDays = splitStructure.filter((d) => !d.rest);
    const sessions: AllocatedSession[] = splitStructure.map((day) => ({
      day: day.day,
      exercises: [],
    }));

    if (trainingDays.length === 0) return sessions;

    // Iterate through all muscles in volume profile
    for (const [muscle, totalSets] of Object.entries(weeklySets)) {
      if (totalSets <= 0) continue;

      // Rule: Spread sets across ALL training days to avoid empty days/lopsidedness
      // But respect 'focus' for biased distribution if possible
      const focusDays = trainingDays.filter((d) => d.focus?.includes(muscle));
      const targetDays = focusDays.length > 0 ? focusDays : trainingDays;

      const setsPerDay = Math.floor(totalSets / targetDays.length);
      const remainder = totalSets % targetDays.length;

      targetDays.forEach((day, index) => {
        const session = sessions.find((s) => s.day === day.day);
        if (session) {
          let sets = setsPerDay;
          if (index < remainder) sets += 1;

          if (sets > 0) {
            // Logic: High volume (>2 sets) for a muscle on a single day
            // usually implies at least one compound.
            // For now, simpler: first exercise for a muscle group is COMPOUND,
            // any extra sets could be ISOLATION if sets > 4
            const isCompound =
              sets > 2 ||
              muscle === "CHEST" ||
              muscle === "BACK" ||
              muscle === "QUADS";

            session.exercises.push({
              muscle,
              sets,
              type: isCompound ? "COMPOUND" : "ISOLATION",
              pattern: this.mapMuscleToDefaultPattern(muscle),
            });
          }
        }
      });
    }

    // Post-processing: Ensure No Empty training days
    // If a training day has no exercises, we might need to move some from high-volume days
    // But usually the above spreading prevents this.

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
