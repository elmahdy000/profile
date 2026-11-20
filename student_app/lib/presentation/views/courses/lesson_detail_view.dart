import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:student_app/core/constants/app_colors.dart';
import 'package:student_app/core/constants/app_icons.dart';
import 'package:student_app/core/utils/app_toast.dart';
import 'package:student_app/data/datasources/curriculum_bank_data.dart';
import 'package:student_app/data/repositories/kholasa_repository.dart';
import 'package:student_app/domain/entities/course.dart';
import 'package:student_app/domain/entities/kholasa.dart';
import 'package:student_app/presentation/viewmodels/auth_viewmodel.dart';
import 'package:student_app/core/services/sound_service.dart';
import 'package:student_app/data/repositories/mistakes_repository.dart';
import 'package:student_app/domain/entities/mistake_item.dart';
import 'package:student_app/presentation/widgets/draggable_mistakes_button.dart';
import 'package:student_app/presentation/widgets/lesson_summary_upload_sheet.dart';
import 'package:student_app/presentation/widgets/protected_video_player.dart';
import 'package:student_app/services/active_video_service.dart';

class LessonDetailView extends StatefulWidget {
  const LessonDetailView({
    required this.lesson,
    this.courseTitle = 'الحاسب الآلي والذكاء الاصطناعي',
    super.key,
  });

  final Lesson lesson;
  final String courseTitle;

  @override
  State<LessonDetailView> createState() => _LessonDetailViewState();
}

class _LessonDetailViewState extends State<LessonDetailView> {
  // Tabs: 0 = بنك الأسئلة والتدريبات, 1 = التعريفات النموذجية, 2 = المرفقات والواجب
  int _activeTab = 0;
  bool _hasConfirmedAttendance = false;

  // Kholasa Material State
  KholasaMaterial? _material;
  bool _isLoadingMaterial = true;

  // Definitions Search
  String _defSearch = '';
  final _defSearchController = TextEditingController();


  // Questions State
  String _qType = 'mcq'; // 'mcq', 'true_false', 'essay'
  final String _difficulty = 'all'; // 'all', 'easy', 'medium', 'hard'
  List<KholasaQuestion> _questions = [];
  bool _isLoadingQuestions = false;
  final Map<int, KholasaCheckResult> _questionResults = {};
  final Map<int, int> _selectedOptions = {};
  final Set<int> _checkingQuestions = {};
  final Set<int> _revealedEssays = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadKholasaData();
    });
  }

  @override
  void dispose() {
    _defSearchController.dispose();
    super.dispose();
  }

  Future<void> _loadKholasaData() async {
    setState(() => _isLoadingMaterial = true);
    final repo = context.read<KholasaRepository>();
    final res = await repo.getKholasaMaterial(widget.lesson.id);
    if (mounted) {
      setState(() {
        _material = res.dataOrNull;
        _isLoadingMaterial = false;
      });
      if (_material != null) {
        _loadQuestions();
      }
    }
  }

  Future<void> _loadQuestions() async {
    setState(() => _isLoadingQuestions = true);

    // 1. Check local CurriculumBankData first for instant 0ms offline display (excluding C++ & JS)
    final allLessonQ = CurriculumBankData.getQuestionsForLesson(widget.lesson.title)
        .where((q) => !KholasaRepository.isCppOrJsQuestion(q))
        .toList();
    final localFiltered = allLessonQ.where((q) {
      if (_qType == 'all') return true;
      if (_qType == 'assessment') return q.isAssessment;
      return q.type == _qType;
    }).toList();
    if (localFiltered.isNotEmpty) {
      if (mounted) {
        setState(() {
          _questions = localFiltered;
          _isLoadingQuestions = false;
        });
      }
      return;
    }

    // 2. Fallback to API if available
    if (_material != null) {
      final repo = context.read<KholasaRepository>();
      final res = await repo.getQuestions(
        materialId: _material!.id,
        type: _qType,
        difficulty: _difficulty,
        limit: 25,
      );
      if (mounted) {
        setState(() {
          _questions = res.dataOrNull ?? [];
          _isLoadingQuestions = false;
        });
      }
    } else {
      if (mounted) {
        setState(() => _isLoadingQuestions = false);
      }
    }
  }

  Future<void> _handleOptionSelect(int questionId, int selectedIndex) async {
    if (_questionResults.containsKey(questionId) || _checkingQuestions.contains(questionId)) {
      return;
    }
    setState(() {
      _selectedOptions[questionId] = selectedIndex;
      _checkingQuestions.add(questionId);
    });

    final repo = context.read<KholasaRepository>();
    final res = await repo.checkAnswer(
      materialId: _material?.id ?? widget.lesson.id,
      questionBankId: questionId,
      selectedOption: selectedIndex,
    );

    if (mounted) {
      final qList = _questions.where((item) => item.id == questionId);
      final q = qList.isNotEmpty ? qList.first : null;

      final KholasaCheckResult result;
      if (res.dataOrNull != null) {
        result = res.dataOrNull!;
      } else if (q != null) {
        final isCorrect = q.correctIndex == selectedIndex;
        result = KholasaCheckResult(
          isCorrect: isCorrect,
          correctOption: q.correctIndex,
          explanation: (q.explanation != null && q.explanation!.isNotEmpty) ? q.explanation! : 'إجابة نموذجية معتمدة.',
        );
      } else {
        result = const KholasaCheckResult(
          isCorrect: true,
          correctOption: 0,
          explanation: 'إجابة نموذجية صحيحة.',
        );
      }

      setState(() {
        _checkingQuestions.remove(questionId);
        _questionResults[questionId] = result;
      });

      // Sound & Mistakes Handling
      if (result.isCorrect) {
        SoundService().playCorrect();
      } else {
        SoundService().playWrong();
        if (q != null) {
          final mistake = MistakeItem(
            id: 'lesson-${widget.lesson.id}-$questionId',
            lessonTitle: widget.lesson.title,
            unitName: widget.lesson.unitName,
            questionPrompt: q.prompt,
            options: q.options,
            userSelectedIdx: selectedIndex,
            correctIdx: result.correctOption,
            explanation: result.explanation ?? (q.explanation ?? ''),
            timestamp: DateTime.now(),
          );
          MistakesRepository().recordMistake(mistake);
        }
      }
    }
  }

  Future<void> _openPdf() async {
    final pdfUrl = Uri.parse('https://drelmahdy.com/api/learning/lessons/${widget.lesson.id}/memo');
    try {
      await launchUrl(pdfUrl, mode: LaunchMode.externalApplication);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppColors.blue,
            content: Text('جارٍ فتح مذكرة ملخص الدرس (A4 جاهز للطباعة)'),
          ),
        );
      }
    }
  }

  void _confirmAttendance() {
    setState(() => _hasConfirmedAttendance = true);
    AppToast.showSuccess(context, 'تم تأكيد مشاهدة الدرس وتسجيل حضورك بنجاح');
  }

  @override
  Widget build(BuildContext context) {
    final authVm = context.watch<AuthViewModel>();
    final currentVideoUrl = (widget.lesson.videoUrl != null && widget.lesson.videoUrl!.isNotEmpty)
        ? widget.lesson.videoUrl
        : _material?.videoUrl;
    final effectiveVidId = widget.lesson.id > 0
        ? widget.lesson.id
        : (_material?.videoId ?? 0);

    return Scaffold(
      backgroundColor: AppColors.bgLight,
      body: Stack(
        children: [
          SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
            // ── Top Bar ──
            Container(
              padding: EdgeInsets.fromLTRB(
                16,
                MediaQuery.of(context).padding.top + 10,
                16,
                12,
              ),
              decoration: const BoxDecoration(
                color: AppColors.blue,
              ),
              child: Row(
                children: [
                  InkWell(
                    onTap: () => Navigator.of(context).pop(),
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Center(
                        child: Icon(AppIcons.arrowRight, color: Colors.white, size: 22),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'مشاهدة الدرس والتدريبات',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                        Text(
                          widget.lesson.unitName,
                          style: const TextStyle(
                            fontSize: 10,
                            color: Colors.white70,
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // ── 16:9 Edge-to-Edge YouTube-Style Straight Video Player ──
            SizedBox(
              width: double.infinity,
              child: AspectRatio(
                aspectRatio: 16 / 9,
                child: ProtectedVideoPlayer(
                  title: widget.lesson.title,
                  videoId: effectiveVidId > 0 ? effectiveVidId : null,
                  videoUrl: currentVideoUrl,
                  student: authVm.currentStudent,
                  onMinimize: () {
                    ActiveVideoService().minimize();
                    Navigator.of(context).pop();
                  },
                  onCompleted: () {
                    setState(() => _hasConfirmedAttendance = true);
                    AppToast.showSuccess(context, 'تم تسجيل حضورك وإكمال مشاهدة الدرس بنجاح');
                  },
                ),
              ),
            ),

            // ── Lesson Title & Header ──
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.lesson.title,
                    style: const TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w900,
                      color: AppColors.ink,
                      height: 1.45,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          widget.lesson.unitName,
                          style: const TextStyle(
                            fontSize: 9.5,
                            fontWeight: FontWeight.w700,
                            color: AppColors.blueDark,
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        '${widget.lesson.durationMinutes ?? 45} دقيقة · د. محمود المهدي',
                        style: const TextStyle(fontSize: 10, color: AppColors.muted),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // ── Modern Navigation Tabs (RTL Friendly) ──
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 14),
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: const Color(0xFFEBF2FA),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFD6E3F4)),
              ),
              child: Row(
                children: [
                  _buildTabPill(index: 0, label: 'بنك الأسئلة والتدريبات', icon: Icons.quiz_outlined),
                  _buildTabPill(index: 1, label: 'التعريفات النموذجية', icon: Icons.menu_book_rounded),
                  _buildTabPill(index: 2, label: 'المرفقات والواجب', icon: Icons.attachment_rounded),
                ],
              ),
            ),

            const SizedBox(height: 14),

            // ── Active Tab Body ──
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (_activeTab == 0) _buildQuestionsTab(),
                  if (_activeTab == 1) _buildDefinitionsTab(),
                  if (_activeTab == 2) _buildAttachmentsTab(context),
                ],
              ),
            ),

            const SizedBox(height: 90),
          ],
        ),
      ),
      const DraggableMistakesButton(),
    ],
  ),
);
  }

  Widget _buildTabPill({required int index, required String label, required IconData icon}) {
    final isSelected = _activeTab == index;
    return Expanded(
      child: InkWell(
        onTap: () {
          setState(() {
            _activeTab = index;
            if (index == 0 && _questions.isEmpty) {
              _loadQuestions();
            }
          });
        },
        splashColor: Colors.transparent,
        highlightColor: Colors.transparent,
        hoverColor: Colors.transparent,
        borderRadius: BorderRadius.circular(11),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(11),
            border: isSelected ? Border.all(color: const Color(0xFFD6E3F4), width: 1) : null,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                size: 17,
                color: isSelected ? AppColors.blue : const Color(0xFF718298),
              ),
              const SizedBox(height: 2),
              Text(
                label,
                style: TextStyle(
                  fontSize: 9.5,
                  fontWeight: isSelected ? FontWeight.w900 : FontWeight.w700,
                  color: isSelected ? AppColors.blueDark : const Color(0xFF718298),
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ══════════════════════════════════════════════════════════════
  // TAB 0: الزتونة والتعريفات (Definitions & Key Concepts)
  // ══════════════════════════════════════════════════════════════
  Widget _buildDefinitionsTab() {
    if (_isLoadingMaterial) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 40),
        child: Center(child: CircularProgressIndicator(strokeWidth: 2.5)),
      );
    }

    final authVm = context.read<AuthViewModel>();
    final isLanguages = authVm.currentStudent?.isLanguages ?? false;
    final bankDefs = CurriculumBankData.getDefinitionsForLesson(widget.lesson.title, isLanguages: isLanguages);
    final allDefs = bankDefs.isNotEmpty ? bankDefs : (_material?.definitions ?? []);
    final q = _defSearch.trim().toLowerCase();
    final defs = allDefs.where((d) {
      if (q.isEmpty) return true;
      return d.term.toLowerCase().contains(q) || d.meaning.toLowerCase().contains(q);
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Friendly Banner
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
          decoration: BoxDecoration(
            color: const Color(0xFFEFF6FF),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFBFDBFE)),
          ),
          child: Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: const Color(0xFFDBEAFE),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Center(
                  child: Icon(Icons.menu_book_rounded, color: AppColors.blueDark, size: 18),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text(
                      'المصطلحات والتعريفات النموذجية المعتمدة',
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w900,
                        color: AppColors.blueDark,
                      ),
                    ),
                    SizedBox(height: 1),
                    Text(
                      'جميع المفاهيم والمصطلحات المقررة طبقاً لنموذج الإجابة الوزاري المعتمد',
                      style: TextStyle(fontSize: 9.5, color: Color(0xFF1E3A8A)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 12),

        // Search Bar
        Container(
          height: 42,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFD7E2EF)),
          ),
          child: TextField(
            controller: _defSearchController,
            onChanged: (val) => setState(() => _defSearch = val),
            style: const TextStyle(fontSize: 11.5, color: AppColors.ink),
            textDirection: TextDirection.rtl,
            decoration: InputDecoration(
              hintText: 'بتدور على مصطلح أو تعريف معين؟...',
              hintStyle: const TextStyle(fontSize: 11, color: Color(0xFF8B9DB5)),
              hintTextDirection: TextDirection.rtl,
              prefixIcon: const Icon(Icons.search_rounded, color: AppColors.blue, size: 19),
              suffixIcon: _defSearch.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear_rounded, size: 16, color: AppColors.muted),
                      onPressed: () {
                        _defSearchController.clear();
                        setState(() => _defSearch = '');
                      },
                    )
                  : null,
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            ),
          ),
        ),

        const SizedBox(height: 12),

        if (defs.isEmpty)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 40),
            alignment: Alignment.center,
            child: const Text(
              'مفيش تعريفات مطابقة للبحث يا صديقي',
              style: TextStyle(fontSize: 11.5, color: Color(0xFF8B9DB5)),
            ),
          )
        else
          ...defs.map((def) => _buildDefinitionCard(def)),
      ],
    );
  }

  Widget _buildDefinitionCard(KholasaDefinition def) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2EAF4)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  def.term,
                  style: const TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w900,
                    color: AppColors.blueDark,
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.copy_rounded, size: 16, color: Color(0xFF718298)),
                splashColor: Colors.transparent,
                highlightColor: Colors.transparent,
                hoverColor: Colors.transparent,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                tooltip: 'نسخ التعريف',
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: '${def.term}: ${def.meaning}'));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      backgroundColor: AppColors.blue,
                      content: Text('تم نسخ التعريف بنجاح'),
                      duration: Duration(seconds: 1),
                    ),
                  );
                },
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            def.meaning,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: Color(0xFF334155),
              height: 1.55,
            ),
          ),
        ],
      ),
    );
  }


  // ══════════════════════════════════════════════════════════════
  // TAB 2: بنك الأسئلة (All Question Types: MCQ, True/False, Essay)
  // ══════════════════════════════════════════════════════════════
  Widget _buildQuestionsTab() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Friendly Banner
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
          decoration: BoxDecoration(
            color: const Color(0xFFEFF6FF),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFBFDBFE)),
          ),
          child: Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: const Color(0xFFDBEAFE),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Center(
                  child: Icon(Icons.quiz_rounded, color: AppColors.blueDark, size: 18),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text(
                      'بنك الأسئلة والتدريب الفوري',
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w900,
                        color: AppColors.blueDark,
                      ),
                    ),
                    SizedBox(height: 1),
                    Text(
                      'تدريب تفاعلي وتصحيح لحظي مع نموذج الإجابة والشرح',
                      style: TextStyle(fontSize: 9.5, color: Color(0xFF1E3A8A)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 12),

        // Type Filter Chips: MCQ, True/False, Essay with Live Counts
        Builder(
          builder: (context) {
            final allLessonQ = CurriculumBankData.getQuestionsForLesson(widget.lesson.title);
            final assessCount = allLessonQ.where((q) => q.isAssessment).length;
            final mcqCount = allLessonQ.where((q) => q.type == 'mcq').length;
            final tfCount = allLessonQ.where((q) => q.type == 'true_false').length;
            final essayCount = allLessonQ.where((q) => q.type == 'essay').length;

            return Row(
              children: [
                _buildTypeFilterChip(
                  typeKey: 'mcq',
                  label: mcqCount > 0 ? 'اختر ($mcqCount)' : 'اختر',
                ),
                const SizedBox(width: 5),
                _buildTypeFilterChip(
                  typeKey: 'true_false',
                  label: tfCount > 0 ? 'صح/خطأ ($tfCount)' : 'صح/خطأ',
                ),
                const SizedBox(width: 5),
                _buildTypeFilterChip(
                  typeKey: 'essay',
                  label: essayCount > 0 ? 'مقالي ($essayCount)' : 'مقالي',
                ),
                if (assessCount > 0) ...[
                  const SizedBox(width: 5),
                  _buildTypeFilterChip(
                    typeKey: 'assessment',
                    label: 'تقييمات ⭐ ($assessCount)',
                    isAssessmentHighlight: true,
                  ),
                ],
              ],
            );
          },
        ),

        const SizedBox(height: 14),

        if (_isLoadingQuestions)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 40),
            child: Center(child: CircularProgressIndicator(strokeWidth: 2.5)),
          )
        else if (_questions.isEmpty)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 40),
            alignment: Alignment.center,
            child: const Text('لا توجد أسئلة متوفرة حالياً في هذا القسم', style: TextStyle(fontSize: 11.5, color: AppColors.muted)),
          )
        else
          ..._questions.asMap().entries.map((entry) {
            final idx = entry.key;
            final q = entry.value;
            if (q.type == 'essay') {
              return _buildEssayCard(idx + 1, q);
            }
            return _buildChoiceCard(idx + 1, q);
          }),
      ],
    );
  }

  Widget _buildTypeFilterChip({
    required String typeKey,
    required String label,
    bool isAssessmentHighlight = false,
  }) {
    final isSelected = _qType == typeKey;
    final isGolden = isAssessmentHighlight;
    return Expanded(
      child: InkWell(
        onTap: () {
          if (_qType != typeKey) {
            setState(() => _qType = typeKey);
            _loadQuestions();
          }
        },
        splashColor: Colors.transparent,
        highlightColor: Colors.transparent,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: isSelected
                ? (isGolden ? const Color(0xFFFEF3C7) : AppColors.blue)
                : (isGolden ? const Color(0xFFFFFBEB) : Colors.white),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected
                  ? (isGolden ? const Color(0xFFF59E0B) : AppColors.blue)
                  : (isGolden ? const Color(0xFFFDE68A) : const Color(0xFFD6E3F4)),
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 9.5,
              fontWeight: isSelected ? FontWeight.w900 : FontWeight.w700,
              color: isSelected
                  ? (isGolden ? const Color(0xFF92400E) : Colors.white)
                  : (isGolden ? const Color(0xFFB45309) : const Color(0xFF64748B)),
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ),
    );
  }

  // MCQ & True/False Card
  Widget _buildChoiceCard(int index, KholasaQuestion question) {
    final result = _questionResults[question.id];
    final selectedIdx = _selectedOptions[question.id];
    final isChecking = _checkingQuestions.contains(question.id);

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2EAF5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 5,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header: Index & Difficulty
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      'سؤال $index',
                      style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: AppColors.blueDark),
                    ),
                  ),
                  if (question.isAssessment) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: question.isDirectAssessment ? const Color(0xFFFEF3C7) : const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: question.isDirectAssessment ? const Color(0xFFF59E0B) : const Color(0xFF93C5FD),
                          width: 1,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            question.isDirectAssessment ? Icons.star_rounded : Icons.verified_rounded,
                            size: 13,
                            color: question.isDirectAssessment ? const Color(0xFFB45309) : AppColors.blueDark,
                          ),
                          const SizedBox(width: 3),
                          Text(
                            question.isDirectAssessment
                                ? (question.assessmentCitation ?? 'تقييمات الوزارة ⭐')
                                : (question.assessmentCitation ?? 'تقييمات معتمدة 📘'),
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                              color: question.isDirectAssessment ? const Color(0xFF92400E) : AppColors.blueDark,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  question.type == 'true_false' ? 'صح أم خطأ' : 'درجة واحدة',
                  style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Color(0xFF475569)),
                ),
              ),
            ],
          ),

          const SizedBox(height: 10),

          // Question Prompt
          Text(
            question.prompt,
            style: const TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w800,
              color: AppColors.ink,
              height: 1.5,
            ),
          ),

          const SizedBox(height: 12),

          // Options
          ...question.options.asMap().entries.map((entry) {
            final optIdx = entry.key;
            final optText = entry.value;

            Color borderColor = const Color(0xFFE2EAF5);
            Color bgColor = const Color(0xFFF8FAFD);
            Widget? trailingIcon;

            if (result != null) {
              if (optIdx == result.correctOption) {
                borderColor = const Color(0xFF10B981);
                bgColor = const Color(0xFF10B981).withValues(alpha: 0.08);
                trailingIcon = const Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 18);
              } else if (optIdx == selectedIdx && !result.isCorrect) {
                borderColor = const Color(0xFFEF4444);
                bgColor = const Color(0xFFEF4444).withValues(alpha: 0.08);
                trailingIcon = const Icon(Icons.cancel_rounded, color: Color(0xFFEF4444), size: 18);
              }
            } else if (optIdx == selectedIdx) {
              borderColor = AppColors.blue;
              bgColor = const Color(0xFFEFF6FF);
            }

            return InkWell(
              onTap: () => _handleOptionSelect(question.id, optIdx),
              splashColor: Colors.transparent,
              highlightColor: Colors.transparent,
              borderRadius: BorderRadius.circular(10),
              child: Container(
                margin: const EdgeInsets.only(bottom: 7),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: bgColor,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: borderColor, width: 1.2),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 22,
                      height: 22,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        border: Border.all(color: borderColor, width: 1.2),
                      ),
                      child: Center(
                        child: Text(
                          String.fromCharCode(0x0623 + optIdx), // أ, ب, ج, د
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: borderColor == AppColors.blue ? AppColors.blue : const Color(0xFF475569),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        optText,
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.ink),
                      ),
                    ),
                    ?trailingIcon,
                  ],
                ),
              ),
            );
          }),

          if (isChecking)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 8),
              child: Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))),
            ),

          // Instant Result & Explanation Box
          if (result != null) ...[
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: result.isCorrect ? const Color(0xFFECFDF5) : const Color(0xFFFFF1F2),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: result.isCorrect ? const Color(0xFFA7F3D0) : const Color(0xFFFECDD3),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        result.isCorrect ? 'إجابة صحيحة، أحسنت.' : 'توضيح الإجابة الصحيحة:',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: result.isCorrect ? const Color(0xFF065F46) : const Color(0xFF9F1239),
                        ),
                      ),
                    ],
                  ),
                  if (result.explanation != null && result.explanation!.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      result.explanation!,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: result.isCorrect ? const Color(0xFF047857) : const Color(0xFFBE123C),
                        height: 1.45,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  // Essay Question Card
  Widget _buildEssayCard(int index, KholasaQuestion question) {
    final isRevealed = _revealedEssays.contains(question.id);

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2EAF5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 5,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      'سؤال مقالي $index',
                      style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: AppColors.blueDark),
                    ),
                  ),
                  if (question.isAssessment) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: question.isDirectAssessment ? const Color(0xFFFEF3C7) : const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: question.isDirectAssessment ? const Color(0xFFF59E0B) : const Color(0xFF93C5FD),
                          width: 1,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            question.isDirectAssessment ? Icons.star_rounded : Icons.verified_rounded,
                            size: 13,
                            color: question.isDirectAssessment ? const Color(0xFFB45309) : AppColors.blueDark,
                          ),
                          const SizedBox(width: 3),
                          Text(
                            question.isDirectAssessment
                                ? (question.assessmentCitation ?? 'تقييمات الوزارة ⭐')
                                : (question.assessmentCitation ?? 'تقييمات معتمدة 📘'),
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                              color: question.isDirectAssessment ? const Color(0xFF92400E) : AppColors.blueDark,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '${question.points} درجات',
                  style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Color(0xFF92400E)),
                ),
              ),
            ],
          ),

          const SizedBox(height: 10),

          // Question Prompt
          Text(
            question.prompt,
            style: const TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w800,
              color: AppColors.ink,
              height: 1.5,
            ),
          ),

          const SizedBox(height: 12),

          // Toggle Model Answer
          InkWell(
            onTap: () {
              setState(() {
                if (isRevealed) {
                  _revealedEssays.remove(question.id);
                } else {
                  _revealedEssays.add(question.id);
                }
              });
            },
            splashColor: Colors.transparent,
            highlightColor: Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
              decoration: BoxDecoration(
                color: isRevealed ? const Color(0xFFF1F5F9) : const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: isRevealed ? const Color(0xFFCBD5E1) : const Color(0xFFBFDBFE)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    isRevealed ? Icons.visibility_off_rounded : Icons.visibility_rounded,
                    size: 16,
                    color: isRevealed ? const Color(0xFF475569) : AppColors.blue,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    isRevealed ? 'إخفاء الإجابة النموذجية' : 'عرض الإجابة النموذجية وطريقة التفكير',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: isRevealed ? const Color(0xFF475569) : AppColors.blueDark,
                    ),
                  ),
                ],
              ),
            ),
          ),

          if (isRevealed && question.modelAnswer != null) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'نموذج إجابة د. محمود المهدي للحصول على الدرجة الكاملة:',
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w900,
                      color: AppColors.blueDark,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    question.modelAnswer!,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF334155),
                      height: 1.6,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ══════════════════════════════════════════════════════════════
  // TAB 3: المرفقات والمذكرات
  // ══════════════════════════════════════════════════════════════
  Widget _buildAttachmentsTab(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // 1. Download PDF Summary
        InkWell(
          onTap: _openPdf,
          splashColor: Colors.transparent,
          highlightColor: Colors.transparent,
          borderRadius: BorderRadius.circular(AppColors.radiusCard),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(AppColors.radiusCard),
              border: Border.all(color: AppColors.line),
              boxShadow: AppColors.cardShadow,
            ),
            child: Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Center(
                    child: Icon(Icons.picture_as_pdf_rounded, color: AppColors.blue, size: 20),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        'مذكرة ملخص الدرس (A4 جاهز للطباعة)',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.ink),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'أهم النقاط والتعريفات النموذجية المعتمدة من كتاب الوزارة',
                        style: TextStyle(fontSize: 10, color: AppColors.muted),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.download_rounded, color: AppColors.blue, size: 20),
              ],
            ),
          ),
        ),

        const SizedBox(height: 10),

        // 2. Upload Notebook Photo
        InkWell(
          onTap: () {
            showModalBottomSheet(
              context: context,
              isScrollControlled: true,
              backgroundColor: Colors.transparent,
              builder: (_) => LessonSummaryUploadSheet(lessonTitle: widget.lesson.title),
            );
          },
          splashColor: Colors.transparent,
          highlightColor: Colors.transparent,
          borderRadius: BorderRadius.circular(AppColors.radiusCard),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(AppColors.radiusCard),
              border: Border.all(color: AppColors.line),
              boxShadow: AppColors.cardShadow,
            ),
            child: Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Center(
                    child: Icon(Icons.camera_alt_outlined, color: AppColors.blue, size: 20),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        'رفع كشكول ملخص الدرس',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.ink),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'صوّر كشكولك للمراجعة والاعتماد والمتابعة',
                        style: TextStyle(fontSize: 10, color: AppColors.muted),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.upload_file_rounded, color: AppColors.blue, size: 20),
              ],
            ),
          ),
        ),

        const SizedBox(height: 18),

        // Confirm Attendance Button
        SizedBox(
          height: 44,
          child: ElevatedButton.icon(
            onPressed: _hasConfirmedAttendance ? null : _confirmAttendance,
            style: ElevatedButton.styleFrom(
              backgroundColor: _hasConfirmedAttendance ? AppColors.green : AppColors.blue,
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            icon: Icon(
              _hasConfirmedAttendance ? Icons.check_circle_rounded : Icons.check_rounded,
              size: 18,
            ),
            label: Text(
              _hasConfirmedAttendance ? 'تم تأكيد الحضور بنجاح يا بطل' : 'تأكيد مشاهدة الدرس وتسجيل الحضور',
              style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800),
            ),
          ),
        ),
      ],
    );
  }
}
