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
exports.UserService = void 0;
const authService = __importStar(require("./auth.service"));
const PlanService_1 = require("./PlanService");
const client_1 = require("@prisma/client");
class UserService {
    /**
     * Registers a user and automatically generates a workout plan based on their profile.
     */
    static async registerAndGeneratePlan(dto) {
        console.log(`👤 UserService: Registering user ${dto.email}...`);
        // 1. Register the user
        const { user, accessToken, refreshToken } = await authService.register(dto);
        // 2. Map training goal if provided (default to HYPERTROPHY for now if not specified or doesn't match)
        // In a real app, this mapping would be more sophisticated.
        const goal = dto.goal || client_1.TrainingGoal.HYPERTROPHY;
        // 3. Prepare Plan Input from User Profile (with defaults if missing)
        const level = user.trainingLevel || dto.trainingLevel || client_1.ExperienceLevel.INTERMEDIATE;
        const days = user.trainingDaysPerWeek || dto.trainingDaysPerWeek || 3;
        const env = user.trainingEnvironment ||
            dto.trainingEnvironment ||
            client_1.ExerciseEnvironment.GYM;
        console.log(`📅 UserService: Automatically generating plan for user ${user.id}...`);
        try {
            await PlanService_1.PlanService.createPlan({
                userId: user.id,
                days: days,
                goal: goal,
                level: level,
                environment: env,
                progressionId: "LINEAR_BEGINNER_4W",
                equipment: [
                    "Barbell",
                    "Dumbbell",
                    "Cable Machine",
                    "Flat Bench",
                    "Pull-up Bar",
                    "Squat Rack",
                    "Incline Bench",
                    "Adjustable Bench",
                    "Leg Press",
                    "Smith Machine",
                    "Lat Pulldown Machine",
                    "Dip Bar",
                    "Kettlebell",
                ],
            });
            console.log(`✅ UserService: Auto-plan generated for user ${user.id}`);
        }
        catch (error) {
            console.error(`⚠️ UserService: Failed to generate auto-plan for user ${user.id}:`, error);
        }
        return { user, accessToken, refreshToken };
    }
}
exports.UserService = UserService;
//# sourceMappingURL=UserService.js.map