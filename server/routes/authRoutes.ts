import { Router } from "express";
import { authController } from "../controllers/authController";

const router = Router();

router.get("/google", authController.getAuthUrl);
router.get("/callback", authController.callback);
router.get("/status", authController.status);
router.post("/logout", authController.logout);

export default router;
