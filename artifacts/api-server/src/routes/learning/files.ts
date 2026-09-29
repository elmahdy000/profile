import { Router, type IRouter } from "express";
import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";
import multer from "multer";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  learningFilesTable,
  videoFileAttachmentsTable,
  videosTable,
  coursesTable,
  studentsTable,
  studentNotificationsTable,
} from "@workspace/db";
import { requireAdmin, requireSuperAdmin, isAdminRequest } from "../../middleware/auth";
import {
  requireStudent,
  getApprovedStudent,
  canStudentAccessContent,
  canStudentAccessLearningMode,
} from "../../middleware/student-auth";
import { isAcademicStageAllowedForTrack } from "../../lib/academic-stages";
import { logAudit } from "../../lib/audit";
import {
  privateUploadDir,
  normalizeStringList,
  ensureAutomaticCourseAssignments,
} from "./shared";

const router: IRouter = Router();

const allowedFileTypes = new Set([
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const allowedLearningFileExtensions = new Set([
  ".pdf", ".zip", ".doc", ".docx", ".ppt", ".pptx", ".txt",
  ".jpg", ".jpeg", ".png", ".webp",
]);

const learningFileUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, privateUploadDir),
    filename: (_req, file, cb) => {
      const safeExt = path
        .extname(file.originalname)
        .toLowerCase()
        .replace(/[^.a-z0-9]/g, "");
      cb(null, `${Date.now()}-${randomBytes(8).toString("hex")}${safeExt}`);
    },
  }),
  limits: { fileSize: 150 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const genericMime = !file.mimetype || file.mimetype === "application/octet-stream";
    if (allowedFileTypes.has(file.mimetype) || (genericMime && allowedLearningFileExtensions.has(extension))) cb(null, true);
    else cb(new Error("صيغة الملف غير مدعومة. استخدم PDF أو Office أو ZIP أو TXT أو صورة."));
  },
}).single("file");

router.get("/learning/files", requireStudent, async (_req, res, next) => {
  try {
    const student = res.locals.student as typeof studentsTable.$inferSelect;
    const files = await db
      .select()
      .from(learningFilesTable)
      .where(eq(learningFilesTable.isPublished, true))
      .orderBy(desc(learningFilesTable.createdAt));
    const fileIds = files.map((file) => file.id);
    const links = fileIds.length
      ? await db
          .select({ fileId: videoFileAttachmentsTable.fileId, video: videosTable })
          .from(videoFileAttachmentsTable)
          .innerJoin(videosTable, eq(videoFileAttachmentsTable.videoId, videosTable.id))
          .where(inArray(videoFileAttachmentsTable.fileId, fileIds))
      : [];
    const linkedVideos = new Map<number, Array<typeof videosTable.$inferSelect>>();
    for (const link of links) {
      linkedVideos.set(link.fileId, [...(linkedVideos.get(link.fileId) ?? []), link.video]);
    }
    res.json(
      files
        .filter((file) => file.targetType === "videos"
          ? (linkedVideos.get(file.id) ?? []).some((video) =>
              video.isPublished && canStudentAccessContent(
                student, video.category, video.stage, video.stages, video.courseId,
              ),
            )
          : canStudentAccessContent(student, file.category, file.stage, file.stages, file.courseId))
        .map(({ storageName: _storageName, ...file }) => file),
    );
  } catch (error) {
    next(error);
  }
});

router.get("/admin/learning/files", requireAdmin, async (_req, res, next) => {
  try {
    const files = await db
        .select()
        .from(learningFilesTable)
        .orderBy(desc(learningFilesTable.createdAt));
    const links = files.length ? await db
      .select({ fileId: videoFileAttachmentsTable.fileId, videoId: videoFileAttachmentsTable.videoId })
      .from(videoFileAttachmentsTable)
      .where(inArray(videoFileAttachmentsTable.fileId, files.map((file) => file.id))) : [];
    res.json(files.map((file) => ({
      ...file,
      videoIds: links.filter((link) => link.fileId === file.id).map((link) => link.videoId),
    })));
  } catch (error) {
    next(error);
  }
});

router.post(
  "/admin/learning/files",
  requireAdmin,
  learningFileUpload,
  async (req, res, next) => {
    try {
      if (!req.file || !String(req.body.title ?? "").trim()) {
        if (req.file) fs.rmSync(req.file.path, { force: true });
        res.status(400).json({ error: "Title and file are required" });
        return;
      }
      const targetType = String(req.body.targetType ?? "stages") === "videos" ? "videos" : "stages";
      const stages = Array.from(new Set(
        String(req.body.stages ?? req.body.stage ?? "")
          .split(",").map((value) => value.trim()).filter(Boolean),
      )).slice(0, 20);
      const videoIds = Array.from(new Set(
        String(req.body.videoIds ?? "").split(",").map(Number).filter(Number.isInteger),
      )).slice(0, 100);
      const courseId = Number(req.body.courseId) || null;
      let category = String(req.body.category ?? "عام").trim() || "عام";
      if ((targetType === "stages" && stages.length === 0) || (targetType === "videos" && videoIds.length === 0)) {
        fs.rmSync(req.file.path, { force: true });
        res.status(400).json({ error: targetType === "videos" ? "اختر فيديو واحدًا على الأقل" : "اختر مرحلة واحدة على الأقل" });
        return;
      }
      if (targetType === "stages") {
        const [course] = courseId ? await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1) : [];
        const validTrackIds = new Set(["baccalaureate", "computer-science", "engineering"]);
        if (courseId && !course) {
          fs.rmSync(req.file.path, { force: true });
          res.status(400).json({ error: "اختر كورسًا صحيحًا" }); return;
        }
        if (course?.stages.length && stages.some((stage) => !course.stages.includes(stage))) {
          fs.rmSync(req.file.path, { force: true });
          res.status(400).json({ error: "إحدى المراحل غير متاحة داخل الكورس" }); return;
        }
        if (!course && !validTrackIds.has(category)) {
          fs.rmSync(req.file.path, { force: true });
          res.status(400).json({ error: "اختر قسمًا تعليميًا صحيحًا" }); return;
        }
        if (!course && stages.some((stage) => !isAcademicStageAllowedForTrack(category, stage))) {
          fs.rmSync(req.file.path, { force: true });
          res.status(400).json({ error: "إحدى المراحل لا تنتمي إلى القسم التعليمي المختار" }); return;
        }
        category = course?.title || category;
      }
      const [file] = await db
        .insert(learningFilesTable)
        .values({
          title: String(req.body.title).trim(),
          courseId: targetType === "stages" ? courseId : null,
          description: String(req.body.description ?? "").trim() || null,
          category,
          stage: stages[0] ?? null,
          stages,
          targetType,
          subject: String(req.body.subject ?? "").trim() || null,
          tags: String(req.body.tags ?? "")
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
            .slice(0, 20),
          order: Number.isFinite(Number(req.body.order))
            ? Number(req.body.order)
            : 0,
          originalName: path.basename(req.file.originalname),
          storageName: req.file.filename,
          mimeType: req.file.mimetype,
          sizeBytes: req.file.size,
          isPublished: String(req.body.isPublished ?? "true") !== "false",
        })
        .returning();
      if (targetType === "videos") {
        const validVideos = await db.select().from(videosTable).where(inArray(videosTable.id, videoIds));
        if (validVideos.length !== videoIds.length) {
          await db.delete(learningFilesTable).where(eq(learningFilesTable.id, file.id));
          fs.rmSync(req.file.path, { force: true });
          res.status(400).json({ error: "أحد الفيديوهات المختارة غير موجود" });
          return;
        }
        await db.insert(videoFileAttachmentsTable).values(
          validVideos.map((video, order) => ({ videoId: video.id, fileId: file.id, order })),
        );
      }
      if (file.isPublished) {
        const approvedStudents = await db.select().from(studentsTable).where(eq(studentsTable.status, "approved"));
        const linkedVideos = targetType === "videos"
          ? await db.select().from(videosTable).where(inArray(videosTable.id, videoIds))
          : [];
        const recipients = approvedStudents.filter((student) => targetType === "videos"
          ? linkedVideos.some((video) => video.isPublished && canStudentAccessContent(student, video.category, video.stage, video.stages, video.courseId))
          : canStudentAccessContent(student, file.category, file.stage, file.stages, file.courseId));
        if (recipients.length) await db.insert(studentNotificationsTable).values(recipients.map((student) => ({
          studentId: student.id,
          type: "file",
          title: "ملف جديد متاح لك",
          message: `${file.title} متاح الآن داخل ملفاتك.`,
        })));
      }
      res.status(201).json(file);
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/admin/learning/files/:id",
  requireAdmin,
  async (req, res, next) => {
    try {
      const fileId = Number(req.params.id);
      const [currentFile] = await db.select().from(learningFilesTable).where(eq(learningFilesTable.id, fileId)).limit(1);
      if (!currentFile) { res.status(404).json({ error: "الملف غير موجود" }); return; }
      const targetType = req.body.targetType === "videos" ? "videos" : req.body.targetType === "stages" ? "stages" : undefined;
      const stages: string[] | undefined = req.body.stages !== undefined
        ? (Array.isArray(req.body.stages) ? req.body.stages : String(req.body.stages).split(","))
            .map(String).map((stage: string) => stage.trim()).filter(Boolean)
        : undefined;
      const videoIds: number[] | undefined = req.body.videoIds !== undefined
        ? (Array.isArray(req.body.videoIds) ? req.body.videoIds : String(req.body.videoIds).split(","))
            .map(Number).filter((id: number) => Number.isInteger(id) && id > 0)
        : undefined;
      if (targetType === "stages" && stages?.length === 0) {
        res.status(400).json({ error: "اختر مرحلة واحدة على الأقل" }); return;
      }
      if (targetType === "videos" && videoIds?.length === 0) {
        res.status(400).json({ error: "اختر فيديو واحدًا على الأقل" }); return;
      }
      const effectiveTarget = targetType ?? currentFile.targetType;
      const effectiveStages = stages ?? currentFile.stages;
      if (effectiveTarget === "stages" && effectiveStages.length === 0) {
        res.status(400).json({ error: "اختر مرحلة واحدة على الأقل" }); return;
      }
      if (targetType === "videos" && currentFile.targetType !== "videos" && !videoIds?.length) {
        res.status(400).json({ error: "اختر فيديو واحدًا على الأقل" }); return;
      }
      const courseId = req.body.courseId !== undefined ? Number(req.body.courseId) || null : currentFile.courseId;
      const [course] = effectiveTarget === "stages" && courseId ? await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1) : [];
      const requestedCategory = req.body.category !== undefined
        ? String(req.body.category).trim()
        : currentFile.category;
      const validTrackIds = new Set(["baccalaureate", "computer-science", "engineering"]);
      if (effectiveTarget === "stages" && courseId && !course) {
        res.status(400).json({ error: "اختر كورسًا صحيحًا" }); return;
      }
      if (effectiveTarget === "stages" && course?.stages.length && effectiveStages.some((stage) => !course.stages.includes(stage))) {
        res.status(400).json({ error: "إحدى المراحل غير متاحة داخل الكورس" }); return;
      }
      if (effectiveTarget === "stages" && !course && !validTrackIds.has(requestedCategory)) {
        res.status(400).json({ error: "اختر قسمًا تعليميًا صحيحًا" }); return;
      }
      if (effectiveTarget === "stages" && !course && effectiveStages.some((stage) => !isAcademicStageAllowedForTrack(requestedCategory, stage))) {
        res.status(400).json({ error: "إحدى المراحل لا تنتمي إلى القسم التعليمي المختار" }); return;
      }
      if (videoIds?.length) {
        const existingVideos = await db.select({ id: videosTable.id }).from(videosTable).where(inArray(videosTable.id, videoIds));
        if (existingVideos.length !== new Set(videoIds).size) {
          res.status(400).json({ error: "أحد الفيديوهات المختارة غير موجود" }); return;
        }
      }
      const [file] = await db
        .update(learningFilesTable)
        .set({
          courseId: effectiveTarget === "stages" ? courseId : null,
          ...(course && { category: course.title }),
          ...(req.body.title !== undefined && {
            title: String(req.body.title).trim(),
          }),
          ...(req.body.description !== undefined && {
            description: String(req.body.description).trim() || null,
          }),
          ...(req.body.category !== undefined && {
            category: String(req.body.category).trim() || "عام",
          }),
          ...(req.body.stage !== undefined && {
            stage: String(req.body.stage).trim() || null,
          }),
          ...(stages !== undefined && { stages, stage: stages[0] ?? null }),
          ...(effectiveTarget === "stages" && {
            category: course?.title || requestedCategory,
            stages: effectiveStages,
            stage: effectiveStages[0] ?? null,
          }),
          ...(targetType === "videos" && { stages: [], stage: null }),
          ...(targetType !== undefined && { targetType }),
          ...(req.body.subject !== undefined && {
            subject: String(req.body.subject).trim() || null,
          }),
          ...(req.body.tags !== undefined && {
            tags: Array.isArray(req.body.tags)
              ? req.body.tags.map(String)
              : String(req.body.tags)
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean),
          }),
          ...(req.body.order !== undefined && {
            order: Number(req.body.order) || 0,
          }),
          ...(req.body.isPublished !== undefined && {
            isPublished: Boolean(req.body.isPublished),
          }),
        })
        .where(eq(learningFilesTable.id, fileId))
        .returning();
      if (!file) {
        res.status(404).json({ error: "الملف غير موجود" });
        return;
      }
      if (videoIds !== undefined) {
        await db.delete(videoFileAttachmentsTable).where(eq(videoFileAttachmentsTable.fileId, file.id));
        if (videoIds.length) await db.insert(videoFileAttachmentsTable).values(
          Array.from(new Set(videoIds)).map((videoId, order) => ({ videoId, fileId: file.id, order })),
        );
      } else if (targetType === "stages") {
        await db.delete(videoFileAttachmentsTable).where(eq(videoFileAttachmentsTable.fileId, file.id));
      }
      if (!currentFile.isPublished && file.isPublished) {
        const approvedStudents = await db.select().from(studentsTable).where(eq(studentsTable.status, "approved"));
        const linkedVideos = file.targetType === "videos"
          ? (await db.select({ video: videosTable }).from(videoFileAttachmentsTable)
              .innerJoin(videosTable, eq(videoFileAttachmentsTable.videoId, videosTable.id))
              .where(eq(videoFileAttachmentsTable.fileId, file.id))).map(({ video }) => video)
          : [];
        const recipients = approvedStudents.filter((student) => file.targetType === "videos"
          ? linkedVideos.some((video) => video.isPublished && canStudentAccessContent(student, video.category, video.stage, video.stages, video.courseId))
          : canStudentAccessContent(student, file.category, file.stage, file.stages, file.courseId));
        if (recipients.length) await db.insert(studentNotificationsTable).values(recipients.map((student) => ({
          studentId: student.id,
          type: "file",
          title: "ملف جديد متاح لك",
          message: `${file.title} متاح الآن داخل ملفاتك.`,
        })));
      }
      res.json(file);
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/admin/learning/files/:id",
  requireSuperAdmin,
  async (req, res, next) => {
    try {
      const [file] = await db
        .delete(learningFilesTable)
        .where(eq(learningFilesTable.id, Number(req.params.id)))
        .returning();
      if (!file) {
        res.status(404).json({ error: "الملف غير موجود" });
        return;
      }
      fs.rmSync(path.join(privateUploadDir, path.basename(file.storageName)), {
        force: true,
      });

      await logAudit(req, "DELETE_FILE", "learning_file", String(file.id), `حذف ملف تعليمي: ${file.originalName}`);

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

router.get(["/learning/files/:id/preview", "/learning/files/:id/download"], async (req, res, next) => {
  try {
    if (req.path.endsWith("/download") && !isAdminRequest(req)) {
      res.status(403).json({
        error: "عفواً: غير مسموح بتحميل الملفات، يمكنك فقط معاينتها وقراءتها داخل المنصة.",
        code: "DOWNLOAD_NOT_ALLOWED",
      });
      return;
    }
    const student = await getApprovedStudent(req);
    if (!student && !isAdminRequest(req)) {
      res.status(401).json({ error: "Student login is required" });
      return;
    }
    const [file] = await db
      .select()
      .from(learningFilesTable)
      .where(
        and(
          eq(learningFilesTable.id, Number(req.params.id)),
          eq(learningFilesTable.isPublished, true),
        ),
      )
      .limit(1);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    if (
      student &&
      !(file.targetType === "videos"
        ? (await db.select({ video: videosTable }).from(videoFileAttachmentsTable)
            .innerJoin(videosTable, eq(videoFileAttachmentsTable.videoId, videosTable.id))
            .where(eq(videoFileAttachmentsTable.fileId, file.id)))
            .some(({ video }) => video.isPublished && canStudentAccessContent(
              student, video.category, video.stage, video.stages, video.courseId,
            ))
        : canStudentAccessContent(student, file.category, file.stage, file.stages, file.courseId))
    ) {
      res.status(403).json({ error: "الملف غير متاح لحسابك أو مرحلتك الدراسية" });
      return;
    }
    if (student && (student.status !== "approved" || student.paymentStatus !== "paid")) {
      const linkedVideos = (
        await db
          .select({ video: videosTable })
          .from(videoFileAttachmentsTable)
          .innerJoin(videosTable, eq(videoFileAttachmentsTable.videoId, videosTable.id))
          .where(eq(videoFileAttachmentsTable.fileId, file.id))
      ).map((row) => row.video);

      const isFreePreviewAttachment = linkedVideos.some(
        (v) => v.isPublished && (v.order === 0 || v.order === 1)
      );

      if (!isFreePreviewAttachment) {
        res.status(403).json({
          error: "الملفات والملازم متاحة للمشتركين المدفوعين فقط بعد تفعيل الحساب من الأدمن.",
          code: "PAYMENT_REQUIRED",
        });
        return;
      }
    }
    const filePath = path.join(
      privateUploadDir,
      path.basename(file.storageName),
    );
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "File missing from storage" });
      return;
    }
    res.setHeader("Content-Type", file.mimeType);
    // Force inline rendering only, never trigger attachment download
    res.setHeader(
      "Content-Disposition",
      `inline; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Content-Security-Policy", "default-src 'self' blob: data:; frame-ancestors 'self';");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    next(error);
  }
});

export default router;
