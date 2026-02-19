"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchExercises = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const searchExercises = async (req, res, next) => {
    try {
        const { q, muscle, equipment, limit = "50" } = req.query;
        const exercises = await prisma.exercise.findMany({
            where: {
                AND: [
                    q ? { name: { contains: String(q), mode: "insensitive" } } : {},
                    muscle
                        ? {
                            muscles: {
                                some: {
                                    muscle: {
                                        name: { contains: String(muscle), mode: "insensitive" },
                                    },
                                },
                            },
                        }
                        : {},
                    equipment
                        ? {
                            equipment: {
                                some: {
                                    equipment: {
                                        name: {
                                            contains: String(equipment),
                                            mode: "insensitive",
                                        },
                                    },
                                },
                            },
                        }
                        : {},
                ],
            },
            include: {
                muscles: { include: { muscle: true } },
                equipment: { include: { equipment: true } },
                category: true,
                movementPattern: true,
            },
            take: Math.min(parseInt(String(limit)), 500),
        });
        res.status(200).json({
            success: true,
            count: exercises.length,
            data: { exercises },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.searchExercises = searchExercises;
//# sourceMappingURL=exercise.controller.js.map