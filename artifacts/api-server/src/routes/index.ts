import { Router, type IRouter } from "express";
import healthRouter from "./health";
import bookingsRouter from "./bookings";
import podcastsRouter from "./podcasts";
import coursesRouter from "./courses";
import uploadRouter from "./upload";
import settingsRouter from "./settings";
const router: IRouter = Router();

router.use(healthRouter);
router.use(bookingsRouter);
router.use(podcastsRouter);
router.use(coursesRouter);
router.use(uploadRouter);
router.use(settingsRouter);

export default router;
