import { Router, type IRouter } from "express";
import healthRouter from "./health";
import bookingsRouter from "./bookings";
import podcastsRouter from "./podcasts";
import coursesRouter from "./courses";
import uploadRouter from "./upload";
import settingsRouter from "./settings";
import curriculumsRouter from "./curriculums";
import videosRouter from "./videos";
import learningRouter from "./learning";
const router: IRouter = Router();

router.use(healthRouter);
router.use(bookingsRouter);
router.use(podcastsRouter);
router.use(coursesRouter);
router.use(uploadRouter);
router.use(settingsRouter);
router.use(curriculumsRouter);
router.use(videosRouter);
router.use(learningRouter);

export default router;
