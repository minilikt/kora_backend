"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistributionEngine = void 0;
class DistributionEngine {
    static distribute(weeklySets, splitStructure) {
        const trainingDays = splitStructure.filter((d) => !d.rest);
        const sessions = splitStructure.map((day) => ({
            day: day.day,
            exercises: [],
        }));
        if (trainingDays.length === 0)
            return sessions;
        // Iterate through all muscles in volume profile
        for (const [muscle, totalSets] of Object.entries(weeklySets)) {
            if (totalSets <= 0)
                continue;
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
                    if (index < remainder)
                        sets += 1;
                    if (sets > 0) {
                        // Logic: High volume (>2 sets) for a muscle on a single day
                        // usually implies at least one compound.
                        // For now, simpler: first exercise for a muscle group is COMPOUND,
                        // any extra sets could be ISOLATION if sets > 4
                        const isCompound = sets > 2 ||
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
                if (a.type === "COMPOUND" && b.type === "ISOLATION")
                    return -1;
                if (a.type === "ISOLATION" && b.type === "COMPOUND")
                    return 1;
                return 0;
            });
        });
        return sessions;
    }
    static mapMuscleToDefaultPattern(muscle) {
        const map = {
            CHEST: "Horizontal Push",
            BACK: "Vertical Pull",
            QUADS: "Vertical Push/Squat",
            HAMSTRINGS: "Vertical Push/Squat", // Deadlift patterns often fall here or in specific hip ones
            GLUTES: "Vertical Push/Squat",
            SHOULDERS: "Vertical Push",
            BICEPS: "Elbow Flexion",
            TRICEPS: "Elbow Extension",
            CORE: "Core",
            CALVES: "Ankle Extension",
        };
        return map[muscle] || "Horizontal Push"; // Safe fallback
    }
}
exports.DistributionEngine = DistributionEngine;
//# sourceMappingURL=DistributionEngine.js.map