"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.refresh = exports.login = exports.register = void 0;
const zod_1 = require("zod");
const UserService_1 = require("../services/UserService");
const authService = __importStar(require("../services/auth.service"));
const client_1 = require("@prisma/client");
const error_middleware_1 = require("../middlewares/error.middleware");
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    name: zod_1.z.string().min(1),
    preferredName: zod_1.z.string().optional(),
    gender: zod_1.z.nativeEnum(client_1.Gender).optional(),
    age: zod_1.z.number().int().positive().optional(),
    weight: zod_1.z.number().positive().optional(),
    targetWeight: zod_1.z.number().positive().optional(),
    height: zod_1.z.number().positive().optional(),
    bmi: zod_1.z.number().positive().optional(),
    sleepHours: zod_1.z.number().positive().optional(),
    waterDaily: zod_1.z.number().positive().optional(),
    trainingLevel: zod_1.z.nativeEnum(client_1.ExperienceLevel).optional(),
    trainingEnvironment: zod_1.z.nativeEnum(client_1.ExerciseEnvironment).optional(),
    trainingDaysPerWeek: zod_1.z.number().int().min(1).max(7).optional(),
    goal: zod_1.z.nativeEnum(client_1.TrainingGoal).optional(),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
const register = async (req, res, next) => {
    try {
        const validatedData = registerSchema.parse(req.body);
        const result = await UserService_1.UserService.registerAndGeneratePlan(validatedData);
        res.status(201).json({
            status: "success",
            data: result,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            next(new error_middleware_1.AppError("Validation failed: " +
                error.issues.map((e) => e.message).join(", "), 400));
        }
        else {
            next(error);
        }
    }
};
exports.register = register;
const login = async (req, res, next) => {
    try {
        const validatedData = loginSchema.parse(req.body);
        const result = await authService.login(validatedData);
        res.status(200).json({
            status: "success",
            data: result,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            next(new error_middleware_1.AppError("Validation failed: " +
                error.issues.map((e) => e.message).join(", "), 400));
        }
        else {
            next(error);
        }
    }
};
exports.login = login;
const refresh = async (req, res, next) => {
    try {
        const { token } = req.body;
        if (!token)
            throw new error_middleware_1.AppError("Refresh token required", 400);
        const result = await authService.refreshAccessToken(token);
        res.status(200).json({ status: "success", data: result });
    }
    catch (error) {
        next(error);
    }
};
exports.refresh = refresh;
//# sourceMappingURL=auth.controller.js.map