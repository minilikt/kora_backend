import { Request, Response, NextFunction } from "express";
import { PlanService } from "../services/PlanService";
import { BlockEvaluationService } from "../services/BlockEvaluationService";
import { PlanEvolutionEngine } from "../engines/PlanEvolutionEngine";
import { AppError } from "../middlewares/error.middleware";

export const getActivePlan = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const plan = await PlanService.getActivePlan(req.user.userId);
    res.status(200).json({ status: "success", data: plan });
  } catch (error) {
    next(error);
  }
};

export const getMyPlans = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const plans = await PlanService.getPlans(req.user.userId);
    res.status(200).json({ status: "success", data: { plans } });
  } catch (error) {
    next(error);
  }
};

export const evolvePlan = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    // We assume the user wants to evolve their CURRENT active plan
    // But for safety, let's look up the active plan ID first
    // Or accept planId in body? Let's lookup active.
    const activePlan = await PlanService.getActivePlan(req.user.userId);
    if (!activePlan) throw new AppError("No active plan to evolve", 404);

    // 1. Evaluate
    await BlockEvaluationService.evaluateBlock(activePlan.id);

    // 2. Evolve
    const newPlan = await PlanEvolutionEngine.evolvePlan(activePlan.id);

    res.status(200).json({ status: "success", data: newPlan });
  } catch (error) {
    next(error);
  }
};
