import { Request, Response, NextFunction } from "express";
import { SessionService } from "../services/SessionService";
import { z } from "zod";
import { AppError } from "../middlewares/error.middleware";

const completeSessionSchema = z.object({
  planId: z.string(),
  week: z.number().int(),
  day: z.number().int(),
  startedAt: z.string(),
  completedAt: z.string(),
  notes: z.string().optional(),
  exercises: z.array(
    z.object({
      exerciseId: z.string(),
      timeSpentSec: z.number().int().optional(),
      equipmentUsed: z.array(z.string()).optional(),
      notes: z.string().optional(),
      sets: z.array(
        z.object({
          setIndex: z.number().int(),
          weight: z.number().nonnegative(),
          reps: z.number().int().positive(),
          rpe: z.number().min(0).max(10),
        }),
      ),
    }),
  ),
});

export const startSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { sessionId } = req.params;
    const session = await SessionService.startSession(sessionId as string);
    res.status(200).json({ status: "success", data: session });
  } catch (error) {
    next(error);
  }
};

export const completeSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const validatedData = completeSessionSchema.parse(req.body);
    const result = await SessionService.completeSession(
      req.user.userId,
      validatedData as any,
    );

    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(
        new AppError(
          "Validation failed: " + error.issues.map((e) => e.message).join(", "),
          400,
        ),
      );
    } else {
      next(error);
    }
  }
};

export const getCurrentSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const session = await SessionService.getCurrentSession(req.user.userId);
    res.status(200).json({ status: "success", data: { session } });
  } catch (error) {
    next(error);
  }
};
