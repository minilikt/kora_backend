import { Router } from "express";
import * as planController from "../controllers/plan.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/active", planController.getActivePlan);
router.get("/my-plans", planController.getMyPlans);
router.post("/evolve", planController.evolvePlan);

export default router;
