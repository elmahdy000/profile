import { Router, type IRouter } from "express";

// Sub-routers
import studentsAuthRouter from "./learning/students-auth";
import studentsAdminRouter from "./learning/students-admin";
import paymentsRouter from "./learning/payments";
import progressRouter from "./learning/progress";
import filesRouter from "./learning/files";
import quizzesRouter from "./learning/quizzes";
import questionBankRouter from "./learning/question-bank";
import autoExamRouter from "./learning/auto-exam";
import selfAssessmentRouter from "./learning/self-assessment";
import essayExamsRouter from "./learning/essay-exams";

const router: IRouter = Router();

// Mount all modular learning sub-routers
router.use(studentsAuthRouter);
router.use(studentsAdminRouter);
router.use(paymentsRouter);
router.use(progressRouter);
router.use(filesRouter);
router.use(quizzesRouter);
router.use(questionBankRouter);
router.use(autoExamRouter);
router.use(selfAssessmentRouter);
router.use(essayExamsRouter);

// Re-exports for backward compatibility
export { logAudit } from "../lib/audit";
export {
  getStudentTrack,
  matchStudentToStage,
  parseUnitSortOrder,
  parseLessonSortOrder,
  normalizeQuestionPrompt,
  processSubscriptionExpirations,
  publicStudent,
} from "./learning/shared";
export { parseImportedQuestions } from "./learning/question-parser";

export default router;
