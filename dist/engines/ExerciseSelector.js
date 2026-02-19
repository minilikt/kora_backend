"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExerciseSelector = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class ExerciseSelector {
    static async getByPattern(patternName, equipmentNames, options = {}) {
        const exercises = await prisma.exercise.findMany({
            where: {
                movementPattern: {
                    name: patternName,
                },
                type: options.type,
                level: options.level,
                environment: options.environment
                    ? { in: [options.environment, "ANY"] }
                    : undefined,
                difficultyRpeMin: options.minRpe ? { gte: options.minRpe } : undefined,
                difficultyRpeMax: options.maxRpe ? { lte: options.maxRpe } : undefined,
                equipment: {
                    every: {
                        equipment: {
                            name: {
                                in: equipmentNames,
                            },
                        },
                    },
                },
            },
            include: {
                muscles: { include: { muscle: true } },
                equipment: { include: { equipment: true } },
            },
        });
        // Sort: Compound first
        return exercises.sort((a, b) => {
            if (a.type === "COMPOUND" && b.type === "ISOLATION")
                return -1;
            if (a.type === "ISOLATION" && b.type === "COMPOUND")
                return 1;
            return 0;
        });
    }
    static async getByMuscle(muscleName, role, equipmentNames, options = {}) {
        const exercises = await prisma.exercise.findMany({
            where: {
                muscles: {
                    some: {
                        muscle: { name: muscleName },
                        role: role,
                    },
                },
                level: options.level,
                environment: options.environment
                    ? { in: [options.environment, "ANY"] }
                    : undefined,
                equipment: {
                    some: {
                        equipment: {
                            name: { in: equipmentNames },
                        },
                    },
                },
            },
            include: {
                muscles: { include: { muscle: true } },
                equipment: { include: { equipment: true } },
            },
        });
        return exercises.sort((a, b) => {
            if (a.type === "COMPOUND" && b.type === "ISOLATION")
                return -1;
            if (a.type === "ISOLATION" && b.type === "COMPOUND")
                return 1;
            return 0;
        });
    }
}
exports.ExerciseSelector = ExerciseSelector;
//# sourceMappingURL=ExerciseSelector.js.map