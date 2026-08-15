import React, { useRef } from "react";
import {
  FileText,
  Upload,
  Search,
  Loader2,
  Eye,
  FileCheck2,
  AlertCircle,
  X,
  Edit2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACADEMIC_TRACKS, getTrack } from "@/data/academic";

interface FileItem {
  id: number;
  courseId?: number | null;
  title: string;
  category: string;
  stage?: string | null;
  stages?: string[];
  targetType?: "stages" | "videos";
  videoIds?: number[];
  subject?: string | null;
  tags?: string[];
  order?: number;
  originalName: string;
  description?: string | null;
  mimeType?: string;
  sizeBytes: number;
  isPublished: boolean;
  createdAt?: string;
}

interface VideoOption {
  id: number;
  courseId?: number | null;
  title: string;
  category: string;
  stage?: string | null;
  stages?: string[];
}

export interface FilesTabProps {
  files: FileItem[];
  learningCourses: Array<{ id: number; title: string; category: string; stages?: string[] }>;
  videoOptions: VideoOption[];
  fileForm: {
    title: string;
    stage: string;
    category: string;
    courseId: string;
    subject: string;
    tags: string;
    order: number;
    description: string;
    file: File | null;
    targetType: "stages" | "videos";
    stages: string[];
    videoIds: string[];
  };
  setFileForm: React.Dispatch<React.SetStateAction<any>>;
  uploadFile: (isPublished: boolean) => Promise<void>;
  isUploadingFile: boolean;
  uploadProgress: number;
  fileSearch: string;
  setFileSearch: (val: string) => void;
  fileCourseFilter: string;
  setFileCourseFilter: (val: string) => void;
  fileStageFilter: string;
  setFileStageFilter: (val: string) => void;
  fileStatusFilter: string;
  setFileStatusFilter: (val: string) => void;
  filePage: number;
  setFilePage: (val: number | ((prev: number) => number)) => void;
  selectLearningFile: (file: File | null) => Promise<void>;
  isFileDragging: boolean;
  setIsFileDragging: (val: boolean) => void;
  fileValidationError: string;
  setFileValidationError: (val: string) => void;
  fileOptimization: { before: number; after: number } | null;
  setFileOptimization: (val: any) => void;
  showFilePreview: boolean;
  setShowFilePreview: React.Dispatch<React.SetStateAction<boolean>>;
  lessonSearch: string;
  setLessonSearch: (val: string) => void;
  lessonCourseFilter: string;
  setLessonCourseFilter: (val: string) => void;
  lessonStageFilter: string;
  setLessonStageFilter: (val: string) => void;
  fileStageSearch: string;
  setFileStageSearch: (val: string) => void;
  deleteFile: (id: number) => Promise<void>;
  toggleFile: (file: FileItem) => Promise<void>;
  editFile: (file: FileItem) => Promise<void>;
  setPreviewFile: (file: FileItem | null) => void;
  LocalFilePreview: React.ComponentType<{ file: File | null }>;
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block space-y-1.5 text-right">
    <span className="text-xs font-black text-slate-700">{label}</span>
    {children}
  </label>
);

export const FilesTab: React.FC<FilesTabProps> = ({
  files,
  learningCourses,
  videoOptions,
  fileForm,
  setFileForm,
  uploadFile,
  isUploadingFile,
  uploadProgress,
  fileSearch,
  setFileSearch,
  fileCourseFilter,
  setFileCourseFilter,
  fileStageFilter,
  setFileStageFilter,
  fileStatusFilter,
  setFileStatusFilter,
  filePage,
  setFilePage,
  selectLearningFile,
  isFileDragging,
  setIsFileDragging,
  fileValidationError,
  setFileValidationError,
  fileOptimization,
  setFileOptimization,
  showFilePreview,
  setShowFilePreview,
  lessonSearch,
  setLessonSearch,
  lessonCourseFilter,
  setLessonCourseFilter,
  lessonStageFilter,
  setLessonStageFilter,
  fileStageSearch,
  setFileStageSearch,
  deleteFile,
  toggleFile,
  editFile,
  setPreviewFile,
  LocalFilePreview,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedFileTrack = getTrack(fileForm.category);
  const availableFileStages = selectedFileTrack ? selectedFileTrack.stages : [];

  const availableCategories = Array.from(
    new Set(
      files.map((file) => file.category).filter(Boolean),
    ),
  );

  const filteredFiles = files.filter((file) => {
    const matchesSearch =
      !fileSearch ||
      file.title.toLowerCase().includes(fileSearch.toLowerCase()) ||
      file.originalName.toLowerCase().includes(fileSearch.toLowerCase());
    const matchesCourse =
      fileCourseFilter === "all" || file.category === fileCourseFilter;
    const fileStages = file.stages?.length ? file.stages : [file.stage || ""];
    const matchesStage =
      fileStageFilter === "all" || fileStages.includes(fileStageFilter);
    const matchesStatus =
      fileStatusFilter === "all" ||
      (fileStatusFilter === "published" && file.isPublished) ||
      (fileStatusFilter === "draft" && !file.isPublished);
    return matchesSearch && matchesCourse && matchesStage && matchesStatus;
  });

  const pageSize = 10;
  const totalPages = Math.ceil(filteredFiles.length / pageSize) || 1;
  const visibleFiles = filteredFiles.slice(
    (filePage - 1) * pageSize,
    filePage * pageSize,
  );

  const selectedLessonCourse = learningCourses.find(
    (c) => String(c.id) === lessonCourseFilter,
  );
  const availableLessonStages = selectedLessonCourse?.stages || [];

  const filteredLessonOptions = videoOptions.filter((video) => {
    const matchesCourse =
      !lessonCourseFilter || String(video.courseId) === lessonCourseFilter;
    const videoStages = video.stages?.length ? video.stages : [video.stage || ""];
    const matchesStage =
      !lessonStageFilter || videoStages.includes(lessonStageFilter);
    const matchesSearch =
      !lessonSearch ||
      video.title.toLowerCase().includes(lessonSearch.toLowerCase());
    return matchesCourse && matchesStage && matchesSearch;
  });

  const visibleFileStageGroups = selectedFileTrack
    ? [
        {
          title: selectedFileTrack.title,
          stages: availableFileStages.filter(
            (s) =>
              !fileStageSearch ||
              s.toLowerCase().includes(fileStageSearch.toLowerCase()),
          ),
        },
      ].filter((g) => g.stages.length > 0)
    : [];

  const fileDestinationReady =
    fileForm.targetType === "videos"
      ? fileForm.videoIds.length > 0
      : Boolean(selectedFileTrack) && fileForm.stages.length > 0;

  const destinationSummary =
    fileForm.targetType === "videos"
      ? fileForm.videoIds.length > 0
        ? `مرتبط بـ ${fileForm.videoIds.length} درس`
        : "اختر الدروس أولاً"
      : selectedFileTrack && fileForm.stages.length > 0
      ? `${selectedFileTrack.title} ← ${fileForm.stages.join("، ")}`
      : "اختر القسم والمراحل أولاً";

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-4xl">
        <form
          id="file-upload-form"
          onSubmit={(event) => {
            event.preventDefault();
            void uploadFile(true);
          }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"
        >
          <div className="mb-6 border-b border-slate-100 pb-5">
            <h3 className="text-xl font-black text-slate-900">
              رفع ملف تعليمي جديد
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              حدد مكان الظهور، اختر الطلاب أو الدروس، ثم أضف الملف وانشره.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5">
              <span className="mb-1 block text-xs font-black text-primary">الخطوة 1</span>
              <span className="mb-3 block text-base font-black text-slate-900">أين سيظهر الملف؟</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  ['stages', 'لطلاب كورس ومراحل', 'يظهر في مكتبة الملفات للطلاب المحددين'],
                  ['videos', 'مرفق داخل درس', 'يظهر مع الفيديو داخل صفحة الدرس'],
                ].map(([value, label, description]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setFileForm({
                        ...fileForm,
                        targetType: value as "stages" | "videos",
                        stages: [],
                        stage: "",
                        videoIds: [],
                        ...(value === "videos" ? { category: "", courseId: "" } : {}),
                      })
                    }
                    className={`rounded-xl border p-4 text-right transition ${
                      fileForm.targetType === value
                        ? 'border-primary bg-white text-primary ring-2 ring-primary/10'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <strong className="block text-sm">{label}</strong>
                    <span className="mt-1 block text-xs font-normal text-slate-500">{description}</span>
                  </button>
                ))}
              </div>
            </div>

            {fileForm.targetType === "videos" && (
              <div className="md:col-span-2">
                <span className="mb-1 block text-xs font-black text-primary">الخطوة 2</span>
                <span className="mb-3 block text-base font-black text-slate-900">اختر الدروس المرتبطة</span>
                <div className="mb-3 grid gap-2 sm:grid-cols-3">
                  <select
                    value={lessonCourseFilter}
                    onChange={(event) => {
                      setLessonCourseFilter(event.target.value);
                      setLessonStageFilter("");
                    }}
                    className="input-admin min-h-11"
                  >
                    <option value="">كل الكورسات</option>
                    {learningCourses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                  <select
                    value={lessonStageFilter}
                    onChange={(event) => setLessonStageFilter(event.target.value)}
                    disabled={!lessonCourseFilter}
                    className="input-admin min-h-11 disabled:bg-slate-100"
                  >
                    <option value="">كل المراحل</option>
                    {availableLessonStages.map((stage) => (
                      <option key={stage} value={stage}>
                        {stage}
                      </option>
                    ))}
                  </select>
                  <label className="relative">
                    <Search className="absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      value={lessonSearch}
                      onChange={(event) => setLessonSearch(event.target.value)}
                      placeholder="ابحث عن درس..."
                      className="input-admin min-h-11 pr-9"
                    />
                  </label>
                </div>
                <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3">
                  {filteredLessonOptions.map((video) => {
                    const id = String(video.id);
                    const checked = fileForm.videoIds.includes(id);
                    return (
                      <label
                        key={video.id}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-100 p-3 hover:bg-slate-50"
                      >
                        <input
                          className="mt-1"
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const videoIds = checked
                              ? fileForm.videoIds.filter((item) => item !== id)
                              : [...fileForm.videoIds, id];
                            const firstVideo = videoOptions.find((item) =>
                              videoIds.includes(String(item.id)),
                            );
                            setFileForm({
                              ...fileForm,
                              videoIds,
                              category: firstVideo?.category || "",
                            });
                          }}
                        />
                        <span className="min-w-0">
                          <strong className="block truncate text-sm">{video.title}</strong>
                          <small className="text-slate-500">
                            {video.category}
                            {video.stage ? ` · ${video.stage}` : ""}
                          </small>
                        </span>
                      </label>
                    );
                  })}
                  {!filteredLessonOptions.length && (
                    <p className="py-5 text-center text-sm text-slate-500">
                      لا توجد دروس مطابقة للفلاتر الحالية.
                    </p>
                  )}
                </div>
                {fileForm.videoIds.length > 0 && (
                  <p className="mt-2 text-xs font-bold text-primary">
                    تم اختيار {fileForm.videoIds.length}{" "}
                    {fileForm.videoIds.length === 1 ? "درس" : "دروس"}
                  </p>
                )}
              </div>
            )}

            {fileForm.targetType === "stages" && (
              <>
                <div className="md:col-span-2">
                  <span className="block text-xs font-black text-primary">الخطوة 2</span>
                  <span className="block text-base font-black text-slate-900">حدد الكورس والقسم والمراحل</span>
                  <p className="mt-1 text-xs text-slate-500">اختر الكورس التابع له الملف ثم حدد مراحل القسم الدراسي.</p>
                </div>
                <div className="md:col-span-2">
                  <Field label="الكورس التابع له الملف 📚">
                    <select
                      value={fileForm.courseId}
                      onChange={(e) => {
                        setFileForm({
                          ...fileForm,
                          courseId: e.target.value,
                        });
                      }}
                      className="input-admin min-h-12 border-slate-300 focus:border-primary font-bold text-sm"
                    >
                      <option value="">-- اختياري: اختر الكورس التابع له الملف --</option>
                      {learningCourses.map((c) => (
                        <option key={c.id} value={c.id}>
                          📚 {c.title}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="md:col-span-2 grid gap-2 sm:grid-cols-3">
                  {ACADEMIC_TRACKS.map((track) => {
                    const selected = selectedFileTrack?.id === track.id;
                    return (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() =>
                          setFileForm({
                            ...fileForm,
                            category: track.id,
                            courseId: "",
                            stage: "",
                            stages: [],
                          })
                        }
                        className={`rounded-xl border p-4 text-right transition ${
                          selected
                            ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/10"
                            : "border-slate-200 bg-white text-slate-700 hover:border-primary/50"
                        }`}
                      >
                        <strong className="block text-sm">{track.title}</strong>
                        <span className="mt-1 block text-xs font-normal text-slate-500">
                          {track.eyebrow}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="md:col-span-2">
                  <Field label="المراحل التي سيظهر لها الملف">
                    <div className="min-h-12 rounded-xl border border-slate-300 bg-white p-3">
                      {!selectedFileTrack && (
                        <span className="p-1 text-sm text-slate-400">اختر القسم التعليمي أولًا</span>
                      )}
                      {selectedFileTrack && availableFileStages.length > 5 && (
                        <div className="relative mb-3">
                          <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                          <input
                            value={fileStageSearch}
                            onChange={(event) => setFileStageSearch(event.target.value)}
                            placeholder="ابحث داخل مراحل القسم..."
                            className="input-admin min-h-10 pr-9 text-xs"
                          />
                        </div>
                      )}
                      {fileForm.stages.length > 0 && (
                        <div className="mb-3 flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-3">
                          <span className="ml-1 text-[11px] font-bold text-slate-500">
                            المحدد ({fileForm.stages.length}):
                          </span>
                          {fileForm.stages.slice(0, 4).map((stage) => (
                            <span
                              key={stage}
                              className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700"
                            >
                              {stage}
                            </span>
                          ))}
                          {fileForm.stages.length > 4 && (
                            <span className="text-[11px] font-bold text-slate-500">
                              +{fileForm.stages.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {selectedFileTrack && (
                          <button
                            type="button"
                            onClick={() => {
                              const allSelected = availableFileStages.every((stage) =>
                                fileForm.stages.includes(stage),
                              );
                              const stages = allSelected ? [] : [...availableFileStages];
                              setFileForm({ ...fileForm, stages, stage: stages[0] || "" });
                            }}
                            className="rounded-lg border border-dashed border-primary px-3 py-2 text-xs font-black text-primary"
                          >
                            {availableFileStages.every((stage) => fileForm.stages.includes(stage))
                              ? "إلغاء تحديد الكل"
                              : "تحديد كل مراحل القسم"}
                          </button>
                        )}
                        {visibleFileStageGroups.map((group) => (
                          <details key={group.title} open className="w-full rounded-xl bg-slate-50 p-3">
                            <summary className="mb-2 cursor-pointer text-xs font-bold text-slate-800">
                              {group.title}{" "}
                              <span className="font-normal text-slate-400">
                                ({group.stages.length})
                              </span>
                            </summary>
                            <div className="flex flex-wrap gap-2">
                              {group.stages.map((stage) => {
                                const checked = fileForm.stages.includes(stage);
                                return (
                                  <button
                                    key={stage}
                                    type="button"
                                    onClick={() => {
                                      const stages = checked
                                        ? fileForm.stages.filter((item) => item !== stage)
                                        : [...fileForm.stages, stage];
                                      setFileForm({ ...fileForm, stages, stage: stages[0] || "" });
                                    }}
                                    className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
                                      checked
                                        ? "border-primary bg-primary text-white"
                                        : "border-slate-200 bg-white text-slate-600 hover:border-primary"
                                    }`}
                                  >
                                    {stage.replace(`${group.title} · `, "")}
                                  </button>
                                );
                              })}
                            </div>
                          </details>
                        ))}
                        {selectedFileTrack && visibleFileStageGroups.length === 0 && (
                          <p className="w-full py-3 text-center text-xs text-slate-500">
                            لا توجد مرحلة مطابقة للبحث
                          </p>
                        )}
                      </div>
                    </div>
                  </Field>
                </div>
              </>
            )}

            <details className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <summary className="cursor-pointer select-none text-sm font-bold text-slate-700">
                تفاصيل إضافية (اختياري)
              </summary>
              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <Field label="المادة">
                  <input
                    value={fileForm.subject}
                    onChange={(e) =>
                      setFileForm({ ...fileForm, subject: e.target.value })
                    }
                    placeholder="مثال: البرمجة وعلوم الحاسب"
                    className="input-admin min-h-12 border-slate-300 focus:border-primary"
                  />
                </Field>
                <Field label="الكلمات المفتاحية">
                  <input
                    value={fileForm.tags}
                    onChange={(e) =>
                      setFileForm({ ...fileForm, tags: e.target.value })
                    }
                    placeholder="PDF، مراجعة، تمارين"
                    className="input-admin min-h-12 border-slate-300 focus:border-primary"
                  />
                  <p className="text-xs text-slate-500">
                    افصل بين الكلمات بفاصلة.
                  </p>
                </Field>
                <div className="md:col-span-2">
                  <Field label="وصف الملف">
                    <textarea
                      value={fileForm.description}
                      onChange={(e) =>
                        setFileForm({
                          ...fileForm,
                          description: e.target.value,
                        })
                      }
                      placeholder="اشرح محتوى الملف وطريقة استخدامه للطالب"
                      className="input-admin min-h-28 resize-none border-slate-300 focus:border-primary"
                    />
                  </Field>
                </div>
              </div>
            </details>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 p-4 md:p-5">
            <span className="mb-1 block text-xs font-black text-primary">الخطوة 3</span>
            <label className="mb-3 block text-base font-black text-slate-900">
              اختر الملف واكتب اسمه
            </label>
            <div
              onDragEnter={(event) => {
                event.preventDefault();
                setIsFileDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => {
                event.preventDefault();
                if (event.currentTarget === event.target) setIsFileDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                selectLearningFile(event.dataTransfer.files?.[0] || null);
              }}
              className={`relative min-h-44 rounded-2xl border-2 border-dashed p-6 text-center transition ${
                isFileDragging
                  ? "scale-[1.01] border-primary bg-blue-50 ring-4 ring-blue-100"
                  : fileForm.file
                  ? "border-emerald-300 bg-emerald-50/40"
                  : "border-slate-300 bg-slate-50 hover:border-primary hover:bg-blue-50/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.zip,.ppt,.pptx,.txt,image/*"
                onChange={(e) => {
                  selectLearningFile(e.target.files?.[0] || null);
                  e.target.value = "";
                }}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label="اختيار ملف تعليمي"
              />
              <span
                className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl ${
                  fileForm.file ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-primary"
                }`}
              >
                {fileForm.file ? <FileCheck2 className="h-7 w-7" /> : <Upload className="h-7 w-7" />}
              </span>
              <strong className="mt-3 block text-sm text-slate-800">
                {fileForm.file
                  ? "تم اختيار الملف — أكمل مكان ظهوره بالأسفل"
                  : isFileDragging
                  ? "اترك الملف هنا"
                  : "اضغط لاختيار الملف أو اسحبه هنا"}
              </strong>
              <span className="mt-1 block text-xs text-slate-500">
                PDF, DOCX, ZIP, PPTX — بحد أقصى 150MB
              </span>
            </div>
            <div className="mt-4">
              <Field label="الاسم الذي سيظهر للطالب">
                <input
                  required
                  value={fileForm.title}
                  onChange={(event) => setFileForm({ ...fileForm, title: event.target.value })}
                  placeholder="مثال: ملخص الدرس الثالث"
                  className="input-admin min-h-12 border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
                <p className="text-xs text-slate-500">يُكتب تلقائيًا من اسم الملف ويمكنك تعديله.</p>
              </Field>
            </div>
            {fileValidationError && (
              <p
                role="alert"
                className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                {fileValidationError}
              </p>
            )}
            {fileOptimization && (
              <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                تم تحسين الصورة تلقائيًا مع الحفاظ على الجودة:{" "}
                {(fileOptimization.before / 1024 / 1024).toFixed(1)} MB ←{" "}
                {(fileOptimization.after / 1024 / 1024).toFixed(1)} MB
              </p>
            )}
            {fileForm.file && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-sm">
                      {fileForm.file.name}
                    </strong>
                    <span className="text-xs text-slate-500">
                      {(fileForm.file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFileForm({ ...fileForm, file: null });
                      setFileValidationError("");
                      setFileOptimization(null);
                      setShowFilePreview(false);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="relative z-10 rounded-lg p-2 text-red-600 hover:bg-red-50"
                    aria-label="إزالة الملف"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {isUploadingFile && (
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-xs">
                      <span>جاري الرفع</span>
                      <strong>{uploadProgress}%</strong>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                {showFilePreview && (
                  <div className="relative z-10 mt-4">
                    <LocalFilePreview file={fileForm.file} />
                  </div>
                )}
              </div>
            )}
          </div>

          <div
            className={`mt-5 rounded-xl border p-4 text-sm ${
              fileDestinationReady
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            <strong className="block">مكان ظهور الملف</strong>
            <span>{destinationSummary}</span>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                disabled={isUploadingFile}
                onClick={() => void uploadFile(false)}
                className="h-11"
              >
                حفظ كمسودة
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!fileForm.file}
                onClick={() => setShowFilePreview((value) => !value)}
                className="h-11"
              >
                <Eye className="h-4 w-4" />
                {showFilePreview ? "إخفاء المعاينة" : "معاينة"}
              </Button>
            </div>
            <Button
              type="submit"
              disabled={isUploadingFile}
              className="h-11 px-6"
            >
              {isUploadingFile ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الرفع {uploadProgress}%
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  رفع ونشر الملف
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900">
                الملفات التعليمية الأخيرة
              </h3>
              <p className="text-sm text-slate-500">
                {filteredFiles.length} ملف مطابق
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <label className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  value={fileSearch}
                  onChange={(e) => setFileSearch(e.target.value)}
                  placeholder="ابحث عن ملف..."
                  className="input-admin min-h-10 pr-9"
                />
              </label>
              <select
                value={fileCourseFilter}
                onChange={(e) => setFileCourseFilter(e.target.value)}
                className="input-admin min-h-10"
              >
                <option value="all">كل الأقسام والكورسات</option>
                {availableCategories.map((category) => (
                  <option key={category} value={category}>
                    {getTrack(category)?.title || category}
                  </option>
                ))}
              </select>
              <select
                value={fileStageFilter}
                onChange={(e) => setFileStageFilter(e.target.value)}
                className="input-admin min-h-10"
              >
                <option value="all">كل المراحل</option>
                {Array.from(
                  new Set(
                    files.flatMap((file) =>
                      file.stages?.length ? file.stages : [file.stage || "غير محدد"],
                    ),
                  ),
                ).map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
              <select
                value={fileStatusFilter}
                onChange={(e) => setFileStatusFilter(e.target.value)}
                className="input-admin min-h-10"
              >
                <option value="all">كل الحالات</option>
                <option value="published">منشور</option>
                <option value="draft">مسودة</option>
              </select>
            </div>
          </div>
        </div>

        {visibleFiles.length === 0 ? (
          <div className="p-14 text-center">
            <FileText className="mx-auto h-10 w-10 text-slate-300" />
            <h4 className="mt-3 font-bold">مفيش ملفات مطابقة</h4>
            <p className="mt-1 text-sm text-slate-500">
              غيّر البحث أو الفلاتر، أو ارفع أول ملف.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 p-4 md:hidden">
              {visibleFiles.map((file) => {
                const linkedLessons = videoOptions.filter((video) =>
                  file.videoIds?.includes(video.id),
                );
                const fileStages = file.stages?.length
                  ? file.stages
                  : file.stage
                  ? [file.stage]
                  : [];
                return (
                  <article
                    key={file.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-primary">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate text-sm">
                          {file.title}
                        </strong>
                        <span className="block truncate text-xs text-slate-500">
                          {file.originalName}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void toggleFile(file)}
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          file.isPublished
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {file.isPublished ? "منشور" : "مسودة"}
                      </button>
                    </div>
                    <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                      <strong className="mb-1 block text-slate-800">
                        مكان الظهور
                      </strong>
                      {file.targetType === "videos"
                        ? linkedLessons.length
                          ? linkedLessons.map((video) => video.title).join("، ")
                          : `داخل ${file.videoIds?.length || 0} درس`
                        : `${getTrack(file.category)?.title || file.category}${
                            fileStages.length ? ` ← ${fileStages.join("، ")}` : ""
                          }`}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>{(file.sizeBytes / 1024 / 1024).toFixed(1)} MB</span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPreviewFile(file)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => void editFile(file)}
                        >
                          <Edit2 className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => void deleteFile(file.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 text-xs font-black text-slate-600">
                  <tr>
                    <th className="p-4">اسم الملف والتفاصيل</th>
                    <th className="p-4">مكان الظهور والمستهدف</th>
                    <th className="p-4">الحجم</th>
                    <th className="p-4">الحالة</th>
                    <th className="p-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleFiles.map((file) => {
                    const linkedLessons = videoOptions.filter((video) =>
                      file.videoIds?.includes(video.id),
                    );
                    const fileStages = file.stages?.length
                      ? file.stages
                      : file.stage
                      ? [file.stage]
                      : [];
                    return (
                      <tr key={file.id} className="hover:bg-slate-50/80">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-primary">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <strong className="block truncate text-sm">
                                {file.title}
                              </strong>
                              <span className="block truncate text-xs text-slate-500">
                                {file.originalName}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="block text-xs font-bold text-slate-800">
                            {file.targetType === "videos"
                              ? linkedLessons.length
                                ? linkedLessons.map((video) => video.title).join("، ")
                                : `داخل ${file.videoIds?.length || 0} درس`
                              : `${getTrack(file.category)?.title || file.category}${
                                  fileStages.length ? ` ← ${fileStages.join("، ")}` : ""
                                }`}
                          </span>
                        </td>
                        <td className="p-4 text-xs font-bold text-slate-600">
                          {(file.sizeBytes / 1024 / 1024).toFixed(1)} MB
                        </td>
                        <td className="p-4">
                          <button
                            type="button"
                            onClick={() => void toggleFile(file)}
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              file.isPublished
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {file.isPublished ? "منشور" : "مسودة"}
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setPreviewFile(file)}
                              title="معاينة الملف"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => void editFile(file)}
                              title="تعديل"
                            >
                              <Edit2 className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => void deleteFile(file.id)}
                              title="حذف"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 p-4 text-xs">
                <button
                  type="button"
                  disabled={filePage === 1}
                  onClick={() => setFilePage((prev) => Math.max(1, prev - 1))}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 font-bold disabled:opacity-50"
                >
                  السابق
                </button>
                <span>
                  صفحة {filePage} من {totalPages}
                </span>
                <button
                  type="button"
                  disabled={filePage === totalPages}
                  onClick={() => setFilePage((prev) => Math.min(totalPages, prev + 1))}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 font-bold disabled:opacity-50"
                >
                  التالي
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};
