import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { AppError } from "../middlewares/error.middleware";

const prisma = new PrismaClient();

export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { trainingProfile: true },
    });

    if (!user) throw new AppError("User not found", 404);

    const { password, ...userWithoutPassword } = user;

    // Return both shapes so both syncService (success) and other callers (status) work
    res.status(200).json({
      status: "success",
      success: true,
      data: { user: userWithoutPassword },
    });
  } catch (error) {
    next(error);
  }
};
