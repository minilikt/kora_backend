import { Router } from "express";
import * as analyticsController from "../controllers/analytics.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/daily-activity", analyticsController.getDailyActivity);
router.get("/summary", analyticsController.getSummary);
router.get("/trends", analyticsController.getTrends);
router.get("/muscles", analyticsController.getMuscleDistribution);
router.get("/heatmap", analyticsController.getHeatmap);
router.get("/profile-summary", analyticsController.getProfileSummary);
router.get("/history", analyticsController.getHistory);
router.get("/personal-records", analyticsController.getPersonalRecords);
router.get("/streak", analyticsController.getStreak);
router.get("/last-workout", analyticsController.getLastWorkout);

export default router;
