import { Router, type IRouter } from "express";
import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { and, desc, eq, gt, gte, ilike, inArray, isNull, ne, or, sql } from "drizzle-orm";
import {
  db,
  questionBankTable,
  selfAssessmentEntitlementsTable,
  selfAssessmentSessionsTable,
  studentsTable,
  studentNotificationsTable,
  monthlySubscriptionsTable,
  type QuizQuestion,
  type SelfAssessmentEntitlement,
  type SelfAssessmentSession,
} from "@workspace/db";
import { getAdminIdentity, requireAdmin } from "../../middleware/auth";
import { getApprovedStudent } from "../../middleware/student-auth";
import { sendPushToStudent } from "../../services/push-notifications";
import { logAudit } from "../../lib/audit";
import {
  normalizeEgyptianPhone,
  getStudentTrack,
  matchStudentToStage,
  parseUnitSortOrder,
  parseLessonSortOrder,
  paymentReceiptUpload,
  paymentReceiptsDir,
  normalizeQuestionPrompt,
  cleanOptionString,
  isCompleteValidQuestion,
} from "./shared";

const router: IRouter = Router();

// 1. GET /api/learning/self-assessment/taxonomy - إرجاع قائمة شجرية بالوحدات والدروس المتاحة للتقييم الذاتي
router.get("/learning/self-assessment/taxonomy", async (req, res, next) => {
  try {
    const student = await getApprovedStudent(req);
    type EffectiveStudent = {
      id?: number;
      name?: string;
      phone?: string;
      status?: string;
      grade?: string | null;
      educationGrade?: string | null;
      languageTrack?: string | null;
      academicTrack?: string | null;
      schoolType?: string | null;
    };
    let effectiveStudent: EffectiveStudent | null = student;
    if (!effectiveStudent && req.query.phone) {
      const p = normalizeEgyptianPhone(String(req.query.phone));
      if (p.length >= 10) {
        const [existing] = await db
          .select({
            id: studentsTable.id,
            name: studentsTable.name,
            phone: studentsTable.phone,
            status: studentsTable.status,
            grade: studentsTable.grade,
            educationGrade: studentsTable.educationGrade,
            languageTrack: studentsTable.languageTrack,
            academicTrack: studentsTable.academicTrack,
            schoolType: studentsTable.schoolType,
          })
          .from(studentsTable)
          .where(and(eq(studentsTable.phone, p), eq(studentsTable.status, "approved")))
          .limit(1);
        if (existing) effectiveStudent = existing;
      }
    }

    const stageQuery = req.query.stage ? String(req.query.stage).trim() : undefined;

    let query = db
      .select({
        id: questionBankTable.id,
        stage: questionBankTable.stage,
        unit: questionBankTable.unit,
        lesson: questionBankTable.lesson,
        difficulty: questionBankTable.difficulty,
        question: questionBankTable.question,
      })
      .from(questionBankTable);

    const conditions = [];
    if (stageQuery && stageQuery !== "all") {
      conditions.push(
        or(
          eq(questionBankTable.stage, stageQuery),
          sql`${questionBankTable.stages}::jsonb @> ${JSON.stringify([stageQuery])}::jsonb`
        )
      );
    }

    const allQuestions = await (conditions.length ? query.where(and(...conditions)) : query);

    const taxonomy: Record<
      string,
      {
        stage: string;
        track: "ar" | "en";
        totalQuestions: number;
        units: Record<
          string,
          {
            unit: string;
            totalQuestions: number;
            lessons: Record<
              string,
              {
                lesson: string;
                totalQuestions: number;
              }
            >;
          }
        >;
      }
    > = {};

    for (const row of allQuestions) {
      if (!row.unit || !row.unit.trim()) continue;
      if (!isCompleteValidQuestion(row.question)) continue;

      const stage = String(row.stage || "عام").trim();
      const unit = String(row.unit).trim();
      const lesson = String(row.lesson || "شامل الوحدة").trim();
      const isEnglish = stage.toLowerCase().includes("لغات") || stage.toLowerCase().includes("languages");

      if (!taxonomy[stage]) {
        taxonomy[stage] = {
          stage,
          track: isEnglish ? "en" : "ar",
          totalQuestions: 0,
          units: {},
        };
      }

      if (!taxonomy[stage].units[unit]) {
        taxonomy[stage].units[unit] = {
          unit,
          totalQuestions: 0,
          lessons: {},
        };
      }

      if (!taxonomy[stage].units[unit].lessons[lesson]) {
        taxonomy[stage].units[unit].lessons[lesson] = {
          lesson,
          totalQuestions: 0,
        };
      }

      taxonomy[stage].totalQuestions++;
      taxonomy[stage].units[unit].totalQuestions++;
      taxonomy[stage].units[unit].lessons[lesson].totalQuestions++;
    }

    const stagesList = Object.values(taxonomy)
      .sort((a, b) => (a.track === "ar" ? -1 : 1))
      .map((st) => ({
        stage: st.stage,
        track: st.track,
        totalQuestions: st.totalQuestions,
        units: Object.values(st.units)
          .sort((a, b) => parseUnitSortOrder(a.unit) - parseUnitSortOrder(b.unit))
          .map((u) => ({
            unit: u.unit,
            totalQuestions: u.totalQuestions,
            lessons: Object.values(u.lessons)
              .sort((a, b) => parseLessonSortOrder(a.lesson) - parseLessonSortOrder(b.lesson)),
          })),
      }));

    // إذا كان الطالب مسجلاً، يتم قفل وعرض مرحلته ومساره (عربي / لغات) فقط
    let finalStagesList = stagesList;
    let studentTrack: "ar" | "en" | undefined;
    let isEnrolled = false;

    if (effectiveStudent) {
      isEnrolled = true;
      studentTrack = getStudentTrack(effectiveStudent);
      const filtered = stagesList.filter((st) => matchStudentToStage(st.stage, effectiveStudent!));
      if (filtered.length > 0) {
        finalStagesList = filtered;
      } else {
        const trackMatches = stagesList.filter((st) => st.track === studentTrack);
        if (trackMatches.length > 0) {
          finalStagesList = trackMatches;
        }
      }
    }

    res.json({
      success: true,
      stages: finalStagesList,
      isEnrolled,
      studentTrack,
      studentGrade: effectiveStudent?.grade,
      enrolledStage: finalStagesList[0]?.stage,
    });
  } catch (error) {
    next(error);
  }
});

// 2. GET /api/learning/self-assessment/eligibility - فحص أحقية الطالب والمحاولات المتاحة
router.get("/learning/self-assessment/eligibility", async (req, res, next) => {
  try {
    const student = await getApprovedStudent(req);
    if (student) {
      if (student.status !== "approved" || student.paymentStatus !== "paid") {
        res.json({
          success: true,
          isEnrolled: true,
          canTakeTest: false,
          paymentLocked: true,
          unlimited: false,
          studentId: student.id,
          studentName: student.name,
          studentPhone: student.phone,
          studentGrade: student.grade,
          message: "تم قفل التقييم الذاتي لحين سداد اشتراك الشهر الجديد وتأكيد الدفع.",
        });
        return;
      }
      const stTrack = getStudentTrack(student);
      res.json({
        success: true,
        isEnrolled: true,
        canTakeTest: true,
        unlimited: true,
        studentId: student.id,
        studentName: student.name,
        studentPhone: student.phone,
        studentGrade: student.grade,
        studentTrack: stTrack,
        governorate: (student as any).governorate || "",
        city: (student as any).city || "",
        message: "متاح لك تقييم ذاتي مجاني غير محدود كطالب مسجل بالمنصة 🎉",
      });
      return;
    }

    const codeQuery = req.query.code ? String(req.query.code).trim().toUpperCase() : "";
    if (codeQuery) {
      const [byCode] = await db
        .select()
        .from(selfAssessmentEntitlementsTable)
        .where(eq(selfAssessmentEntitlementsTable.activationCode, codeQuery))
        .limit(1);

      if (byCode) {
        const now = new Date();
        const isActive = Boolean(byCode.codeExpiresAt && byCode.codeExpiresAt > now);
        const remainingDays = isActive ? Math.ceil((byCode.codeExpiresAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        res.json({
          success: true,
          isEnrolled: false,
          hasActiveCode: isActive,
          canTakeTest: true,
          isFixedPool: !isActive,
          activationCode: byCode.activationCode,
          codeExpiresAt: byCode.codeExpiresAt,
          remainingDays,
          studentName: byCode.studentName,
          studentPhone: byCode.phone,
          isExpired: !isActive,
          message: isActive
            ? `كود قياس القدرات مفعّل بنجاح (متبقي ${remainingDays} يوم)`
            : "انتهت صلاحية هذا الكود (10 أيام). يرجى التجديد للاستمرار في فتح بنك الأسئلة بالكامل.",
        });
        return;
      }
    }

    const rawPhone = req.query.phone;
    if (!rawPhone) {
      res.json({
        success: true,
        isEnrolled: false,
        canTakeTest: true,
        isFixedPool: true,
        needPhone: true,
        message: "متاح لك تجربة اختبار 50 سؤالاً ثابتاً من الوحدة الأولى. أدخل رقم هاتفك للبدء أو تفعيل الباقة.",
      });
      return;
    }

    const phone = normalizeEgyptianPhone(rawPhone);
    if (phone.length < 10) {
      res.status(400).json({ error: "رقم الهاتف غير صحيح، يرجى كتابة رقم هاتف مصري صالح (مثال: 010...)" });
      return;
    }

    const [existingStudent] = await db
      .select({
        id: studentsTable.id,
        name: studentsTable.name,
        phone: studentsTable.phone,
        status: studentsTable.status,
        grade: studentsTable.grade,
        educationGrade: studentsTable.educationGrade,
        languageTrack: studentsTable.languageTrack,
        academicTrack: studentsTable.academicTrack,
        schoolType: studentsTable.schoolType,
        governorate: studentsTable.governorate,
        city: studentsTable.city,
      })
      .from(studentsTable)
      .where(eq(studentsTable.phone, phone))
      .limit(1);

    if (existingStudent && existingStudent.status === "approved") {
      const stTrack = getStudentTrack(existingStudent);
      res.json({
        success: true,
        isEnrolled: true,
        canTakeTest: true,
        unlimited: true,
        studentId: existingStudent.id,
        studentName: existingStudent.name,
        studentPhone: existingStudent.phone,
        studentGrade: existingStudent.grade,
        studentTrack: stTrack,
        governorate: existingStudent.governorate || "",
        city: existingStudent.city || "",
        message: "مرحباً بك! أنت مسجل كطالب في المنصة ومتاح لك تقييم ذاتي مجاني غير محدود 🎉",
      });
      return;
    }

    const [entitlement] = await db
      .select()
      .from(selfAssessmentEntitlementsTable)
      .where(eq(selfAssessmentEntitlementsTable.phone, phone))
      .limit(1);

    const now = new Date();
    const hasActiveCode = Boolean(entitlement?.activationCode && entitlement.codeExpiresAt && entitlement.codeExpiresAt > now);
    const remainingDays = hasActiveCode ? Math.ceil((entitlement!.codeExpiresAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const isPending = entitlement?.receiptStatus === "pending";
    const isExpired = Boolean(entitlement?.codeExpiresAt && entitlement.codeExpiresAt <= now);
    const hasPaidAttempts = !hasActiveCode && (entitlement?.paidAttemptsBalance ?? 0) > 0;
    const remainingAttempts = entitlement?.paidAttemptsBalance ?? 0;

    // فحص المحاولات السابقة للطالب الزائر للتأكد من منحه محاولة واحدة فقط
    const [pastSessions] = await db
      .select({ count: sql<number>`count(*)` })
      .from(selfAssessmentSessionsTable)
      .where(
        and(
          eq(selfAssessmentSessionsTable.phone, phone),
          eq(selfAssessmentSessionsTable.status, "completed")
        )
      );
    const completedSessionsCount = Number(pastSessions?.count || 0);
    const hasUsedFreeAttempt = Boolean(entitlement?.freeAttemptUsed || completedSessionsCount >= 1);
    const canTakeTest = hasActiveCode || hasPaidAttempts || !hasUsedFreeAttempt;

    res.json({
      success: true,
      isEnrolled: false,
      hasActiveCode,
      hasPaidAttempts,
      remainingAttempts,
      canTakeTest,
      hasUsedFreeAttempt,
      isFixedPool: !hasActiveCode && !hasPaidAttempts,
      activationCode: entitlement?.activationCode || null,
      codeExpiresAt: entitlement?.codeExpiresAt || null,
      remainingDays,
      receiptPending: isPending,
      studentName: entitlement?.studentName || "",
      isExpired,
      packageCost: 100,
      durationDays: 10,
      message: hasActiveCode
        ? `كود قياس القدرات مفعّل بنجاح! متبقي لك ${remainingDays} يوم لاختبار كل الوحدات والدروس بدون قيود 🎉`
        : hasPaidAttempts
        ? `متاح لك ${remainingAttempts} محاولة كاملة في بنك الأسئلة بالكامل 🎉`
        : isPending
        ? "تم استلام إيصال التحويل (100 ج) وجارٍ مراجعته من الإدارة لتفعيل باقة الـ 10 أيام الخاصة بك."
        : isExpired
        ? "انتهت صلاحية باقة الـ 10 أيام السابقة. يرجى رفع إيصال التجديد بـ 100 جنيه للمتابعة."
        : hasUsedFreeAttempt
        ? "لقد استنفدت محاولتك التجريبية المجانية الوحيدة. للحصول على وصول غير محدود لمدة 10 أيام في بنك الأسئلة بالكامل، يرجى تفعيل كود قياس القدرات (100 جنيه)."
        : "متاح لك محاولة تجريبية واحدة مجاناً (الوحدة الأولى). لتفعيل بنك الأسئلة بالكامل لجميع الوحدات لمدة 10 أيام بـ 100 جنيه، اطلب كود قياس القدرات.",
    });
    return;
  } catch (error) {
    next(error);
  }
});

// 3. POST /api/learning/self-assessment/generate - توليد اختبار التقييم الذاتي المخصص وسحب الأسئلة
router.post("/learning/self-assessment/generate", async (req, res, next) => {
  try {
    const { stage, unit, lessons, count, studentName, durationMinutes, governorate, city } = req.body;

    if (!unit || !String(unit).trim()) {
      res.status(400).json({ error: "يجب اختيار الوحدة الدراسية لتوليد الاختبار" });
      return;
    }

    const cleanedUnit = String(unit).trim();
    const rawLessons: string[] = Array.isArray(lessons)
      ? lessons.map((l: any) => String(l || "").trim()).filter(Boolean)
      : [];

    let isEnrolledStudent = false;
    let hasActiveCode = false;
    let hasPaidAttempts = false;
    let studentId: number | null = null;
    let activePhone = "";
    let activeName = String(studentName || "").trim();
    let isFreeTrialSession = false;
    let matchedStudent: any = null;

    const loggedStudent = await getApprovedStudent(req);
    if (loggedStudent) {
      if (loggedStudent.status !== "approved" || loggedStudent.paymentStatus !== "paid") {
        res.status(403).json({
          error: "تم قفل التقييم الذاتي لحين سداد اشتراك الشهر الجديد وتأكيد الدفع.",
          code: "PAYMENT_REQUIRED",
        });
        return;
      }
      isEnrolledStudent = true;
      studentId = loggedStudent.id;
      activePhone = loggedStudent.phone;
      activeName = loggedStudent.name;
      matchedStudent = loggedStudent;
    } else {
      const rawPhone = req.body.phone;
      activePhone = normalizeEgyptianPhone(rawPhone);
      if (!activePhone || activePhone.length < 10) {
        res.status(400).json({ error: "رقم الهاتف مطلوب للزوار لتفعيل محاولة الاختبار" });
        return;
      }
      if (!activeName) {
        activeName = "طالب زائر";
      }

      const [existingStudent] = await db
        .select({
          id: studentsTable.id,
          name: studentsTable.name,
          phone: studentsTable.phone,
          status: studentsTable.status,
          paymentStatus: studentsTable.paymentStatus,
          grade: studentsTable.grade,
          educationGrade: studentsTable.educationGrade,
          languageTrack: studentsTable.languageTrack,
          academicTrack: studentsTable.academicTrack,
          schoolType: studentsTable.schoolType,
        })
        .from(studentsTable)
        .where(eq(studentsTable.phone, activePhone))
        .limit(1);

      if (existingStudent && existingStudent.status === "approved") {
        if (existingStudent.paymentStatus !== "paid") {
          res.status(403).json({
            error: "تم قفل التقييم الذاتي لحين سداد اشتراك الشهر الجديد وتأكيد الدفع.",
            code: "PAYMENT_REQUIRED",
          });
          return;
        }
        isEnrolledStudent = true;
        studentId = existingStudent.id;
        activeName = existingStudent.name;
        matchedStudent = existingStudent;
      } else {
        const reqCode = req.body.activationCode ? String(req.body.activationCode).trim().toUpperCase() : "";

        const [entitlement] = await db
          .select()
          .from(selfAssessmentEntitlementsTable)
          .where(
            or(
              activePhone ? eq(selfAssessmentEntitlementsTable.phone, activePhone) : undefined,
              reqCode ? eq(selfAssessmentEntitlementsTable.activationCode, reqCode) : undefined
            )
          )
          .limit(1);

        const now = new Date();
        if (entitlement?.activationCode && entitlement.codeExpiresAt && entitlement.codeExpiresAt > now) {
          hasActiveCode = true;
        }

        // لو مفيش كود نشط بس عنده رصيد محاولات مدفوعة → خصم محاولة واحدة
        if (!hasActiveCode && (entitlement?.paidAttemptsBalance ?? 0) > 0) {
          hasPaidAttempts = true;
          await db
            .update(selfAssessmentEntitlementsTable)
            .set({
              paidAttemptsBalance: entitlement!.paidAttemptsBalance - 1,
              updatedAt: new Date(),
            })
            .where(eq(selfAssessmentEntitlementsTable.id, entitlement!.id));
        }

        // فحص حاسم للمحاولة المجانية الوحيدة للطلاب من الخارج
        if (!hasActiveCode && !hasPaidAttempts) {
          const [pastSessions] = await db
            .select({ count: sql<number>`count(*)` })
            .from(selfAssessmentSessionsTable)
            .where(
              and(
                eq(selfAssessmentSessionsTable.phone, activePhone),
                eq(selfAssessmentSessionsTable.status, "completed")
              )
            );
          const completedSessionsCount = Number(pastSessions?.count || 0);
          const alreadyUsed = Boolean(entitlement?.freeAttemptUsed || completedSessionsCount >= 1);

          if (alreadyUsed) {
            res.status(403).json({
              error: "لقد استنفدت محاولتك التجريبية المجانية الوحيدة. للحصول على وصول غير محدود لمدة 10 أيام في بنك الأسئلة بالكامل لجميع الوحدات، يرجى تفعيل كود قياس القدرات (100 جنيه).",
              requiresTopup: true,
              hasUsedFreeAttempt: true,
              canTakeTest: false,
              packageCost: 100,
              durationDays: 10,
            });
            return;
          }

          // تسجيل استخدام المحاولة المجانية فور بدء الجلسة
          if (!entitlement) {
            await db.insert(selfAssessmentEntitlementsTable).values({
              phone: activePhone,
              studentName: activeName,
              freeAttemptUsed: true,
              paidAttemptsBalance: 0,
              totalPurchasedAttempts: 0,
            });
          } else {
            await db
              .update(selfAssessmentEntitlementsTable)
              .set({ freeAttemptUsed: true, updatedAt: new Date() })
              .where(eq(selfAssessmentEntitlementsTable.id, entitlement.id));
          }
          isFreeTrialSession = true;
        }
      }
    }

    // قفل والتحقق من مرحلة ومسار الطالب المسجل (عربي / لغات)
    let enforcedStage = stage;
    if (matchedStudent) {
      const stageMatches = stage && matchStudentToStage(stage, matchedStudent);
      if (!stageMatches) {
        const allStages = await db
          .select({ stage: questionBankTable.stage })
          .from(questionBankTable)
          .groupBy(questionBankTable.stage);
        const candidate = allStages.find((s) => s.stage && matchStudentToStage(s.stage, matchedStudent));
        if (candidate?.stage) {
          enforcedStage = candidate.stage;
        }
      }
    }

    const isFullAccess = isEnrolledStudent || hasActiveCode || hasPaidAttempts;
    const targetCount = isFullAccess ? Math.max(5, Math.min(200, Number(count) || 10)) : 50;

    let query = db.select().from(questionBankTable);
    const conditions = [];

    if (enforcedStage && enforcedStage !== "all") {
      conditions.push(
        or(
          eq(questionBankTable.stage, enforcedStage),
          sql`${questionBankTable.stages}::jsonb @> ${JSON.stringify([enforcedStage])}::jsonb`
        )
      );
    }

    if (!isFullAccess) {
      // حصر الأسئلة في الوحدة الأولى فقط لغير المفعلين
      conditions.push(
        or(
          ilike(questionBankTable.unit, "%Unit 1%"),
          ilike(questionBankTable.unit, "%الاولى%"),
          ilike(questionBankTable.unit, "%الأولى%")
        )
      );
    } else {
      conditions.push(eq(questionBankTable.unit, cleanedUnit));
      if (rawLessons.length > 0 && !rawLessons.includes("الوحدة بالكامل") && !rawLessons.includes("all")) {
        conditions.push(inArray(questionBankTable.lesson, rawLessons));
      }
    }

    const availableRows = await query.where(and(...conditions));

    const seenPrompts = new Set<string>();
    const validQuestions: QuizQuestion[] = [];

    for (const r of availableRows) {
      const q = r.question;
      if (!isCompleteValidQuestion(q)) continue;

      const pKey = normalizeQuestionPrompt(q.prompt);
      if (pKey && seenPrompts.has(pKey)) continue;
      if (pKey) seenPrompts.add(pKey);

      const cleanedOptions = (q.options || []).map(cleanOptionString);
      const cIdx = typeof q.correctIndex === "number" ? q.correctIndex : 0;
      const cAns = cleanedOptions[cIdx]?.trim() || "";
      if (!cAns) continue;

      validQuestions.push({
        prompt: q.prompt.replace(/\r?\n\s*[A-Da-dأابجده]\)\s*$/, "").trim(),
        options: cleanedOptions,
        correctIndex: cIdx,
        correctAnswer: cAns,
        explanation: q.explanation || "لا يوجد شرح تفصيلي إضافي لهذا السؤال.",
        imageUrl: q.imageUrl,
        points: r.points || 1,
      });
    }

    if (validQuestions.length === 0) {
      res.status(404).json({
        error: "لم يتم العثور على أسئلة مكتملة في بنك الأسئلة للوحدة أو الدروس المحددة.",
      });
      return;
    }

    let pickedQuestions: QuizQuestion[] = [];

    if (!isFullAccess) {
      // للطالب الزائر أو غير المفعل: 50 سؤال ثابتين تماماً من الوحدة الأولى (ترتيب أبجدي ثابت يمنع التحايل)
      validQuestions.sort((a, b) => a.prompt.localeCompare(b.prompt));
      pickedQuestions = validQuestions.slice(0, 50);
    } else {
      // للمشترك أو المفعل بكود قياس القدرات: سحب ذكي بدون تكرار
      const recentPrompts = new Set<string>();
      try {
        const recentSessions = await db
          .select({ questions: selfAssessmentSessionsTable.questions })
          .from(selfAssessmentSessionsTable)
          .where(
            or(
              activePhone ? eq(selfAssessmentSessionsTable.phone, activePhone) : undefined,
              studentId ? eq(selfAssessmentSessionsTable.studentId, studentId) : undefined
            )
          )
          .orderBy(desc(selfAssessmentSessionsTable.id))
          .limit(3);

        for (const s of recentSessions) {
          const sQuestions = (s.questions as QuizQuestion[]) || [];
          for (const sq of sQuestions) {
            const norm = normalizeQuestionPrompt(sq.prompt);
            if (norm) recentPrompts.add(norm);
          }
        }
      } catch {
        // Ignore lookup failure
      }

      const freshQuestions = validQuestions.filter((q) => !recentPrompts.has(normalizeQuestionPrompt(q.prompt)));
      const freshShuffled = [...freshQuestions].sort(() => Math.random() - 0.5);

      if (freshShuffled.length >= targetCount) {
        pickedQuestions = freshShuffled.slice(0, targetCount);
      } else {
        const remainderNeeded = targetCount - freshShuffled.length;
        const seenSet = new Set(freshShuffled.map((q) => normalizeQuestionPrompt(q.prompt)));
        const otherQuestions = [...validQuestions]
          .filter((q) => !seenSet.has(normalizeQuestionPrompt(q.prompt)))
          .sort(() => Math.random() - 0.5);
        pickedQuestions = [...freshShuffled, ...otherQuestions.slice(0, remainderNeeded)];
      }
    }

    const sessionId = randomBytes(16).toString("hex");

    await db.insert(selfAssessmentSessionsTable).values({
      sessionId,
      studentId: studentId,
      phone: activePhone,
      studentName: activeName,
      governorate: governorate ? String(governorate).trim() : null,
      city: city ? String(city).trim() : null,
      stage: enforcedStage || null,
      unit: cleanedUnit,
      lessons: rawLessons,
      questionsCount: pickedQuestions.length,
      questions: pickedQuestions,
      answers: [],
      score: 0,
      totalPoints: pickedQuestions.reduce((acc, q) => acc + (q.points || 1), 0),
      percentage: 0,
      status: "in_progress",
      isGuest: !isEnrolledStudent,
      isFreeTrial: isFreeTrialSession,
    });

    const clientQuestions = pickedQuestions.map((q, idx) => ({
      index: idx,
      prompt: q.prompt,
      options: q.options,
      imageUrl: q.imageUrl,
      points: q.points || 1,
    }));

    const reqDuration = durationMinutes !== undefined ? Number(durationMinutes) : undefined;
    const finalDurationMinutes = reqDuration !== undefined && !isNaN(reqDuration) && reqDuration >= 0
      ? reqDuration
      : Math.max(10, Math.ceil(pickedQuestions.length * 1.5));

    res.json({
      success: true,
      sessionId,
      unit: cleanedUnit,
      lessons: rawLessons.length > 0 ? rawLessons : ["الوحدة كاملة"],
      questionsCount: pickedQuestions.length,
      durationMinutes: finalDurationMinutes,
      questions: clientQuestions,
      isFreeTrial: isFreeTrialSession,
      isEnrolled: isEnrolledStudent,
    });
  } catch (error) {
    next(error);
  }
});

// 4. POST /api/learning/self-assessment/submit - تسليم الاختبار والتصحيح اللحظي مع الشرح التفصيلي
router.post("/learning/self-assessment/submit", async (req, res, next) => {
  try {
    const { sessionId, answers, timeSpentSeconds } = req.body;

    if (!sessionId) {
      res.status(400).json({ error: "معرف الجلسة مطلوب" });
      return;
    }

    const [session] = await db
      .select()
      .from(selfAssessmentSessionsTable)
      .where(eq(selfAssessmentSessionsTable.sessionId, sessionId))
      .limit(1);

    if (!session) {
      res.status(404).json({ error: "جلسة التقييم غير موجودة" });
      return;
    }

    if (session.studentId) {
      const [sessionStudent] = await db
        .select({ status: studentsTable.status, paymentStatus: studentsTable.paymentStatus })
        .from(studentsTable)
        .where(eq(studentsTable.id, session.studentId))
        .limit(1);
      if (sessionStudent && (sessionStudent.status !== "approved" || sessionStudent.paymentStatus !== "paid")) {
        res.status(403).json({
          error: "تم قفل التقييم الذاتي لحين سداد اشتراك الشهر الجديد وتأكيد الدفع.",
          code: "PAYMENT_REQUIRED",
        });
        return;
      }
    }

    if (session.status === "completed" && session.details) {
      res.json({
        success: true,
        alreadyCompleted: true,
        score: session.score,
        totalPoints: session.totalPoints,
        percentage: session.percentage,
        passed: session.passed,
        timeSpentSeconds: session.timeSpentSeconds,
        details: session.details,
        review: session.details,
      });
      return;
    }

    const storedQuestions = (session.questions as QuizQuestion[]) || [];
    const studentAnswers: Record<string, number> =
      typeof answers === "object" && answers !== null ? answers : {};

    let earnedScore = 0;
    let totalPossible = 0;

    const reviewDetails = storedQuestions.map((q, idx) => {
      const qPoints = q.points || 1;
      totalPossible += qPoints;

      const selected =
        studentAnswers[String(idx)] !== undefined
          ? Number(studentAnswers[String(idx)])
          : studentAnswers[idx] !== undefined
          ? Number(studentAnswers[idx])
          : -1;

      const isCorrect = selected === q.correctIndex;
      if (isCorrect) earnedScore += qPoints;

      const studentAnsText =
        selected >= 0 && q.options && q.options[selected]
          ? q.options[selected]
          : "لم يجب الطالب";

      return {
        questionIndex: idx,
        prompt: q.prompt,
        options: q.options,
        selectedOption: selected,
        studentAnswer: studentAnsText,
        correctOption: q.correctIndex,
        correctAnswer: q.correctAnswer || q.options[q.correctIndex] || "",
        isCorrect,
        explanation: q.explanation || "لا يوجد شرح تفصيلي مضاف لهذا السؤال.",
        imageUrl: q.imageUrl,
      };
    });

    const percentage = totalPossible > 0 ? Math.round((earnedScore / totalPossible) * 100) : 0;
    const passed = percentage >= 60;
    const spentTime = Math.max(0, Number(timeSpentSeconds) || 0);

    await db
      .update(selfAssessmentSessionsTable)
      .set({
        answers: Object.values(studentAnswers) as any,
        score: earnedScore,
        totalPoints: totalPossible,
        percentage,
        passed,
        timeSpentSeconds: spentTime,
        status: "completed",
        details: reviewDetails as any,
        completedAt: new Date(),
      })
      .where(eq(selfAssessmentSessionsTable.id, session.id));

    let isEnrolledStudent = Boolean(session.studentId);
    let hasActiveCode = false;

    if (session.phone) {
      const [existingEnt] = await db
        .select()
        .from(selfAssessmentEntitlementsTable)
        .where(eq(selfAssessmentEntitlementsTable.phone, session.phone))
        .limit(1);

      const now = new Date();
      if (existingEnt?.activationCode && existingEnt.codeExpiresAt && existingEnt.codeExpiresAt > now) {
        hasActiveCode = true;
      }

      if (!isEnrolledStudent && !hasActiveCode) {
        if (existingEnt) {
          await db
            .update(selfAssessmentEntitlementsTable)
            .set({ freeAttemptUsed: true, updatedAt: now })
            .where(eq(selfAssessmentEntitlementsTable.id, existingEnt.id));
        } else {
          await db.insert(selfAssessmentEntitlementsTable).values({
            phone: session.phone,
            studentName: session.studentName || "طالب زائر",
            freeAttemptUsed: true,
            paidAttemptsBalance: 0,
            totalPurchasedAttempts: 0,
          });
        }
      }
    }

    res.json({
      success: true,
      score: earnedScore,
      totalPoints: totalPossible,
      percentage,
      passed,
      timeSpentSeconds: spentTime,
      review: reviewDetails,
      details: reviewDetails,
      isEnrolled: isEnrolledStudent,
      hasActiveCode,
      hasUsedFreeAttempt: !isEnrolledStudent && !hasActiveCode,
      packageCost: 100,
      durationDays: 10,
    });
  } catch (error) {
    next(error);
  }
});

// 5. GET /api/learning/self-assessment/session/:sessionId - جلب مراجعة جلسة سابقة
router.get("/learning/self-assessment/session/:sessionId", async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const [session] = await db
      .select()
      .from(selfAssessmentSessionsTable)
      .where(eq(selfAssessmentSessionsTable.sessionId, sessionId))
      .limit(1);

    if (!session) {
      res.status(404).json({ error: "جلسة التقييم غير موجودة" });
      return;
    }

    res.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        studentName: session.studentName,
        unit: session.unit,
        lessons: session.lessons,
        status: session.status,
        score: session.score,
        totalPoints: session.totalPoints,
        percentage: session.percentage,
        passed: session.passed,
        timeSpentSeconds: session.timeSpentSeconds,
        details: session.details,
        createdAt: session.createdAt,
        completedAt: session.completedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 6. GET /api/admin/learning/self-assessment/entitlements - قائمة باقات ومحاولات الزوار للأدمن والمساعد
router.get("/admin/learning/self-assessment/entitlements", requireAdmin, async (req, res, next) => {
  try {
    const search = req.query.search ? String(req.query.search).trim() : "";

    let query = db.select().from(selfAssessmentEntitlementsTable);
    if (search) {
      query = query.where(
        or(
          ilike(selfAssessmentEntitlementsTable.phone, `%${search}%`),
          ilike(selfAssessmentEntitlementsTable.studentName, `%${search}%`)
        )
      ) as any;
    }

    const list = await query.orderBy(desc(selfAssessmentEntitlementsTable.updatedAt)).limit(100);

    res.json({
      success: true,
      entitlements: list,
    });
  } catch (error) {
    next(error);
  }
});

// 7. POST /api/admin/learning/self-assessment/grant-attempts - تفعيل باقة 3 محاولات (50 ج.م) أو رصيد مخصص من الأدمن أو المساعد
router.post("/admin/learning/self-assessment/grant-attempts", requireAdmin, async (req, res, next) => {
  try {
    const { phone: rawPhone, studentName, attemptsCount = 3, notes } = req.body;

    const phone = normalizeEgyptianPhone(rawPhone);
    if (!phone || phone.length < 10) {
      res.status(400).json({ error: "رقم هاتف صالح مطلوب لتفعيل الباقة" });
      return;
    }

    const countToAdd = Math.max(1, Math.min(50, Number(attemptsCount) || 3));
    const adminObj = getAdminIdentity(req);
    const adminIdentity = adminObj ? `${adminObj.username} (${adminObj.role})` : "الأدمن / المساعد";

    const [existing] = await db
      .select()
      .from(selfAssessmentEntitlementsTable)
      .where(eq(selfAssessmentEntitlementsTable.phone, phone))
      .limit(1);

    let updatedRecord: any;

    if (existing) {
      const [updated] = await db
        .update(selfAssessmentEntitlementsTable)
        .set({
          paidAttemptsBalance: existing.paidAttemptsBalance + countToAdd,
          totalPurchasedAttempts: existing.totalPurchasedAttempts + countToAdd,
          studentName: studentName ? String(studentName).trim() : existing.studentName,
          lastGrantedBy: adminIdentity,
          lastGrantedAt: new Date(),
          notes: notes ? String(notes).trim() : existing.notes,
          updatedAt: new Date(),
        })
        .where(eq(selfAssessmentEntitlementsTable.id, existing.id))
        .returning();
      updatedRecord = updated;
    } else {
      const [inserted] = await db
        .insert(selfAssessmentEntitlementsTable)
        .values({
          phone,
          studentName: studentName ? String(studentName).trim() : "",
          freeAttemptUsed: true,
          paidAttemptsBalance: countToAdd,
          totalPurchasedAttempts: countToAdd,
          lastGrantedBy: adminIdentity,
          lastGrantedAt: new Date(),
          notes: notes ? String(notes).trim() : "تفعيل باقة محاولات من الإدارة",
        })
        .returning();
      updatedRecord = inserted;
    }

    await logAudit(
      req,
      "GRANT_SELF_ASSESSMENT_ATTEMPTS",
      "self_assessment_entitlements",
      String(updatedRecord.id),
      `تم شحن ${countToAdd} محاولات تقييم ذاتي لرقم ${phone} (${updatedRecord.studentName || "بدون اسم"}) بواسطة ${adminIdentity}`
    );

    res.json({
      success: true,
      message: `تم تفعيل ${countToAdd} محاولات بنجاح لرقم ${phone}. الرصيد الحالي: ${updatedRecord.paidAttemptsBalance} محاولات`,
      entitlement: updatedRecord,
    });
  } catch (error) {
    next(error);
  }
});

// 7.1 POST /api/learning/self-assessment/upload-receipt - رفع إيصال 100 ج لطلب كود قياس القدرات
router.post("/learning/self-assessment/upload-receipt", (req, res, next) => {
  paymentReceiptUpload(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message || "فشل رفع الإيصال" });
    if (!req.file) return res.status(400).json({ error: "يرجى اختيار صورة إيصال التحويل" });

    try {
      const rawPhone = req.body.phone;
      const phone = normalizeEgyptianPhone(rawPhone);
      if (!phone || phone.length < 10) {
        fs.rmSync(req.file.path, { force: true });
        return res.status(400).json({ error: "رقم هاتف صالح مطلوب (مثال: 010...)" });
      }

      const studentName = String(req.body.studentName || "").trim();
      const governorate = String(req.body.governorate || "").trim();
      const city = String(req.body.city || "").trim();

      const [existing] = await db
        .select()
        .from(selfAssessmentEntitlementsTable)
        .where(eq(selfAssessmentEntitlementsTable.phone, phone))
        .limit(1);

      if (existing) {
        await db
          .update(selfAssessmentEntitlementsTable)
          .set({
            studentName: studentName || existing.studentName,
            governorate: governorate || existing.governorate,
            city: city || existing.city,
            receiptUrl: req.file.filename,
            receiptStatus: "pending",
            receiptUploadedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(selfAssessmentEntitlementsTable.id, existing.id));
      } else {
        await db.insert(selfAssessmentEntitlementsTable).values({
          phone,
          studentName,
          governorate,
          city,
          receiptUrl: req.file.filename,
          receiptStatus: "pending",
          receiptUploadedAt: new Date(),
        });
      }

      return res.json({
        success: true,
        message: "تم استلام إيصال التحويل (100 ج) بنجاح وجارٍ مراجعته لإصدار كود التفعيل.",
      });
    } catch (error) {
      if (req.file?.path) fs.rmSync(req.file.path, { force: true });
      next(error);
      return;
    }
  });
});

// 7.2 POST /api/admin/learning/self-assessment/issue-code - تفعيل كود قياس القدرات (10 أيام أو تمديد 10 أيام عند التجديد)
router.post("/admin/learning/self-assessment/issue-code", requireAdmin, async (req, res, next) => {
  try {
    const { phone: rawPhone, customCode, days = 10 } = req.body;
    const phone = normalizeEgyptianPhone(rawPhone);
    if (!phone) { res.status(400).json({ error: "رقم الهاتف مطلوب" }); return; }

    const [existing] = await db
      .select()
      .from(selfAssessmentEntitlementsTable)
      .where(eq(selfAssessmentEntitlementsTable.phone, phone))
      .limit(1);

    const now = new Date();
    let newExpiresAt: Date;

    // لو جدد قبل آخر يوم: تمديد الصلاحية
    if (existing?.codeExpiresAt && existing.codeExpiresAt > now) {
      newExpiresAt = new Date(existing.codeExpiresAt.getTime() + days * 24 * 60 * 60 * 1000);
    } else {
      newExpiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    }

    const code = customCode
      ? String(customCode).trim().toUpperCase()
      : (existing?.activationCode || `CAP-${randomBytes(3).toString("hex").toUpperCase()}`);

    const adminObj = getAdminIdentity(req);
    const adminIdentity = adminObj ? `${adminObj.username} (${adminObj.role})` : "الإدارة";

    if (existing) {
      await db
        .update(selfAssessmentEntitlementsTable)
        .set({
          activationCode: code,
          codeExpiresAt: newExpiresAt,
          receiptStatus: "approved",
          lastGrantedBy: adminIdentity,
          lastGrantedAt: now,
          updatedAt: now,
        })
        .where(eq(selfAssessmentEntitlementsTable.id, existing.id));
    } else {
      await db.insert(selfAssessmentEntitlementsTable).values({
        phone,
        studentName: req.body.studentName || "",
        activationCode: code,
        codeExpiresAt: newExpiresAt,
        receiptStatus: "approved",
        lastGrantedBy: adminIdentity,
        lastGrantedAt: now,
      });
    }

    res.json({
      success: true,
      message: `تم تفعيل الكود بنجاح: ${code} صالح لمدة 10 أيام حتى ${newExpiresAt.toLocaleDateString("ar-EG")}`,
      code,
      expiresAt: newExpiresAt,
    });
  } catch (error) {
    next(error);
  }
});

// 7.3 GET /api/admin/learning/self-assessment/receipt-file/:filename - معاينة إيصال التحويل للأدمن
router.get("/admin/learning/self-assessment/receipt-file/:filename", requireAdmin, (req, res) => {
  const filename = path.basename(req.params.filename as string);
  const filePath = path.join(paymentReceiptsDir, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("الصورة غير موجودة");
  }
  return res.sendFile(filePath);
});

// 7.4 GET /api/learning/self-assessment/my-history - سجل الاختبارات السابقة والأخطاء ومستوى التقدم للطالب
router.get("/learning/self-assessment/my-history", async (req, res, next) => {
  try {
    const student = await getApprovedStudent(req);
    const rawPhone = student?.phone || (req.query.phone as string);
    const phone = rawPhone ? normalizeEgyptianPhone(rawPhone) : "";

    if (!student && !phone) {
      return res.status(400).json({ error: "رقم الهاتف مطلوب لعرض السجل" });
    }

    const sessions = await db
      .select({
        sessionId: selfAssessmentSessionsTable.sessionId,
        unit: selfAssessmentSessionsTable.unit,
        lessons: selfAssessmentSessionsTable.lessons,
        questionsCount: selfAssessmentSessionsTable.questionsCount,
        score: selfAssessmentSessionsTable.score,
        totalPoints: selfAssessmentSessionsTable.totalPoints,
        percentage: selfAssessmentSessionsTable.percentage,
        passed: selfAssessmentSessionsTable.passed,
        createdAt: selfAssessmentSessionsTable.createdAt,
        status: selfAssessmentSessionsTable.status,
        details: selfAssessmentSessionsTable.details,
      })
      .from(selfAssessmentSessionsTable)
      .where(
        or(
          student ? eq(selfAssessmentSessionsTable.studentId, student.id) : undefined,
          phone ? eq(selfAssessmentSessionsTable.phone, phone) : undefined
        )
      )
      .orderBy(desc(selfAssessmentSessionsTable.id))
      .limit(30);

    return res.json({ success: true, sessions });
  } catch (error) {
    next(error);
    return;
  }
});

// 8. GET /api/admin/learning/self-assessment/sessions - سجل ونتائج اختبارات الطلاب وإحصائيات التقييم الذاتي للأدمن
router.get("/admin/learning/self-assessment/sessions", requireAdmin, async (req, res, next) => {
  try {
    const search = req.query.search ? String(req.query.search).trim() : "";
    const status = req.query.status ? String(req.query.status).trim() : "completed";

    let conditions = [];
    if (status && status !== "all") {
      conditions.push(eq(selfAssessmentSessionsTable.status, status));
    }
    if (search) {
      conditions.push(
        or(
          ilike(selfAssessmentSessionsTable.phone, `%${search}%`),
          ilike(selfAssessmentSessionsTable.studentName, `%${search}%`)
        )
      );
    }

    const sessionsQuery = db
      .select({
        id: selfAssessmentSessionsTable.id,
        sessionId: selfAssessmentSessionsTable.sessionId,
        studentId: selfAssessmentSessionsTable.studentId,
        studentName: selfAssessmentSessionsTable.studentName,
        phone: selfAssessmentSessionsTable.phone,
        governorate: selfAssessmentSessionsTable.governorate,
        city: selfAssessmentSessionsTable.city,
        stage: selfAssessmentSessionsTable.stage,
        unit: selfAssessmentSessionsTable.unit,
        lessons: selfAssessmentSessionsTable.lessons,
        questionsCount: selfAssessmentSessionsTable.questionsCount,
        score: selfAssessmentSessionsTable.score,
        totalPoints: selfAssessmentSessionsTable.totalPoints,
        percentage: selfAssessmentSessionsTable.percentage,
        passed: selfAssessmentSessionsTable.passed,
        timeSpentSeconds: selfAssessmentSessionsTable.timeSpentSeconds,
        status: selfAssessmentSessionsTable.status,
        details: selfAssessmentSessionsTable.details,
        isGuest: selfAssessmentSessionsTable.isGuest,
        createdAt: selfAssessmentSessionsTable.createdAt,
        completedAt: selfAssessmentSessionsTable.completedAt,
      })
      .from(selfAssessmentSessionsTable);

    const rawSessions = await (conditions.length ? sessionsQuery.where(and(...conditions)) : sessionsQuery)
      .orderBy(desc(selfAssessmentSessionsTable.id))
      .limit(200);

    const studentIds = rawSessions
      .map((s) => s.studentId)
      .filter((id): id is number => typeof id === "number" && id > 0);
    const phones = rawSessions
      .map((s) => s.phone)
      .filter((p): p is string => Boolean(p && p.trim()));

    const studentConditions = [];
    if (studentIds.length) studentConditions.push(inArray(studentsTable.id, studentIds));
    if (phones.length) studentConditions.push(inArray(studentsTable.phone, phones));

    const enrolledStudents = studentConditions.length
      ? await db
          .select({
            id: studentsTable.id,
            phone: studentsTable.phone,
            name: studentsTable.name,
            status: studentsTable.status,
          })
          .from(studentsTable)
          .where(or(...studentConditions))
      : [];

    const enrolledIdSet = new Set(enrolledStudents.map((s) => s.id));
    const enrolledPhoneMap = new Map(enrolledStudents.map((s) => [s.phone, s]));

    const sessions = rawSessions.map((sess) => {
      const studentByPhone = sess.phone ? enrolledPhoneMap.get(sess.phone) : undefined;
      const isEnrolled = Boolean(
        !sess.isGuest ||
        (sess.studentId && enrolledIdSet.has(sess.studentId)) ||
        (sess.studentId && sess.studentId > 0) ||
        studentByPhone
      );
      const studentName = (sess.studentName && sess.studentName !== "طالب زائر" ? sess.studentName : "") || studentByPhone?.name || sess.studentName || "طالب";
      const rawDetails = (sess.details as any[]) || [];
      const details = rawDetails.map((d: any, dIdx: number) => {
        const studentAnswer =
          d.studentAnswer && d.studentAnswer !== "لم يجب الطالب"
            ? d.studentAnswer
            : d.options && typeof d.selectedOption === "number" && d.selectedOption >= 0 && d.options[d.selectedOption]
            ? d.options[d.selectedOption]
            : d.selectedOption === -1
            ? "لم يجب الطالب"
            : d.studentAnswer || "لم يجب الطالب";

        const correctAnswer =
          d.correctAnswer ||
          (d.options && typeof d.correctOption === "number" && d.options[d.correctOption]
            ? d.options[d.correctOption]
            : "");

        return {
          ...d,
          questionId: d.questionId || (d.questionIndex !== undefined ? d.questionIndex + 1 : dIdx + 1),
          studentAnswer,
          correctAnswer,
        };
      });

      return {
        ...sess,
        studentName,
        isEnrolledStudent: isEnrolled,
        reviewCount: details.length || sess.questionsCount || 0,
        details,
      };
    });

    // حساب الإحصائيات العامة
    const allCompleted = await db
      .select({
        percentage: selfAssessmentSessionsTable.percentage,
        passed: selfAssessmentSessionsTable.passed,
        phone: selfAssessmentSessionsTable.phone,
      })
      .from(selfAssessmentSessionsTable)
      .where(eq(selfAssessmentSessionsTable.status, "completed"));

    const totalCompleted = allCompleted.length;
    const uniquePhones = new Set(allCompleted.map((s) => s.phone).filter(Boolean));
    const passedCount = allCompleted.filter((s) => s.passed).length;
    const sumPercentage = allCompleted.reduce((acc, s) => acc + (s.percentage || 0), 0);

    const stats = {
      totalCompleted,
      uniqueStudents: uniquePhones.size,
      averageScore: totalCompleted > 0 ? Math.round(sumPercentage / totalCompleted) : 0,
      passRate: totalCompleted > 0 ? Math.round((passedCount / totalCompleted) * 100) : 0,
    };

    res.json({
      success: true,
      sessions,
      stats,
    });
  } catch (error) {
    next(error);
  }
});

// 9. GET /api/admin/learning/self-assessment/curriculum - جلب الهيكل الحالي للوحدات والدروس وعدد الأسئلة للأدمن
router.get("/admin/learning/self-assessment/curriculum", requireAdmin, async (req, res, next) => {
  try {
    const rows = await db
      .select({
        stage: questionBankTable.stage,
        unit: questionBankTable.unit,
        lesson: questionBankTable.lesson,
        count: sql<number>`count(*)::int`,
      })
      .from(questionBankTable)
      .groupBy(questionBankTable.stage, questionBankTable.unit, questionBankTable.lesson)
      .orderBy(questionBankTable.stage, questionBankTable.unit, questionBankTable.lesson);

    const structure: Record<
      string,
      {
        stage: string;
        track: "ar" | "en";
        totalQuestions: number;
        units: Record<
          string,
          {
            unit: string;
            totalQuestions: number;
            lessons: Array<{ lesson: string; count: number }>;
          }
        >;
      }
    > = {};

    for (const r of rows) {
      if (!r.stage || !r.unit) continue;
      const stage = r.stage.trim();
      const unit = r.unit.trim();
      const lesson = (r.lesson || "شامل الوحدة").trim();
      const count = Number(r.count) || 0;
      const isEnglish = stage.toLowerCase().includes("لغات") || stage.toLowerCase().includes("languages");

      if (!structure[stage]) {
        structure[stage] = { stage, track: isEnglish ? "en" : "ar", totalQuestions: 0, units: {} };
      }
      if (!structure[stage].units[unit]) {
        structure[stage].units[unit] = { unit, totalQuestions: 0, lessons: [] };
      }
      structure[stage].totalQuestions += count;
      structure[stage].units[unit].totalQuestions += count;
      structure[stage].units[unit].lessons.push({ lesson, count });
    }

    const result = Object.values(structure)
      .sort((a, b) => (a.track === "ar" ? -1 : 1))
      .map((st) => ({
        stage: st.stage,
        track: st.track,
        totalQuestions: st.totalQuestions,
        units: Object.values(st.units)
          .sort((a, b) => parseUnitSortOrder(a.unit) - parseUnitSortOrder(b.unit))
          .map((u) => ({
            ...u,
            lessons: u.lessons.sort((a, b) => parseLessonSortOrder(a.lesson) - parseLessonSortOrder(b.lesson)),
          })),
      }));

    res.json({ success: true, curriculum: result });
  } catch (error) {
    next(error);
  }
});

// 10. POST /api/admin/learning/self-assessment/curriculum/rename-unit - تعديل اسم وحدة دراسية
router.post("/admin/learning/self-assessment/curriculum/rename-unit", requireAdmin, async (req, res, next) => {
  try {
    const { stage, oldUnit, newUnit } = req.body;
    if (!stage || !oldUnit || !newUnit || !String(newUnit).trim()) {
      res.status(400).json({ error: "بيانات تعديل اسم الوحدة غير مكتملة" });
      return;
    }

    const trimmedNewUnit = String(newUnit).trim();
    await db
      .update(questionBankTable)
      .set({ unit: trimmedNewUnit })
      .where(
        and(
          eq(questionBankTable.stage, String(stage).trim()),
          eq(questionBankTable.unit, String(oldUnit).trim())
        )
      );

    res.json({ success: true, message: `تم تحديث اسم الوحدة إلى "${trimmedNewUnit}" بنجاح.` });
  } catch (error) {
    next(error);
  }
});

// 11. POST /api/admin/learning/self-assessment/curriculum/rename-lesson - تعديل اسم درس أو نقله لوحدة أخرى
router.post("/admin/learning/self-assessment/curriculum/rename-lesson", requireAdmin, async (req, res, next) => {
  try {
    const { stage, unit, oldLesson, newLesson, targetUnit } = req.body;
    if (!stage || !unit || !oldLesson || !newLesson || !String(newLesson).trim()) {
      res.status(400).json({ error: "بيانات تعديل الدرس غير مكتملة" });
      return;
    }

    const finalUnit = targetUnit && String(targetUnit).trim() ? String(targetUnit).trim() : String(unit).trim();
    const finalLesson = String(newLesson).trim();

    await db
      .update(questionBankTable)
      .set({ lesson: finalLesson, unit: finalUnit })
      .where(
        and(
          eq(questionBankTable.stage, String(stage).trim()),
          eq(questionBankTable.unit, String(unit).trim()),
          eq(questionBankTable.lesson, String(oldLesson).trim())
        )
      );

    res.json({ success: true, message: `تم تحديث بيانات الدرس بنجاح.` });
  } catch (error) {
    next(error);
  }
});


export default router;
