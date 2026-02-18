import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const searchExercises = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { q, muscle, equipment } = req.query;

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
        muscles: {
          include: {
            muscle: true,
          },
        },
        equipment: {
          include: {
            equipment: true,
          },
        },
        category: true,
        movementPattern: true,
      },
      take: 20,
    });

    res.status(200).json({
      success: true,
      count: exercises.length,
      data: exercises,
    });
  } catch (error) {
    next(error);
  }
};
