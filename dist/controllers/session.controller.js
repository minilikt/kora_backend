"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentSession = exports.completeSession = exports.startSession = void 0;
const SessionService_1 = require("../services/SessionService");
const zod_1 = require("zod");
const error_middleware_1 = require("../middlewares/error.middleware");
const completeSessionSchema = zod_1.z.object({
    planId: zod_1.z.string(),
    week: zod_1.z.number().int(),
    day: zod_1.z.number().int(),
    startedAt: zod_1.z.string(),
    completedAt: zod_1.z.string(),
    notes: zod_1.z.string().optional(),
    exercises: zod_1.z.array(zod_1.z.object({
        exerciseId: zod_1.z.string(),
        timeSpentSec: zod_1.z.number().int().optional(),
        equipmentUsed: zod_1.z.array(zod_1.z.string()).optional(),
        notes: zod_1.z.string().optional(),
        sets: zod_1.z.array(zod_1.z.object({
            setIndex: zod_1.z.number().int(),
            weight: zod_1.z.number().nonnegative(),
            reps: zod_1.z.number().int().positive(),
            rpe: zod_1.z.number().min(0).max(10),
        })),
    })),
});
const startSession = async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const session = await SessionService_1.SessionService.startSession(sessionId);
        res.status(200).json({ status: "success", data: session });
    }
    catch (error) {
        next(error);
    }
};
exports.startSession = startSession;
const completeSession = async (req, res, next) => {
    try {
        if (!req.user)
            throw new error_middleware_1.AppError("Unauthorized", 401);
        const validatedData = completeSessionSchema.parse(req.body);
        const result = await SessionService_1.SessionService.completeSession(req.user.userId, validatedData);
        res.status(200).json({ status: "success", data: result });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            next(new error_middleware_1.AppError("Validation failed: " + error.issues.map((e) => e.message).join(", "), 400));
        }
        else {
            next(error);
        }
    }
};
exports.completeSession = completeSession;
const getCurrentSession = async (req, res, next) => {
    try {
        if (!req.user)
            throw new error_middleware_1.AppError("Unauthorized", 401);
        const session = await SessionService_1.SessionService.getCurrentSession(req.user.userId);
        res.status(200).json({ status: "success", data: { session } });
    }
    catch (error) {
        next(error);
    }
};
exports.getCurrentSession = getCurrentSession;
//# sourceMappingURL=session.controller.js.map