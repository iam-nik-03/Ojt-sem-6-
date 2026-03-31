import { Router } from "express";
import { userAuthController } from "../controllers/userAuthController";
import { authMiddleware, adminMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.post("/signup", userAuthController.signup);
router.post("/login", userAuthController.login);
router.post("/google-login", userAuthController.googleLogin);
router.post("/logout", userAuthController.logout);
router.get("/me", userAuthController.me);

// Admin routes
router.get("/admin/users", authMiddleware, adminMiddleware, userAuthController.getAllUsers);
router.get("/admin/stats", authMiddleware, adminMiddleware, userAuthController.getAdminStats);

export default router;
