import { Router } from "express";
import { searchExercises } from "../controllers/exercise.controller";

const router = Router();

router.get("/", searchExercises);

export default router;
