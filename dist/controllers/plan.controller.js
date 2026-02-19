"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evolvePlan = exports.getMyPlans = exports.getActivePlan = void 0;
const PlanService_1 = require("../services/PlanService");
const BlockEvaluationService_1 = require("../services/BlockEvaluationService");
const PlanEvolutionEngine_1 = require("../engines/PlanEvolutionEngine");
const error_middleware_1 = require("../middlewares/error.middleware");
const getActivePlan = async (req, res, next) => {
    try {
        if (!req.user)
            throw new error_middleware_1.AppError("Unauthorized", 401);
        const plan = await PlanService_1.PlanService.getActivePlan(req.user.userId);
        res.status(200).json({ status: "success", data: plan });
    }
    catch (error) {
        next(error);
    }
};
exports.getActivePlan = getActivePlan;
const getMyPlans = async (req, res, next) => {
    try {
        if (!req.user)
            throw new error_middleware_1.AppError("Unauthorized", 401);
        const plans = await PlanService_1.PlanService.getPlans(req.user.userId);
        res.status(200).json({ status: "success", data: { plans } });
    }
    catch (error) {
        next(error);
    }
};
exports.getMyPlans = getMyPlans;
const evolvePlan = async (req, res, next) => {
    try {
        if (!req.user)
            throw new error_middleware_1.AppError("Unauthorized", 401);
        // We assume the user wants to evolve their CURRENT active plan
        // But for safety, let's look up the active plan ID first
        // Or accept planId in body? Let's lookup active.
        const activePlan = await PlanService_1.PlanService.getActivePlan(req.user.userId);
        if (!activePlan)
            throw new error_middleware_1.AppError("No active plan to evolve", 404);
        // 1. Evaluate
        await BlockEvaluationService_1.BlockEvaluationService.evaluateBlock(activePlan.id);
        // 2. Evolve
        const newPlan = await PlanEvolutionEngine_1.PlanEvolutionEngine.evolvePlan(activePlan.id);
        res.status(200).json({ status: "success", data: newPlan });
    }
    catch (error) {
        next(error);
    }
};
exports.evolvePlan = evolvePlan;
//# sourceMappingURL=plan.controller.js.map