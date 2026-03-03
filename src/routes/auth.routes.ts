import { Router } from "express";
import * as authController from "../controllers/auth.controller";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/check-email", authController.checkEmail);

export default router;
