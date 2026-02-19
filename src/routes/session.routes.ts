import { Router } from "express";
import * as sessionController from "../controllers/session.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.post("/:sessionId/start", sessionController.startSession);
router.get("/current", sessionController.getCurrentSession);
router.post("/complete", sessionController.completeSession);

export default router;
