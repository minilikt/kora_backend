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
export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const {
      name,
      preferredName,
      age,
      gender,
      height,
      weight,
      goalWeight,
      workoutDays,
      trainingLevel,
      goal,
    } = req.body;

    // Map frontend fields to Prisma fields if necessary
    // workoutDays is already an array of strings like "MONDAY", "TUESDAY", etc.
    // which matches the DayOfWeek enum in Prisma.

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (preferredName !== undefined) updateData.preferredName = preferredName;
    if (age !== undefined) updateData.age = Math.round(Number(age));
    if (gender !== undefined) updateData.gender = gender;
    if (height !== undefined) updateData.height = Number(height);
    if (weight !== undefined) updateData.weight = Number(weight);
    if (goalWeight !== undefined) updateData.targetWeight = Number(goalWeight);
    if (workoutDays !== undefined) updateData.workoutDays = workoutDays;
    if (trainingLevel !== undefined) updateData.trainingLevel = trainingLevel;
    // Note: goal might need mapping if frontend/backend values differ

    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: updateData,
      include: { trainingProfile: true },
    });

    const { password, ...userWithoutPassword } = updatedUser;

    res.status(200).json({
      status: "success",
      success: true,
      data: { user: userWithoutPassword },
    });
  } catch (error) {
    next(error);
  }
};
