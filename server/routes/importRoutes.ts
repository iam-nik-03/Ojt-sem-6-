import { Router } from "express";
import { importController } from "../controllers/importController";

const router = Router();

router.post("/import-drive", importController.importFromDrive);
router.post("/save-course", importController.saveCourse);
router.get("/get-course/:courseId", importController.getCourse);

export default router;
