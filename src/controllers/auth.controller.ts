import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { UserService } from "../services/UserService";
import * as authService from "../services/auth.service";
import {
  TrainingGoal,
  Gender,
  ExperienceLevel,
  ExerciseEnvironment,
} from "@prisma/client";
import { AppError } from "../middlewares/error.middleware";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  preferredName: z.string().optional(),
  gender: z.nativeEnum(Gender).optional(),
  age: z.number().int().positive().optional(),
  weight: z.number().positive().optional(),
  targetWeight: z.number().positive().optional(),
  height: z.number().positive().optional(),
  bmi: z.number().positive().optional(),
  sleepHours: z.number().positive().optional(),
  waterDaily: z.number().positive().optional(),
  trainingLevel: z.nativeEnum(ExperienceLevel).optional(),
  trainingEnvironment: z.nativeEnum(ExerciseEnvironment).optional(),
  trainingDaysPerWeek: z.number().int().min(1).max(7).optional(),
  goal: z.nativeEnum(TrainingGoal).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const result = await UserService.registerAndGeneratePlan(validatedData);

    res.status(201).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(
        new AppError(
          "Validation failed: " +
            error.issues.map((e: any) => e.message).join(", "),
          400,
        ),
      );
    } else {
      next(error);
    }
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const result = await authService.login(validatedData);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(
        new AppError(
          "Validation failed: " +
            error.issues.map((e: any) => e.message).join(", "),
          400,
        ),
      );
    } else {
      next(error);
    }
  }
};
