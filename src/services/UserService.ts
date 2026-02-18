import * as authService from "./auth.service";
import { PlanService } from "./PlanService";
import {
  TrainingGoal,
  ExperienceLevel,
  ExerciseEnvironment,
} from "@prisma/client";
export class UserService {
  /**
   * Registers a user and automatically generates a workout plan based on their profile.
   */
  static async registerAndGeneratePlan(
    dto: authService.RegisterDto & { goal?: TrainingGoal },
  ) {
    console.log(`👤 UserService: Registering user ${dto.email}...`);

    // 1. Register the user
    const { user, token } = await authService.register(dto);

    // 2. Map training goal if provided (default to HYPERTROPHY for now if not specified or doesn't match)
    // In a real app, this mapping would be more sophisticated.
    const goal = dto.goal || TrainingGoal.HYPERTROPHY;

    // 3. Prepare Plan Input from User Profile (with defaults if missing)
    const level =
      user.trainingLevel || dto.trainingLevel || ExperienceLevel.INTERMEDIATE;
    const days = user.trainingDaysPerWeek || dto.trainingDaysPerWeek || 3;
    const env =
      user.trainingEnvironment ||
      dto.trainingEnvironment ||
      ExerciseEnvironment.GYM;

    console.log(
      `📅 UserService: Automatically generating plan for user ${user.id}...`,
    );

    try {
      await PlanService.createPlan({
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
    } catch (error) {
      console.error(
        `⚠️ UserService: Failed to generate auto-plan for user ${user.id}:`,
        error,
      );
    }

    return { user, token };
  }
}
