import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  FileText,
  Upload,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Check,
  Info,
  Copy,
  FolderOpen,
  Eye,
  EyeOff,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ACADEMIC_TRACKS } from "@/data/academic";

export interface EssayBankQuestion {
  id: number;
  stage?: string | null;
  stages?: string[];
  courseId?: number | null;
  unit?: string | null;
  lesson?: string | null;
  difficulty: "easy" | "medium" | "hard";
  points: number;
  prompt: string;
  modelAnswer: string;
  explanation?: string | null;
  imageUrl?: string | null;
  modelAnswerImageUrl?: string | null;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CurriculumTreeNode {
  stage: string;
  units: Array<{
    unit: string;
    lessons: string[];
  }>;
}

export interface ParsedPreviewItem {
  tempId: string;
  prompt: string;
  modelAnswer: string;
  explanation?: string;
  points: number;
  stage?: string;
  unit?: string;
  lesson?: string;
  difficulty: "easy" | "medium" | "hard";
  isValid: boolean;
  validationError?: string;
}

interface EssayBankTabProps {
  selectionMode?: boolean;
  onSelectQuestions?: (questions: EssayBankQuestion[]) => void;
  selectedIds?: number[];
  onCreateExamFromBank?: (questions: EssayBankQuestion[]) => void;
}

export function EssayBankTab({
  selectionMode = false,
  onSelectQuestions,
  selectedIds = [],
  onCreateExamFromBank,
}: EssayBankTabProps) {
  const { toast } = useToast();

  // State
  const [questions, setQuestions] = useState<EssayBankQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [curriculumTree, setCurriculumTree] = useState<CurriculumTreeNode[]>([]);
  const [taxonomy, setTaxonomy] = useState<{
    stages: string[];
    units: { unit: string; lessons: string[] }[];
  }>({ stages: [], units: [] });

  // Filters
  const [search, setSearch] = useState("");
  const [selectedStage, setSelectedStage] = useState("all");
  const [selectedUnit, setSelectedUnit] = useState("all");
  const [selectedLesson, setSelectedLesson] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");

  // Selection
  const [selectedBankIds, setSelectedBankIds] = useState<number[]>(selectedIds);

  // Manual Add/Edit Modal
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EssayBankQuestion | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [customFormUnit, setCustomFormUnit] = useState(false);
  const [customFormLesson, setCustomFormLesson] = useState(false);
  const [showManualPreview, setShowManualPreview] = useState(false);
  const [formData, setFormData] = useState({
    stage: "الصف الثاني الثانوي - لغات",
    unit: "",
    lesson: "",
    difficulty: "medium" as "easy" | "medium" | "hard",
    points: 5,
    prompt: "",
    modelAnswer: "",
    explanation: "",
  });

  // Upload & Smart Parse Modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [parsingStep, setParsingStep] = useState<"upload" | "preview">("upload");
  const [parsedPreviewList, setParsedPreviewList] = useState<ParsedPreviewItem[]>([]);
  const [savingBulk, setSavingBulk] = useState(false);
  const [defaultStage, setDefaultStage] = useState("تانية بكالوريا لغات");
  const [defaultUnit, setDefaultUnit] = useState("");
  const [defaultLesson, setDefaultLesson] = useState("");
  const [customUploadUnit, setCustomUploadUnit] = useState(false);
  const [customUploadLesson, setCustomUploadLesson] = useState(false);
  const [previewViewMode, setPreviewViewMode] = useState<"cards" | "preview">("cards");
  const [defaultDifficulty, setDefaultDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [defaultPoints, setDefaultPoints] = useState(5);
  const [copiedSample, setCopiedSample] = useState(false);

  // Expanded cards tracker
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Curriculum Tree
  const loadCurriculumTree = async () => {
    try {
      const res = await fetch("/api/admin/learning/essay-exams/curriculum-tree", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tree) && data.tree.length > 0) {
          setCurriculumTree(data.tree);
        }
      }
    } catch (err) {
      console.error("Failed to load curriculum tree in EssayBankTab", err);
    }
  };

  // 2. Fetch Taxonomy
  const loadTaxonomy = async () => {
    try {
      const res = await fetch("/api/admin/learning/essay-question-bank/taxonomy", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setTaxonomy({
          stages: data.stages || [],
          units: data.units || [],
        });
      }
    } catch {
      // Non-critical fallback
    }
  };

  // Combined available stages
  const availableStages = useMemo(() => {
    const treeStages = curriculumTree.map((c) => c.stage);
    const taxStages = taxonomy.stages;
    const academicStages = ACADEMIC_TRACKS.flatMap((t) => t.stages);
    const all = Array.from(new Set([...treeStages, ...taxStages, ...academicStages])).filter(Boolean);
    // Put "تانية بكالوريا لغات" / secondary language stages at top if present
    return all.length > 0 ? all : ["تانية بكالوريا لغات", "الصف الثاني الثانوي - لغات", "أولى بكالوريا لغات"];
  }, [curriculumTree, taxonomy.stages]);

  // Dynamic Curriculum Helper: Get units for a stage
  const getStageUnits = (stageName: string) => {
    if (!stageName) return [];
    const direct = curriculumTree.find((c) => c.stage === stageName);
    if (direct && direct.units.length > 0) return direct.units;

    // Fuzzy matching for Arabic vs Languages track
    const isLang =
      stageName.includes("لغات") ||
      stageName.toLowerCase().includes("languages") ||
      stageName.toLowerCase().includes("english");

    const matched = curriculumTree.find((c) => {
      const cLang =
        c.stage.includes("لغات") ||
        c.stage.toLowerCase().includes("languages") ||
        c.stage.toLowerCase().includes("english");
      return isLang === cLang;
    });

    if (matched && matched.units.length > 0) return matched.units;
    return taxonomy.units || [];
  };

  // Dynamic Curriculum Helper: Get lessons for a unit in a stage
  const getUnitLessons = (stageName: string, unitName: string) => {
    if (!unitName) return [];
    const units = getStageUnits(stageName);
    const found = units.find((u) => u.unit === unitName);
    if (found && found.lessons.length > 0) return found.lessons;

    const taxFound = taxonomy.units.find((u) => u.unit === unitName);
    return taxFound?.lessons || [];
  };

  // Upload modal computed units and lessons
  const uploadUnits = useMemo(
    () => getStageUnits(defaultStage),
    [curriculumTree, taxonomy.units, defaultStage]
  );
  const uploadLessons = useMemo(
    () => getUnitLessons(defaultStage, defaultUnit),
    [curriculumTree, taxonomy.units, defaultStage, defaultUnit]
  );

  // Manual modal computed units and lessons
  const formUnits = useMemo(
    () => getStageUnits(formData.stage),
    [curriculumTree, taxonomy.units, formData.stage]
  );
  const formLessons = useMemo(
    () => getUnitLessons(formData.stage, formData.unit),
    [curriculumTree, taxonomy.units, formData.stage, formData.unit]
  );

  // Filter bar computed units and lessons
  const filterUnits = useMemo(() => {
    if (selectedStage === "all") return taxonomy.units;
    return getStageUnits(selectedStage);
  }, [curriculumTree, taxonomy.units, selectedStage]);

  const filterLessons = useMemo(() => {
    if (selectedUnit === "all") return [];
    return getUnitLessons(selectedStage, selectedUnit);
  }, [curriculumTree, taxonomy.units, selectedStage, selectedUnit]);

  // Handle stage change in Upload Modal
  const handleUploadStageChange = (newStage: string) => {
    setDefaultStage(newStage);
    const units = getStageUnits(newStage);
    const firstUnit = units[0]?.unit || "";
    setDefaultUnit(firstUnit);
    const lessons = getUnitLessons(newStage, firstUnit);
    setDefaultLesson(lessons[0] || "");
    setCustomUploadUnit(false);
    setCustomUploadLesson(false);
  };

  // Handle unit change in Upload Modal
  const handleUploadUnitChange = (newUnit: string) => {
    setDefaultUnit(newUnit);
    const lessons = getUnitLessons(defaultStage, newUnit);
    setDefaultLesson(lessons[0] || "");
    setCustomUploadLesson(false);
  };

  // Handle stage change in Manual Form Modal
  const handleFormStageChange = (newStage: string) => {
    const units = getStageUnits(newStage);
    const firstUnit = units[0]?.unit || "";
    const lessons = getUnitLessons(newStage, firstUnit);
    setFormData((prev) => ({
      ...prev,
      stage: newStage,
      unit: firstUnit,
      lesson: lessons[0] || "",
    }));
    setCustomFormUnit(false);
    setCustomFormLesson(false);
  };

  // Handle unit change in Manual Form Modal
  const handleFormUnitChange = (newUnit: string) => {
    const lessons = getUnitLessons(formData.stage, newUnit);
    setFormData((prev) => ({
      ...prev,
      unit: newUnit,
      lesson: lessons[0] || "",
    }));
    setCustomFormLesson(false);
  };

  // Handle open upload modal with guaranteed pre-selected stage & unit & lesson
  const handleOpenUploadModal = () => {
    setParsingStep("upload");
    setUploadFile(null);
    setParsedPreviewList([]);
    setCustomUploadUnit(false);
    setCustomUploadLesson(false);
    setPreviewViewMode("cards");

    const stageToUse = defaultStage || availableStages[0] || "تانية بكالوريا لغات";
    setDefaultStage(stageToUse);
    const units = getStageUnits(stageToUse);
    const firstUnit = defaultUnit || units[0]?.unit || "";
    setDefaultUnit(firstUnit);
    const lessons = getUnitLessons(stageToUse, firstUnit);
    setDefaultLesson(defaultLesson || lessons[0] || "");

    setUploadModalOpen(true);
  };

  // Apply selected curriculum to all extracted questions in preview
  const handleApplyCurriculumToAllPreview = () => {
    setParsedPreviewList((prev) =>
      prev.map((item) => ({
        ...item,
        stage: defaultStage,
        unit: defaultUnit,
        lesson: defaultLesson,
      }))
    );
    toast({
      title: "تم ربط الأسئلة بالمنهج المختار",
      description: `تم تحديث المنهج لكل الأسئلة: (${defaultStage} ⬅️ ${defaultUnit || "عام"} ⬅️ ${defaultLesson || "عام"})`,
    });
  };

  // Add an extra blank question to the preview list before saving
  const handleAddNewPreviewItem = () => {
    const newItem: ParsedPreviewItem = {
      tempId: `manual_${Date.now()}_${parsedPreviewList.length + 1}`,
      prompt: "",
      modelAnswer: "",
      explanation: "",
      points: defaultPoints || 5,
      stage: defaultStage,
      unit: defaultUnit,
      lesson: defaultLesson,
      difficulty: defaultDifficulty || "medium",
      isValid: false,
      validationError: "يرجى كتابة نص السؤال والحل النموذجي",
    };
    setParsedPreviewList((prev) => [...prev, newItem]);
  };

  // 3. Fetch Questions
  const loadQuestions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedStage !== "all") params.append("stage", selectedStage);
      if (selectedUnit !== "all") params.append("unit", selectedUnit);
      if (selectedLesson !== "all") params.append("lesson", selectedLesson);
      if (selectedDifficulty !== "all") params.append("difficulty", selectedDifficulty);
      if (search.trim()) params.append("q", search.trim());
      params.append("limit", "100");

      const res = await fetch(`/api/admin/learning/essay-question-bank?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("تعذر جلب أسئلة البنك المقالي");
      const data = await res.json();
      setQuestions(Array.isArray(data.questions) ? data.questions : []);
    } catch (err: any) {
      toast({
        title: "خطأ",
        description: err.message || "فشل تحميل بنك الأسئلة المقالية",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTaxonomy();
    loadCurriculumTree();
  }, []);

  // Sync initial defaults once availableStages or curriculumTree loads
  useEffect(() => {
    if (availableStages.length > 0 && !defaultUnit) {
      const stage = defaultStage || availableStages[0];
      const units = getStageUnits(stage);
      if (units.length > 0) {
        setDefaultUnit(units[0].unit);
        if (units[0].lessons.length > 0) {
          setDefaultLesson(units[0].lessons[0]);
        }
      }
    }
  }, [availableStages, curriculumTree]);

  useEffect(() => {
    loadQuestions();
  }, [selectedStage, selectedUnit, selectedLesson, selectedDifficulty, search]);

  // Toggle card expansion
  const toggleExpand = (id: number) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Handle open manual modal
  const handleOpenAdd = () => {
    setEditingItem(null);
    setCustomFormUnit(false);
    setCustomFormLesson(false);
    setShowManualPreview(false);

    const initialStage = selectedStage !== "all" ? selectedStage : (availableStages[0] || "الصف الثاني الثانوي - لغات");
    const units = getStageUnits(initialStage);
    const initialUnit = selectedUnit !== "all" ? selectedUnit : (units[0]?.unit || "");
    const lessons = getUnitLessons(initialStage, initialUnit);
    const initialLesson = selectedLesson !== "all" ? selectedLesson : (lessons[0] || "");

    setFormData({
      stage: initialStage,
      unit: initialUnit,
      lesson: initialLesson,
      difficulty: "medium",
      points: 5,
      prompt: "",
      modelAnswer: "",
      explanation: "",
    });
    setFormModalOpen(true);
  };

  const handleOpenEdit = (q: EssayBankQuestion) => {
    setEditingItem(q);
    setCustomFormUnit(false);
    setCustomFormLesson(false);
    setShowManualPreview(false);
    setFormData({
      stage: q.stage || availableStages[0] || "الصف الثاني الثانوي - لغات",
      unit: q.unit || "",
      lesson: q.lesson || "",
      difficulty: q.difficulty || "medium",
      points: q.points || 5,
      prompt: q.prompt,
      modelAnswer: q.modelAnswer,
      explanation: q.explanation || "",
    });
    setFormModalOpen(true);
  };

  // Save single question
  const handleSaveSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.prompt.trim() || !formData.modelAnswer.trim()) {
      toast({
        title: "بيانات ناقصة",
        description: "نص السؤال والإجابة النموذجية كلاهما مطلوب",
        variant: "destructive",
      });
      return;
    }

    try {
      setSavingItem(true);
      const url = editingItem
        ? `/api/admin/learning/essay-question-bank/${editingItem.id}`
        : "/api/admin/learning/essay-question-bank";
      const method = editingItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "تعذر حفظ السؤال المقالي");
      }

      toast({
        title: editingItem ? "تم التحديث" : "تمت الإضافة",
        description: "تم حفظ السؤال المقالي في البنك بنجاح",
      });

      setFormModalOpen(false);
      loadQuestions();
      loadTaxonomy();
    } catch (err: any) {
      toast({
        title: "خطأ",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingItem(false);
    }
  };

  // Delete single question
  const handleDelete = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من رغبتك في حذف هذا السؤال المقالي من البنك؟")) return;

    try {
      const res = await fetch(`/api/admin/learning/essay-question-bank/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "تعذر حذف السؤال");
      }

      toast({
        title: "تم الحذف",
        description: "تم حذف السؤال المقالي بنجاح",
      });

      setQuestions((prev) => prev.filter((q) => q.id !== id));
      loadTaxonomy();
    } catch (err: any) {
      toast({
        title: "خطأ",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // Upload & Parse
  const handleParseFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      toast({
        title: "ملف مفقود",
        description: "يرجى اختيار ملف لتحليله",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", uploadFile);
      if (defaultStage) fd.append("defaultStage", defaultStage);
      if (defaultUnit) fd.append("defaultUnit", defaultUnit);
      if (defaultLesson) fd.append("defaultLesson", defaultLesson);
      fd.append("defaultDifficulty", defaultDifficulty);
      fd.append("defaultPoints", String(defaultPoints));

      const res = await fetch("/api/admin/learning/essay-question-bank/upload-parse", {
        method: "POST",
        credentials: "include",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل تحليل الملف");
      }

      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        toast({
          title: "لم يتم استخراج أسئلة",
          description: "تأكد من احتواء الملف على صيغ الأسئلة والأجوبة النموذجية",
          variant: "destructive",
        });
        return;
      }

      setParsedPreviewList(data.questions);
      if (data.detectedUnit && !defaultUnit) setDefaultUnit(data.detectedUnit);
      if (data.detectedLesson && !defaultLesson) setDefaultLesson(data.detectedLesson);
      setParsingStep("preview");
    } catch (err: any) {
      toast({
        title: "خطأ في التحليل",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // Bulk Save Parsed Questions
  const handleSaveBulk = async () => {
    const validItems = parsedPreviewList.filter((q) => q.isValid);
    if (validItems.length === 0) {
      toast({
        title: "تنبيه",
        description: "لا توجد أسئلة صالحة للحفظ",
        variant: "destructive",
      });
      return;
    }

    try {
      setSavingBulk(true);
      const res = await fetch("/api/admin/learning/essay-question-bank/bulk-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ questions: validItems }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "تعذر حفظ الأسئلة في البنك");
      }

      toast({
        title: "تم الحفظ بنجاح",
        description: `تم حفظ ${data.insertedCount} سؤال مقالي في بنك الأسئلة المقالية`,
      });

      setUploadModalOpen(false);
      setParsingStep("upload");
      setUploadFile(null);
      setParsedPreviewList([]);
      loadQuestions();
      loadTaxonomy();
    } catch (err: any) {
      toast({
        title: "خطأ",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingBulk(false);
    }
  };

  // Preview List Item Updates
  const updatePreviewItem = (tempId: string, updates: Partial<ParsedPreviewItem>) => {
    setParsedPreviewList((prev) =>
      prev.map((item) => {
        if (item.tempId !== tempId) return item;
        const updated = { ...item, ...updates };
        updated.isValid = Boolean(updated.prompt?.trim() && updated.modelAnswer?.trim());
        return updated;
      })
    );
  };

  const removePreviewItem = (tempId: string) => {
    setParsedPreviewList((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  // Selection toggle
  const toggleSelect = (id: number) => {
    setSelectedBankIds((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      if (onSelectQuestions) {
        const selectedObjects = questions.filter((q) => next.includes(q.id));
        onSelectQuestions(selectedObjects);
      }
      return next;
    });
  };

  // Copy sample template to clipboard
  const handleCopySampleTemplate = () => {
    const sample = `[STAGE]: تانية بكالوريا لغات
[UNIT]: Unit 1 - Computer Networks
[LESSON]: Lesson 1.2
[DIFFICULTY]: medium

[PROMPT]: Explain the main differences between TCP and UDP protocols in computer networks.
[POINTS]: 5
[MODEL_ANSWER]: TCP is connection-oriented, reliable, and uses a three-way handshake with error recovery. UDP is connectionless, lightweight, and does not guarantee packet delivery, making it ideal for real-time applications like streaming and VoIP.
[KEY_ELEMENTS]: 2 marks for TCP characteristics, 2 marks for UDP characteristics, 1 mark for suitable use case example.

---

[PROMPT]: اشرح الفرق الأساسي بين التوجيه الثابت (Static Routing) والتوجيه الديناميكي (Dynamic Routing).
[POINTS]: 4
[MODEL_ANSWER]: التوجيه الثابت يتم تحديده يدويًا بواسطة مدير الشبكة ولا يتكيف مع انقطاع المسارات، بينما التوجيه الديناميكي يعتمد على بروتوكولات مثل OSPF لتحديث جداول التوجيه تلقائيًا عند حدوث أي تغير.
[KEY_ELEMENTS]: درجتان لتعريف التوجيه الثابت، ودرجتان لتعريف التوجيه الديناميكي.`;

    navigator.clipboard.writeText(sample);
    setCopiedSample(true);
    setTimeout(() => setCopiedSample(false), 2500);
    toast({
      title: "تم نسخ النموذج",
      description: "يمكنك لصقه في ملف Word أو Text والتعديل عليه مباشرة",
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Top Header & Stats ── */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  بنك الأسئلة المقالية (Essay Question Bank)
                </h2>
                <p className="text-xs text-muted-foreground">
                  مستودع مخصص للأسئلة المقالية وحلولها النموذجية ومعايير التصحيح، منفصل كلياً عن بنك MCQ
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={loadQuestions}
              className="rounded-xl text-xs font-semibold gap-1.5 border-border hover:bg-muted/60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              تحديث
            </Button>

            <Button
              size="sm"
              onClick={handleOpenUploadModal}
              className="rounded-xl text-xs font-semibold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              رفع واستيراد من ملف
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenAdd}
              className="rounded-xl text-xs font-semibold gap-1.5 border-border hover:bg-muted/60"
            >
              <Plus className="w-3.5 h-3.5" />
              إضافة سؤال يدوياً
            </Button>
          </div>
        </div>

        {/* Counter Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <span className="text-xs text-muted-foreground block font-medium">إجمالي الأسئلة المقالية</span>
            <span className="text-xl font-bold text-foreground">{questions.length}</span>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <span className="text-xs text-muted-foreground block font-medium">الوحدات الدراسية المغطاة</span>
            <span className="text-xl font-bold text-foreground">
              {new Set(questions.map((q) => q.unit).filter(Boolean)).size}
            </span>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <span className="text-xs text-muted-foreground block font-medium">متوسط درجات الأسئلة</span>
            <span className="text-xl font-bold text-foreground">
              {questions.length > 0
                ? (
                    questions.reduce((acc, q) => acc + (q.points || 0), 0) / questions.length
                  ).toFixed(1)
                : 0}{" "}
              درجات
            </span>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <span className="text-xs text-muted-foreground block font-medium">حالة التصفية</span>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-1 block">
              {selectedStage !== "all" || selectedUnit !== "all" || search
                ? "تصفية نشطة"
                : "عرض كامل البنك"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Filters & Search Bar ── */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث في نص السؤال أو الإجابة النموذجية..."
              className="w-full bg-background border border-border rounded-xl pr-9 pl-3 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Stage Filter */}
          <div>
            <select
              value={selectedStage}
              onChange={(e) => {
                setSelectedStage(e.target.value);
                setSelectedUnit("all");
                setSelectedLesson("all");
              }}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">كل المراحل والصفوف</option>
              {availableStages.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Unit Filter */}
          <div>
            <select
              value={selectedUnit}
              onChange={(e) => {
                setSelectedUnit(e.target.value);
                setSelectedLesson("all");
              }}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">كل الوحدات</option>
              {filterUnits.map((u) => (
                <option key={u.unit} value={u.unit}>
                  {u.unit}
                </option>
              ))}
            </select>
          </div>

          {/* Lesson Filter */}
          {filterLessons.length > 0 && (
            <div>
              <select
                value={selectedLesson}
                onChange={(e) => setSelectedLesson(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">كل الدروس</option>
                {filterLessons.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Difficulty Filter */}
          <div>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">كل مستويات الصعوبة</option>
              <option value="easy">سهل (Easy)</option>
              <option value="medium">متوسط (Medium)</option>
              <option value="hard">صعب (Hard)</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Indicator */}
        {(selectedStage !== "all" ||
          selectedUnit !== "all" ||
          selectedLesson !== "all" ||
          selectedDifficulty !== "all" ||
          search) && (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
            <span>تم تصفية النتائج بحسب المعايير الحالية</span>
            <button
              onClick={() => {
                setSelectedStage("all");
                setSelectedUnit("all");
                setSelectedLesson("all");
                setSelectedDifficulty("all");
                setSearch("");
              }}
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              إلغاء التصفية وعرض الكل
            </button>
          </div>
        )}
      </div>

      {/* ── Selection Mode Action Bar (if used in Exam Wizard) ── */}
      {selectionMode && (
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-bold text-foreground">
              تم تحديد {selectedBankIds.length} سؤال مقالي للإدراج في هذا الامتحان
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => {
              if (onSelectQuestions) {
                const selectedObjects = questions.filter((q) => selectedBankIds.includes(q.id));
                onSelectQuestions(selectedObjects);
              }
            }}
            className="rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
          >
            تأكيد إدراج الأسئلة المحددة
          </Button>
        </div>
      )}

      {/* ── Standalone Mode: Create Exam from Selected Questions Bar ── */}
      {!selectionMode && Boolean(onCreateExamFromBank) && selectedBankIds.length > 0 && (
        <div className="rounded-2xl border border-indigo-500/40 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-blue-500/10 p-4 flex items-center justify-between flex-wrap gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-xs">
              {selectedBankIds.length}
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block">
                تم تحديد {selectedBankIds.length} سؤال من بنك الأسئلة المقالية
              </span>
              <span className="text-[11px] text-muted-foreground">
                اضغط لتجميع هذه الأسئلة وفتح شاشة إعداد الامتحان لضبط المدة والنشر
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedBankIds([])}
              className="rounded-xl text-xs font-semibold"
            >
              إلغاء التحديد
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (onCreateExamFromBank) {
                  const selectedObjects = questions.filter((q) => selectedBankIds.includes(q.id));
                  onCreateExamFromBank(selectedObjects);
                }
              }}
              className="rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-xs"
            >
              <FileEdit className="w-4 h-4" />
              إنشاء امتحان من الأسئلة المحددة ({selectedBankIds.length}) ✍️
            </Button>
          </div>
        </div>
      )}

      {/* ── Questions List ── */}
      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <RefreshCw className="w-7 h-7 text-muted-foreground animate-spin mx-auto mb-2" />
          <p className="text-xs text-muted-foreground font-medium">جاري تحميل أسئلة البنك المقالي...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted mx-auto mb-3 text-muted-foreground">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-foreground">لا توجد أسئلة مقالية مطابقة</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            لم نجد أي أسئلة مقالية في هذا التصنيف. يمكنك الضغط على "رفع واستيراد من ملف" أو "إضافة
            سؤال يدوياً" للبدء.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                setParsingStep("upload");
                setUploadModalOpen(true);
              }}
              className="rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Upload className="w-3.5 h-3.5 ml-1.5" />
              رفع ملف أسئلة
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, idx) => {
            const isExpanded = Boolean(expandedCards[q.id]);
            const isSelected = selectedBankIds.includes(q.id);

            return (
              <div
                key={q.id}
                className={`rounded-2xl border bg-card p-4 transition-all shadow-xs ${
                  isSelected
                    ? "border-blue-500 ring-1 ring-blue-500/30"
                    : "border-border hover:border-border/80"
                }`}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {(selectionMode || Boolean(onCreateExamFromBank)) && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(q.id)}
                        className="w-4 h-4 rounded border-border text-blue-600 focus:ring-0 cursor-pointer ml-1"
                      />
                    )}

                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-muted text-muted-foreground border border-border">
                      #{idx + 1}
                    </span>

                    {q.stage && (
                      <span className="text-xs px-2 py-0.5 rounded-lg bg-muted text-foreground border border-border font-medium">
                        {q.stage}
                      </span>
                    )}

                    {q.unit && (
                      <span className="text-xs px-2 py-0.5 rounded-lg bg-muted/60 text-muted-foreground border border-border/80">
                        {q.unit}
                      </span>
                    )}

                    {q.lesson && (
                      <span className="text-xs px-2 py-0.5 rounded-lg bg-muted/40 text-muted-foreground">
                        {q.lesson}
                      </span>
                    )}

                    <span
                      className={`text-xs px-2 py-0.5 rounded-lg border font-medium ${
                        q.difficulty === "easy"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                          : q.difficulty === "hard"
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                          : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
                      }`}
                    >
                      {q.difficulty === "easy"
                        ? "سهل"
                        : q.difficulty === "hard"
                        ? "صعب"
                        : "متوسط"}
                    </span>

                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-muted text-foreground border border-border">
                      {q.points || 5} درجات
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(q)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="تعديل السؤال"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-muted transition-colors"
                      title="حذف السؤال"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleExpand(q.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title={isExpanded ? "طي الإجابة" : "عرض الإجابة النموذجية"}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Prompt */}
                <div className="mt-3 text-foreground font-semibold text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                  {q.prompt}
                </div>

                {/* Optional Image */}
                {q.imageUrl && (
                  <div className="mt-2.5">
                    <img
                      src={q.imageUrl}
                      alt="Question attachment"
                      className="max-h-56 rounded-xl border border-border object-contain"
                    />
                  </div>
                )}

                {/* Collapsible Model Answer & Explanation */}
                {isExpanded && (
                  <div className="mt-3.5 pt-3.5 border-t border-border space-y-2.5">
                    {/* Model Answer */}
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>الإجابة النموذجية والحل المثالي:</span>
                      </div>
                      <div className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                        {q.modelAnswer}
                      </div>
                      {q.modelAnswerImageUrl && (
                        <div className="mt-2">
                          <img
                            src={q.modelAnswerImageUrl}
                            alt="Model answer visual"
                            className="max-h-56 rounded-lg border border-border object-contain"
                          />
                        </div>
                      )}
                    </div>

                    {/* Rubric / Key Elements */}
                    {q.explanation && (
                      <div className="rounded-xl border border-border bg-muted/30 p-3">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
                          <Info className="w-3.5 h-3.5" />
                          <span>إرشادات وتوزيع الدرجات (Rubric):</span>
                        </div>
                        <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {q.explanation}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Expand trigger button footer */}
                {!isExpanded && (
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <button
                      onClick={() => toggleExpand(q.id)}
                      className="hover:text-foreground flex items-center gap-1 transition-colors font-medium"
                    >
                      <span>عرض الحل النموذجي ومفاتيح الدرجات</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <span>{new Date(q.createdAt || Date.now()).toLocaleDateString("ar-EG")}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal 1: Smart Upload & Live Parser Modal ── */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="rounded-2xl border border-border bg-card w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {parsingStep === "upload"
                      ? "رفع واستيراد أسئلة مقالية من ملف"
                      : `معاينة وتأكيد الأسئلة المستخرجة (${parsedPreviewList.length} سؤال)`}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {parsingStep === "upload"
                      ? "يدعم ملفات Word (.docx) و PDF و نصوص Text (.txt) و JSON"
                      : "راجع وعدل نصوص الأسئلة والدرجات قبل الحفظ في البنك"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {parsingStep === "upload" ? (
                <form onSubmit={handleParseFile} className="space-y-4">
                  {/* File Dropzone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-muted/10 hover:bg-muted/20"
                  >
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted mx-auto mb-2 text-muted-foreground">
                      <FolderOpen className="w-6 h-6" />
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-foreground">
                      {uploadFile ? uploadFile.name : "اضغط لاختيار ملف أو اسحب الملف وأفلته هنا"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      الصيغ المدعومة: Word (.docx) و PDF (.pdf) و Text (.txt) و JSON
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".docx,.pdf,.txt,.json"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setUploadFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                  </div>

                  {/* Defaults Metadata Selection with Dynamic Cascading */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* 1. Stage */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground block font-bold">1. المرحلة الدراسية *</label>
                      <select
                        value={defaultStage}
                        onChange={(e) => handleUploadStageChange(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                      >
                        {availableStages.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Unit */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-muted-foreground block font-bold">2. اسم الوحدة الافتراضية *</label>
                        <button
                          type="button"
                          onClick={() => setCustomUploadUnit((v) => !v)}
                          className="text-[10px] text-primary hover:underline font-semibold"
                        >
                          {customUploadUnit ? "اختيار من المنهج" : "+ إدخال يدوي"}
                        </button>
                      </div>
                      {customUploadUnit ? (
                        <input
                          type="text"
                          value={defaultUnit}
                          onChange={(e) => setDefaultUnit(e.target.value)}
                          placeholder="اكتب اسم الوحدة..."
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        />
                      ) : (
                        <select
                          value={defaultUnit}
                          onChange={(e) => handleUploadUnitChange(e.target.value)}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        >
                          <option value="">-- اختر الوحدة من المنهج --</option>
                          {uploadUnits.map((u) => (
                            <option key={u.unit} value={u.unit}>
                              {u.unit}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* 3. Lesson */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-muted-foreground block font-bold">3. اسم الدرس الافتراضي *</label>
                        <button
                          type="button"
                          onClick={() => setCustomUploadLesson((v) => !v)}
                          className="text-[10px] text-primary hover:underline font-semibold"
                        >
                          {customUploadLesson ? "اختيار من المنهج" : "+ إدخال يدوي"}
                        </button>
                      </div>
                      {customUploadLesson ? (
                        <input
                          type="text"
                          value={defaultLesson}
                          onChange={(e) => setDefaultLesson(e.target.value)}
                          placeholder="اكتب اسم الدرس..."
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        />
                      ) : (
                        <select
                          value={defaultLesson}
                          onChange={(e) => setDefaultLesson(e.target.value)}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        >
                          <option value="">-- اختر الدرس من المنهج --</option>
                          {uploadLessons.map((l) => (
                            <option key={l} value={l}>
                              {l}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1 font-medium">الصعوبة الافتراضية</label>
                      <select
                        value={defaultDifficulty}
                        onChange={(e) => setDefaultDifficulty(e.target.value as any)}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="easy">سهل (Easy)</option>
                        <option value="medium">متوسط (Medium)</option>
                        <option value="hard">صعب (Hard)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1 font-medium">الدرجة الافتراضية للسؤال</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={defaultPoints}
                        onChange={(e) => setDefaultPoints(parseInt(e.target.value, 10) || 5)}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Guidance Box with Quick Copy */}
                  <div className="rounded-xl border border-border bg-muted/20 p-3.5 text-xs text-muted-foreground space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">طريقة صياغة الأسئلة داخل الملف:</span>
                      <button
                        type="button"
                        onClick={handleCopySampleTemplate}
                        className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                      >
                        {copiedSample ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>تم النسخ</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>نسخ نموذج للتجربة</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="leading-relaxed">
                      يدعم النظام استخراج الأسئلة بالوسوم المنظمة مثل <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-foreground">[PROMPT]</code> و <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-foreground">[MODEL_ANSWER]</code>، أو بالصيغة العربية التلقائية: (السؤال: ... / الإجابة النموذجية: ... / الدرجة: 5).
                    </p>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setUploadModalOpen(false)}
                      className="rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground"
                    >
                      إلغاء
                    </Button>
                    <Button
                      type="submit"
                      disabled={!uploadFile || uploading}
                      className="rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {uploading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 ml-1.5 animate-spin" />
                          جاري قراءة واستخراج الأسئلة...
                        </>
                      ) : (
                        "تحليل واستخراج الأسئلة للمعاينة"
                      )}
                    </Button>
                  </div>
                </form>
              ) : (
                /* Step 2: Live Preview & Verification */
                <div className="space-y-4">
                  {/* Summary Header Card */}
                  <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                          <h4 className="text-xs sm:text-sm font-extrabold text-foreground">
                            معاينة وتأكيد الأسئلة قبل الحفظ في البنك
                          </h4>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          تم استخراج{" "}
                          <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                            {parsedPreviewList.filter((q) => q.isValid).length}
                          </strong>{" "}
                          سؤال صالح من إجمالي {parsedPreviewList.length} سؤال • إجمالي الدرجات:{" "}
                          <strong className="text-blue-600 dark:text-blue-400 font-bold">
                            {parsedPreviewList.reduce((sum, q) => sum + (Number(q.points) || 0), 0)}
                          </strong>{" "}
                          درجة
                        </p>
                      </div>

                      {/* View Mode Switcher */}
                      <div className="flex items-center gap-1 bg-background/80 border border-border p-1 rounded-xl text-xs">
                        <button
                          type="button"
                          onClick={() => setPreviewViewMode("cards")}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                            previewViewMode === "cards"
                              ? "bg-blue-600 text-white shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          تعديل البطاقات
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewViewMode("preview")}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                            previewViewMode === "preview"
                              ? "bg-blue-600 text-white shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          معاينة ورقة الاختبار 📄
                        </button>
                      </div>
                    </div>

                    {/* Target Curriculum Badges & Quick Batch Updater */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50 text-xs">
                      <span className="text-muted-foreground font-semibold">الربط بالمنهج:</span>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-background/90 border border-border px-2.5 py-1 text-[11px] font-bold text-foreground">
                        🎓 {defaultStage}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-background/90 border border-border px-2.5 py-1 text-[11px] font-bold text-foreground">
                        📁 {defaultUnit || "الوحدة غير محددة"}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-background/90 border border-border px-2.5 py-1 text-[11px] font-bold text-foreground">
                        📖 {defaultLesson || "الدرس غير محدد"}
                      </span>

                      <button
                        type="button"
                        onClick={handleApplyCurriculumToAllPreview}
                        className="mr-auto text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        title="تطبيق المرحلة والوحدة والدرس المختارين على كافة الأسئلة المستخرجة"
                      >
                        <RefreshCw className="w-3 h-3" />
                        تطبيق هذا المنهج على كل الأسئلة
                      </button>
                    </div>
                  </div>

                  {/* Mode 1: Cards Editor Mode */}
                  {previewViewMode === "cards" ? (
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                      {parsedPreviewList.map((item, idx) => (
                        <div
                          key={item.tempId}
                          className={`rounded-2xl border p-3.5 space-y-2.5 bg-card transition-all ${
                            item.isValid ? "border-border shadow-xs" : "border-red-500/40 bg-red-500/5"
                          }`}
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-muted text-muted-foreground">
                                سؤال #{idx + 1}
                              </span>

                              {/* Points */}
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground font-medium">الدرجة:</span>
                                <input
                                  type="number"
                                  min="1"
                                  max="50"
                                  value={item.points}
                                  onChange={(e) =>
                                    updatePreviewItem(item.tempId, {
                                      points: parseInt(e.target.value, 10) || 5,
                                    })
                                  }
                                  className="w-16 bg-background border border-border rounded-lg px-2 py-0.5 text-xs text-foreground text-center font-bold"
                                />
                              </div>

                              {/* Difficulty */}
                              <select
                                value={item.difficulty}
                                onChange={(e) =>
                                  updatePreviewItem(item.tempId, {
                                    difficulty: e.target.value as any,
                                  })
                                }
                                className="bg-background border border-border rounded-lg px-2 py-0.5 text-xs text-muted-foreground"
                              >
                                <option value="easy">سهل</option>
                                <option value="medium">متوسط</option>
                                <option value="hard">صعب</option>
                              </select>

                              {/* Unit / Lesson indicator */}
                              <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                                {item.unit ? `[${item.unit}]` : ""} {item.lesson ? `[${item.lesson}]` : ""}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => removePreviewItem(item.tempId)}
                              className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                              title="حذف هذا السؤال من قائمة الحفظ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Prompt Input */}
                          <div>
                            <label className="text-xs text-muted-foreground block mb-1 font-medium">نص السؤال المقالي:</label>
                            <textarea
                              rows={2}
                              value={item.prompt}
                              onChange={(e) =>
                                updatePreviewItem(item.tempId, { prompt: e.target.value })
                              }
                              className="w-full bg-background border border-border rounded-xl p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              placeholder="اكتب نص السؤال..."
                            />
                          </div>

                          {/* Model Answer Input */}
                          <div>
                            <label className="text-xs text-emerald-600 dark:text-emerald-400 font-bold block mb-1">
                              الإجابة النموذجية والحل المثالي:
                            </label>
                            <textarea
                              rows={3}
                              value={item.modelAnswer}
                              onChange={(e) =>
                                updatePreviewItem(item.tempId, { modelAnswer: e.target.value })
                              }
                              className="w-full bg-background border border-border rounded-xl p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              placeholder="اكتب الإجابة النموذجية المعتمدة..."
                            />
                          </div>

                          {/* Explanation / Rubric */}
                          <div>
                            <label className="text-xs text-muted-foreground block mb-1 font-medium">
                              إرشادات وتوزيع الدرجات (Rubric - اختياري):
                            </label>
                            <input
                              type="text"
                              value={item.explanation || ""}
                              onChange={(e) =>
                                updatePreviewItem(item.tempId, { explanation: e.target.value })
                              }
                              placeholder="ملاحظات التصحيح أو العناصر الأساسية المطلوبة..."
                              className="w-full bg-background border border-border rounded-xl px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>

                          {!item.isValid && (
                            <div className="text-xs text-red-500 flex items-center gap-1 font-medium">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>{item.validationError || "يرجى كتابة نص السؤال والحل النموذجي"}</span>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Add another item manually button */}
                      <button
                        type="button"
                        onClick={handleAddNewPreviewItem}
                        className="w-full border-2 border-dashed border-border hover:border-blue-500 rounded-2xl p-3 text-center text-xs font-bold text-blue-600 dark:text-blue-400 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        إضافة سؤال مقالي آخر للقائمة يدوياً قبل الحفظ
                      </button>
                    </div>
                  ) : (
                    /* Mode 2: Student Exam Paper Preview Mode */
                    <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                      {parsedPreviewList.map((item, idx) => (
                        <div
                          key={item.tempId}
                          className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-xs"
                        >
                          <div className="flex items-center justify-between border-b border-border/60 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-xs text-foreground bg-primary/10 text-primary px-2.5 py-1 rounded-lg">
                                سؤال ({idx + 1})
                              </span>
                              <span className="text-xs font-bold text-muted-foreground">
                                [{item.points} درجات]
                              </span>
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                {item.difficulty === "easy" ? "سهل" : item.difficulty === "hard" ? "صعب" : "متوسط"}
                              </span>
                            </div>
                            <span className="text-[11px] text-muted-foreground font-medium">
                              {item.unit || defaultUnit} {item.lesson ? `• ${item.lesson}` : ""}
                            </span>
                          </div>

                          {/* Prompt display */}
                          <div className="text-xs sm:text-sm font-bold text-foreground leading-relaxed whitespace-pre-wrap">
                            {item.prompt || "(نص السؤال فارغ)"}
                          </div>

                          {/* Model Answer display */}
                          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1">
                            <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 block">
                              💡 الإجابة النموذجية المعتمدة:
                            </span>
                            <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                              {item.modelAnswer || "(الإجابة النموذجية فارغة)"}
                            </p>
                          </div>

                          {/* Rubric display */}
                          {item.explanation && (
                            <div className="rounded-xl border border-border bg-muted/20 p-2.5 text-xs text-muted-foreground">
                              <span className="font-bold text-foreground block text-[11px] mb-0.5">
                                📋 عناصر التقييم ومعايير الدرجات:
                              </span>
                              <p className="text-xs leading-relaxed">{item.explanation}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Modal Footer Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-border flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setParsingStep("upload")}
                      className="rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground"
                    >
                      رجوع لاختيار الملف
                    </Button>
                    <Button
                      onClick={handleSaveBulk}
                      disabled={savingBulk || parsedPreviewList.filter((q) => q.isValid).length === 0}
                      className="rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                    >
                      {savingBulk ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 ml-1.5 animate-spin" />
                          جاري الحفظ في البنك...
                        </>
                      ) : (
                        `حفظ ${parsedPreviewList.filter((q) => q.isValid).length} سؤال في بنك الأسئلة المقالية (${parsedPreviewList.reduce((sum, q) => sum + (Number(q.points) || 0), 0)} درجة)`
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 2: Manual Add / Edit Question Modal ── */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="rounded-2xl border border-border bg-card w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  {editingItem ? "تعديل السؤال المقالي" : "إضافة سؤال مقالي جديد للبنك"}
                </h3>

                {/* Live Preview Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowManualPreview((v) => !v)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                    showManualPreview
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-background text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  {showManualPreview ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      الرجوع للتعديل
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      معاينة السؤال
                    </>
                  )}
                </button>
              </div>

              <button
                onClick={() => setFormModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {showManualPreview ? (
              /* Live Preview for Manual Question */
              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-foreground bg-primary/10 text-primary px-2.5 py-1 rounded-lg">
                        معاينة السؤال المقالي
                      </span>
                      <span className="text-xs font-bold text-muted-foreground">
                        [{formData.points} درجات]
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {formData.difficulty === "easy" ? "سهل" : formData.difficulty === "hard" ? "صعب" : "متوسط"}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {formData.stage} • {formData.unit || "الوحدة عامة"} {formData.lesson ? `• ${formData.lesson}` : ""}
                    </span>
                  </div>

                  <div className="text-sm font-bold text-foreground leading-relaxed whitespace-pre-wrap">
                    {formData.prompt || "(لم يتم كتابة نص السؤال بعد)"}
                  </div>

                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1">
                    <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 block">
                      💡 الإجابة النموذجية المعتمدة:
                    </span>
                    <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                      {formData.modelAnswer || "(لم يتم كتابة الإجابة النموذجية بعد)"}
                    </p>
                  </div>

                  {formData.explanation && (
                    <div className="rounded-xl border border-border bg-muted/20 p-2.5 text-xs text-muted-foreground">
                      <span className="font-bold text-foreground block text-[11px] mb-0.5">
                        📋 عناصر التقييم ومعايير الدرجات:
                      </span>
                      <p className="text-xs leading-relaxed">{formData.explanation}</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowManualPreview(false)}
                    className="rounded-xl text-xs font-semibold"
                  >
                    تعديل البيانات
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveSingle}
                    disabled={savingItem || !formData.prompt.trim() || !formData.modelAnswer.trim()}
                    className="rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {savingItem ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 ml-1.5 animate-spin" />
                        جاري الحفظ...
                      </>
                    ) : editingItem ? (
                      "تحديث السؤال"
                    ) : (
                      "حفظ في البنك"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveSingle} className="p-5 overflow-y-auto flex-1 space-y-4">
                {/* Dynamic Cascading Stage / Unit / Lesson */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* 1. Stage */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground block font-bold">1. المرحلة الدراسية *</label>
                    <select
                      value={formData.stage}
                      onChange={(e) => handleFormStageChange(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                    >
                      {availableStages.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Unit */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-muted-foreground block font-bold">2. الوحدة الدراسية *</label>
                      <button
                        type="button"
                        onClick={() => setCustomFormUnit((v) => !v)}
                        className="text-[10px] text-primary hover:underline font-semibold"
                      >
                        {customFormUnit ? "اختيار من المنهج" : "+ إدخال يدوي"}
                      </button>
                    </div>
                    {customFormUnit ? (
                      <input
                        type="text"
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        placeholder="اسم الوحدة..."
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                      />
                    ) : (
                      <select
                        value={formData.unit}
                        onChange={(e) => handleFormUnitChange(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                      >
                        <option value="">-- اختر الوحدة من المنهج --</option>
                        {formUnits.map((u) => (
                          <option key={u.unit} value={u.unit}>
                            {u.unit}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* 3. Lesson */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-muted-foreground block font-bold">3. الدرس *</label>
                      <button
                        type="button"
                        onClick={() => setCustomFormLesson((v) => !v)}
                        className="text-[10px] text-primary hover:underline font-semibold"
                      >
                        {customFormLesson ? "اختيار من المنهج" : "+ إدخال يدوي"}
                      </button>
                    </div>
                    {customFormLesson ? (
                      <input
                        type="text"
                        value={formData.lesson}
                        onChange={(e) => setFormData({ ...formData, lesson: e.target.value })}
                        placeholder="اسم الدرس..."
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                      />
                    ) : (
                      <select
                        value={formData.lesson}
                        onChange={(e) => setFormData({ ...formData, lesson: e.target.value })}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                      >
                        <option value="">-- اختر الدرس من المنهج --</option>
                        {formLessons.map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1 font-medium">مستوى الصعوبة</label>
                    <select
                      value={formData.difficulty}
                      onChange={(e) =>
                        setFormData({ ...formData, difficulty: e.target.value as any })
                      }
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="easy">سهل (Easy)</option>
                      <option value="medium">متوسط (Medium)</option>
                      <option value="hard">صعب (Hard)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1 font-medium">درجات السؤال</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={formData.points}
                      onChange={(e) =>
                        setFormData({ ...formData, points: parseInt(e.target.value, 10) || 5 })
                      }
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Prompt */}
                <div>
                  <label className="text-xs text-foreground font-bold block mb-1">
                    نص السؤال المقالي *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={formData.prompt}
                    onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                    placeholder="اكتب نص السؤال المطلوب من الطالب بالتفصيل..."
                    className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Model Answer */}
                <div>
                  <label className="text-xs text-emerald-600 dark:text-emerald-400 font-bold block mb-1">
                    الإجابة النموذجية والحل المثالي *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={formData.modelAnswer}
                    onChange={(e) => setFormData({ ...formData, modelAnswer: e.target.value })}
                    placeholder="اكتب الحل النموذجي والمثالي الذي يُقاس عليه حل الطالب..."
                    className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Explanation / Rubric */}
                <div>
                  <label className="text-xs text-muted-foreground block mb-1 font-medium">
                    إرشادات التصحيح وعناصر توزيع الدرجات (Rubric)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.explanation}
                    onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                    placeholder="مثال: درجتان لذكر القانون، ودرجتان للخطوات، ودرجة للناتج النهائي..."
                    className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setFormModalOpen(false)}
                    className="rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    disabled={savingItem}
                    className="rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {savingItem ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 ml-1.5 animate-spin" />
                        جاري الحفظ...
                      </>
                    ) : editingItem ? (
                      "تحديث السؤال"
                    ) : (
                      "حفظ في البنك"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
