import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:student_app/core/constants/app_colors.dart';
import 'package:student_app/core/constants/app_icons.dart';
import 'package:student_app/core/services/sound_service.dart';
import 'package:student_app/data/datasources/curriculum_bank_data.dart';
import 'package:student_app/data/repositories/mistakes_repository.dart';
import 'package:student_app/domain/entities/kholasa.dart';
import 'package:student_app/domain/entities/mistake_item.dart';
import 'package:student_app/domain/entities/quiz.dart';
import 'package:student_app/domain/repositories/i_quizzes_repository.dart';
import 'package:student_app/presentation/viewmodels/auth_viewmodel.dart';
import 'quiz_player_view.dart';

class QuizzesView extends StatefulWidget {
  const QuizzesView({super.key});

  @override
  State<QuizzesView> createState() => _QuizzesViewState();
}

class _QuizzesViewState extends State<QuizzesView> {
  // Main Tab: 0 = Question Bank (بنك الأسئلة), 1 = Scheduled Exams (الامتحانات)
  int _mainTab = 0;

  // Mistakes repository for tracking wrong answers
  final _mistakesRepo = MistakesRepository();

  // Exams State
  bool _isLoadingQuizzes = false;
  List<Quiz> _quizzes = [];
  String _examFilter = 'all';

  // Bank State
  bool _isBankLoading = true;
  String _selectedUnit = 'الكل';
  String _selectedLesson = 'الكل';
  String _selectedType = 'all'; // all, mcq, true_false, essay
  bool _isSearchVisible = false;
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  int _currentPage = 1;
  static const int _pageSize = 10;

  final Map<int, int> _selectedOptions = {};
  final Map<int, bool> _checkedAnswers = {};
  final Set<int> _revealedEssayAnswers = {};

  @override
  void initState() {
    super.initState();
    _loadAll();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadAll() async {
    _loadBank();
    _loadQuizzes();
  }

  Future<void> _loadBank() async {
    setState(() => _isBankLoading = true);
    await CurriculumBankData.load();
    if (mounted) {
      setState(() => _isBankLoading = false);
    }
  }

  Future<void> _loadQuizzes() async {
    setState(() => _isLoadingQuizzes = true);
    final authVm = context.read<AuthViewModel>();
    final repo = context.read<IQuizzesRepository>();

    final res = await repo.getQuizzes(stage: authVm.currentStudent?.stage);
    if (mounted) {
      setState(() {
        _quizzes = res.dataOrNull ?? [];
        _isLoadingQuizzes = false;
      });
    }
  }

  List<KholasaQuestion> _getFilteredQuestions() {
    List<KholasaQuestion> list = CurriculumBankData.allQuestions;

    // Unit filter
    if (_selectedUnit != 'الكل') {
      list = CurriculumBankData.questionsByUnit[_selectedUnit] ?? list;
    }

    // Lesson filter
    if (_selectedLesson != 'الكل') {
      list = list.where((q) => q.lesson == _selectedLesson).toList();
    }

    // Type filter
    if (_selectedType != 'all') {
      if (_selectedType == 'assessment') {
        list = list.where((q) => q.isAssessment).toList();
      } else {
        list = list.where((q) => q.type == _selectedType).toList();
      }
    }

    // Search query
    if (_searchQuery.trim().isNotEmpty) {
      final q = _searchQuery.trim().toLowerCase();
      list = list.where((item) {
        return item.prompt.toLowerCase().contains(q) ||
            (item.explanation?.toLowerCase().contains(q) ?? false) ||
            item.options.any((opt) => opt.toLowerCase().contains(q));
      }).toList();
    }

    return list;
  }

  void _recordMistakeForQuestion(KholasaQuestion q, int selectedOpt) {
    if (q.type == 'essay') return;
    final isCorrect = selectedOpt == q.correctIndex;

    if (!isCorrect) {
      SoundService().playWrong();
      final item = MistakeItem(
        id: 'qbank-${q.id}',
        lessonTitle: q.lesson ?? 'الدرس الأول',
        unitName: q.unit ?? 'الوحدة الأولى',
        questionPrompt: q.prompt,
        options: q.options,
        userSelectedIdx: selectedOpt,
        correctIdx: q.correctIndex,
        explanation: q.explanation ?? '',
        timestamp: DateTime.now(),
        isAssessment: q.isAssessment,
        assessmentCitation: q.assessmentCitation,
      );
      _mistakesRepo.recordMistake(item);
    } else {
      SoundService().playCorrect();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ── Sleek Compact Header ──
          _buildHeader(),

          // ── Tab Body ──
          Expanded(
            child: _mainTab == 0 ? _buildCleanBankBody() : _buildExamsTabBody(),
          ),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // ── Header Component (Compact, Elegant, No Clutter) ──
  // ═══════════════════════════════════════════════════════════════
  Widget _buildHeader() {
    return Container(
      padding: EdgeInsets.fromLTRB(
        16,
        MediaQuery.of(context).padding.top + 8,
        16,
        12,
      ),
      decoration: const BoxDecoration(
        color: AppColors.blue,
        borderRadius: BorderRadius.vertical(
          bottom: Radius.circular(22),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.of(context).maybePop(),
                    icon: const Icon(AppIcons.arrowRight, color: Colors.white, size: 22),
                    tooltip: 'رجوع',
                    style: IconButton.styleFrom(
                      backgroundColor: Colors.white.withValues(alpha: 0.15),
                      padding: const EdgeInsets.all(6),
                      minimumSize: const Size(36, 36),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'بنك الأسئلة والتدريبات',
                    style: GoogleFonts.cairo(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  IconButton(
                    onPressed: () {
                      setState(() {
                        _isSearchVisible = !_isSearchVisible;
                        if (!_isSearchVisible) {
                          _searchController.clear();
                          _searchQuery = '';
                        }
                      });
                    },
                    tooltip: 'بحث',
                    icon: Icon(
                      _isSearchVisible ? Icons.search_off_rounded : Icons.search_rounded,
                      color: Colors.white,
                      size: 20,
                    ),
                    style: IconButton.styleFrom(
                      backgroundColor: Colors.white.withValues(alpha: 0.15),
                      padding: const EdgeInsets.all(6),
                      minimumSize: const Size(36, 36),
                    ),
                  ),
                  const SizedBox(width: 6),
                  IconButton(
                    onPressed: _loadAll,
                    tooltip: 'تحديث',
                    icon: const Icon(Icons.refresh_rounded, color: Colors.white, size: 20),
                    style: IconButton.styleFrom(
                      backgroundColor: Colors.white.withValues(alpha: 0.15),
                      padding: const EdgeInsets.all(6),
                      minimumSize: const Size(36, 36),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Main Segmented Switcher (بنك الأسئلة vs الامتحانات)
          Container(
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.16),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Expanded(
                  child: _buildHeaderTabPill(
                    index: 0,
                    title: 'بنك الأسئلة',
                    count: '${CurriculumBankData.allQuestions.length}',
                    icon: Icons.menu_book_rounded,
                  ),
                ),
                const SizedBox(width: 4),
                Expanded(
                  child: _buildHeaderTabPill(
                    index: 1,
                    title: 'الامتحانات',
                    count: '${_quizzes.length}',
                    icon: Icons.assignment_turned_in_rounded,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeaderTabPill({
    required int index,
    required String title,
    required String count,
    required IconData icon,
  }) {
    final isSelected = _mainTab == index;

    return InkWell(
      onTap: () => setState(() => _mainTab = index),
      borderRadius: BorderRadius.circular(9),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(9),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 15,
              color: isSelected ? AppColors.blue : Colors.white70,
            ),
            const SizedBox(width: 6),
            Text(
              title,
              style: GoogleFonts.cairo(
                fontSize: 11.5,
                fontWeight: isSelected ? FontWeight.w900 : FontWeight.w700,
                color: isSelected ? AppColors.blue : Colors.white,
              ),
            ),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              decoration: BoxDecoration(
                color: isSelected ? const Color(0xFFEFF6FF) : Colors.white.withValues(alpha: 0.22),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                count,
                style: GoogleFonts.cairo(
                  fontSize: 9.5,
                  fontWeight: FontWeight.bold,
                  color: isSelected ? AppColors.blueDark : Colors.white,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // ── Clean, Spacious Question Bank View (No Clutter) ──
  // ═══════════════════════════════════════════════════════════════
  Widget _buildCleanBankBody() {
    if (_isBankLoading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.blue));
    }

    final filtered = _getFilteredQuestions();
    final totalCount = filtered.length;
    final totalPages = (totalCount / _pageSize).ceil();
    final int safePage = _currentPage.clamp(1, math.max(1, totalPages)).toInt();
    final int startIdx = (safePage - 1) * _pageSize;
    final int endIdx = math.min(startIdx + _pageSize, totalCount);
    final pageQuestions = totalCount == 0 ? <KholasaQuestion>[] : filtered.sublist(startIdx, endIdx);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // ── Single Compact Filter Strip (Replaces 4 stacked rows) ──
        _buildCompactFilterStrip(totalCount),

        // ── Expandable Search Input (only when toggled) ──
        if (_isSearchVisible)
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 8),
            child: Container(
              height: 36,
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFCBD5E1)),
              ),
              child: TextField(
                controller: _searchController,
                textDirection: TextDirection.rtl,
                autofocus: true,
                onChanged: (val) {
                  setState(() {
                    _searchQuery = val;
                    _currentPage = 1;
                  });
                },
                style: GoogleFonts.cairo(fontSize: 12),
                decoration: InputDecoration(
                  hintText: 'ابحث في نصوص الأسئلة والإجابات...',
                  hintStyle: GoogleFonts.cairo(fontSize: 11, color: const Color(0xFF94A3B8)),
                  prefixIcon: const Icon(Icons.search_rounded, size: 16, color: Color(0xFF64748B)),
                  suffixIcon: _searchQuery.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear_rounded, size: 15, color: Color(0xFF64748B)),
                          onPressed: () {
                            _searchController.clear();
                            setState(() {
                              _searchQuery = '';
                              _currentPage = 1;
                            });
                          },
                        )
                      : null,
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(vertical: 8),
                ),
              ),
            ),
          ),

        // ── Active Filters Breadcrumb (if any filter is active) ──
        if (_selectedUnit != 'الكل' || _selectedLesson != 'الكل' || _selectedType != 'all')
          _buildActiveFiltersBar(),

        // ── Questions List with generous breathing room ──
        Expanded(
          child: pageQuestions.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.search_off_rounded, size: 44, color: Color(0xFF94A3B8)),
                        const SizedBox(height: 8),
                        Text(
                          'لا توجد أسئلة تطابق الفلاتر المحددة',
                          style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.bold, color: const Color(0xFF64748B)),
                        ),
                        const SizedBox(height: 8),
                        TextButton(
                          onPressed: () {
                            setState(() {
                              _selectedUnit = 'الكل';
                              _selectedLesson = 'الكل';
                              _selectedType = 'all';
                              _searchQuery = '';
                              _searchController.clear();
                              _currentPage = 1;
                            });
                          },
                          child: Text(
                            'إعادة ضبط جميع الفلاتر',
                            style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.blue),
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(14, 10, 14, 90),
                  itemCount: pageQuestions.length,
                  itemBuilder: (context, idx) {
                    final q = pageQuestions[idx];
                    final qNum = startIdx + idx + 1;
                    return _buildSpaciousQuestionCard(q, qNum);
                  },
                ),
        ),

        // ── Clean Pagination Footer ──
        if (totalPages > 1) _buildPaginationFooter(safePage, totalPages),
      ],
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // ── Compact Filter Strip ──
  // ═══════════════════════════════════════════════════════════════
  Widget _buildCompactFilterStrip(int totalCount) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      child: Row(
        children: [
          // Unit Picker Trigger
          InkWell(
            onTap: _showUnitPickerSheet,
            borderRadius: BorderRadius.circular(16),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: _selectedUnit != 'الكل' ? const Color(0xFFEFF6FF) : const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: _selectedUnit != 'الكل' ? AppColors.blue : const Color(0xFFE2E8F0),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.folder_open_rounded, size: 14, color: AppColors.blue),
                  const SizedBox(width: 4),
                  Text(
                    _selectedUnit == 'الكل' ? 'الوحدة: الكل' : _selectedUnit.split(':').first,
                    style: GoogleFonts.cairo(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: _selectedUnit != 'الكل' ? AppColors.blueDark : const Color(0xFF475569),
                    ),
                  ),
                  const Icon(Icons.arrow_drop_down_rounded, size: 16, color: Color(0xFF64748B)),
                ],
              ),
            ),
          ),
          const SizedBox(width: 6),

          // Type Picker Trigger
          InkWell(
            onTap: _showTypePickerSheet,
            borderRadius: BorderRadius.circular(16),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: _selectedType != 'all' ? const Color(0xFFFEF3C7) : const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: _selectedType != 'all' ? const Color(0xFFF59E0B) : const Color(0xFFE2E8F0),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.tune_rounded, size: 13, color: Color(0xFFB45309)),
                  const SizedBox(width: 4),
                  Text(
                    _getTypeLabel(_selectedType),
                    style: GoogleFonts.cairo(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: _selectedType != 'all' ? const Color(0xFFB45309) : const Color(0xFF475569),
                    ),
                  ),
                  const Icon(Icons.arrow_drop_down_rounded, size: 16, color: Color(0xFF64748B)),
                ],
              ),
            ),
          ),

          const Spacer(),

          // Total Count Badge
          Text(
            '$totalCount سؤال',
            style: GoogleFonts.cairo(
              fontSize: 11.5,
              fontWeight: FontWeight.w800,
              color: const Color(0xFF0F172A),
            ),
          ),
        ],
      ),
    );
  }

  String _getTypeLabel(String type) {
    switch (type) {
      case 'assessment':
        return 'التقييمات الوزارية ⭐';
      case 'mcq':
        return 'اختيار من متعدد';
      case 'true_false':
        return 'صح أم خطأ';
      case 'essay':
        return 'أسئلة مقالية';
      default:
        return 'جميع الأنماط';
    }
  }

  Widget _buildActiveFiltersBar() {
    return Container(
      color: const Color(0xFFF1F5F9),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
      child: Row(
        children: [
          Text(
            'فلاتر مفعلة:',
            style: GoogleFonts.cairo(fontSize: 10.5, fontWeight: FontWeight.bold, color: const Color(0xFF64748B)),
          ),
          const SizedBox(width: 6),
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  if (_selectedUnit != 'الكل')
                    _buildFilterRemovableChip(_selectedUnit.split(':').first, () {
                      setState(() {
                        _selectedUnit = 'الكل';
                        _selectedLesson = 'الكل';
                        _currentPage = 1;
                      });
                    }),
                  if (_selectedLesson != 'الكل')
                    _buildFilterRemovableChip(_selectedLesson, () {
                      setState(() {
                        _selectedLesson = 'الكل';
                        _currentPage = 1;
                      });
                    }),
                  if (_selectedType != 'all')
                    _buildFilterRemovableChip(_getTypeLabel(_selectedType), () {
                      setState(() {
                        _selectedType = 'all';
                        _currentPage = 1;
                      });
                    }),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterRemovableChip(String label, VoidCallback onRemove) {
    return Container(
      margin: const EdgeInsets.only(left: 6),
      padding: const EdgeInsets.fromLTRB(8, 2, 4, 2),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFCBD5E1)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label, style: GoogleFonts.cairo(fontSize: 10, fontWeight: FontWeight.bold, color: const Color(0xFF334155))),
          const SizedBox(width: 3),
          InkWell(
            onTap: onRemove,
            child: const Icon(Icons.close_rounded, size: 13, color: Color(0xFF94A3B8)),
          ),
        ],
      ),
    );
  }

  // ── Unit Picker Bottom Sheet ──
  void _showUnitPickerSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        final units = ['الكل', ...CurriculumBankData.units];
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(
                      color: const Color(0xFFCBD5E1),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  'اختر الوحدة الدراسية',
                  style: GoogleFonts.cairo(fontSize: 14, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A)),
                ),
                const SizedBox(height: 10),
                ...units.map((u) {
                  final isSel = _selectedUnit == u;
                  final count = u == 'الكل'
                      ? CurriculumBankData.allQuestions.length
                      : (CurriculumBankData.questionsByUnit[u]?.length ?? 0);

                  return ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    title: Text(
                      u == 'الكل' ? 'جميع الوحدات ($count سؤال)' : '$u ($count سؤال)',
                      style: GoogleFonts.cairo(
                        fontSize: 12,
                        fontWeight: isSel ? FontWeight.w900 : FontWeight.w600,
                        color: isSel ? AppColors.blue : const Color(0xFF334155),
                      ),
                    ),
                    trailing: isSel ? const Icon(Icons.check_circle_rounded, color: AppColors.blue, size: 18) : null,
                    onTap: () {
                      Navigator.pop(ctx);
                      setState(() {
                        _selectedUnit = u;
                        _selectedLesson = 'الكل';
                        _currentPage = 1;
                      });
                    },
                  );
                }),
              ],
            ),
          ),
        );
      },
    );
  }

  // ── Type Picker Bottom Sheet ──
  void _showTypePickerSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        final types = [
          {'id': 'all', 'label': 'جميع الأنماط'},
          {'id': 'assessment', 'label': 'أسئلة التقييمات الوزارية ⭐'},
          {'id': 'mcq', 'label': 'اختيار من متعدد (MCQ)'},
          {'id': 'true_false', 'label': 'صح أم خطأ'},
          {'id': 'essay', 'label': 'أسئلة مقالية'},
        ];
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(
                      color: const Color(0xFFCBD5E1),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  'اختر نمط السؤال',
                  style: GoogleFonts.cairo(fontSize: 14, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A)),
                ),
                const SizedBox(height: 10),
                ...types.map((t) {
                  final id = t['id']!;
                  final label = t['label']!;
                  final isSel = _selectedType == id;

                  return ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    title: Text(
                      label,
                      style: GoogleFonts.cairo(
                        fontSize: 12,
                        fontWeight: isSel ? FontWeight.w900 : FontWeight.w600,
                        color: isSel ? AppColors.blue : const Color(0xFF334155),
                      ),
                    ),
                    trailing: isSel ? const Icon(Icons.check_circle_rounded, color: AppColors.blue, size: 18) : null,
                    onTap: () {
                      Navigator.pop(ctx);
                      setState(() {
                        _selectedType = id;
                        _currentPage = 1;
                      });
                    },
                  );
                }),
              ],
            ),
          ),
        );
      },
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // ── Spacious, Distinctive Question Card ──
  // ═══════════════════════════════════════════════════════════════
  Widget _buildSpaciousQuestionCard(KholasaQuestion q, int qNum) {
    final selectedOpt = _selectedOptions[q.id];
    final isChecked = _checkedAnswers[q.id] ?? false;
    final isEssayRevealed = _revealedEssayAnswers.contains(q.id);

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.025),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header Row
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
                decoration: BoxDecoration(
                  color: q.type == 'essay'
                      ? const Color(0xFFFEF3C7)
                      : (q.type == 'true_false' ? const Color(0xFFE0F2FE) : const Color(0xFFDBEAFE)),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  q.type == 'essay' ? 'سؤال مقالي' : (q.type == 'true_false' ? 'صح أم خطأ' : 'اختيار من متعدد'),
                  style: GoogleFonts.cairo(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: q.type == 'essay'
                        ? const Color(0xFFB45309)
                        : (q.type == 'true_false' ? const Color(0xFF0369A1) : const Color(0xFF1E40AF)),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'سؤال $qNum',
                style: GoogleFonts.cairo(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF64748B),
                ),
              ),
              if (q.isAssessment) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: q.isDirectAssessment ? const Color(0xFFFEF3C7) : const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      color: q.isDirectAssessment ? const Color(0xFFF59E0B) : const Color(0xFF93C5FD),
                      width: 1,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        q.isDirectAssessment ? Icons.star_rounded : Icons.verified_rounded,
                        size: 13,
                        color: q.isDirectAssessment ? const Color(0xFFB45309) : const Color(0xFF1E40AF),
                      ),
                      const SizedBox(width: 3),
                      Text(
                        q.isDirectAssessment
                            ? (q.assessmentCitation ?? 'تقييمات الوزارة ⭐')
                            : (q.assessmentCitation ?? 'تقييمات معتمدة 📘'),
                        style: GoogleFonts.cairo(
                          fontSize: 9.5,
                          fontWeight: FontWeight.bold,
                          color: q.isDirectAssessment ? const Color(0xFF92400E) : const Color(0xFF1E40AF),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const Spacer(),
              if (q.unit != null)
                Flexible(
                  child: Text(
                    q.unit!.split(':').first,
                    style: GoogleFonts.cairo(fontSize: 10, color: const Color(0xFF94A3B8)),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),

          // Question Prompt
          Text(
            q.prompt,
            style: GoogleFonts.cairo(
              fontSize: 13.5,
              fontWeight: FontWeight.w800,
              color: const Color(0xFF0F172A),
              height: 1.48,
            ),
          ),
          const SizedBox(height: 12),

          // Options (MCQ & True/False)
          if (q.type != 'essay' && q.options.isNotEmpty)
            ...q.options.asMap().entries.map((optEntry) {
              final optIdx = optEntry.key;
              final optText = optEntry.value;
              final isThisSelected = selectedOpt == optIdx;
              final isCorrectOption = optIdx == q.correctIndex;

              Color optBg = const Color(0xFFF8FAFC);
              Color optBorder = const Color(0xFFCBD5E1);

              if (isChecked) {
                if (isCorrectOption) {
                  optBg = const Color(0xFFD1FAE5);
                  optBorder = const Color(0xFF10B981);
                } else if (isThisSelected) {
                  optBg = const Color(0xFFFEE2E2);
                  optBorder = const Color(0xFFEF4444);
                }
              } else if (isThisSelected) {
                optBg = const Color(0xFFEFF6FF);
                optBorder = AppColors.blue;
              }

              return InkWell(
                onTap: () {
                  setState(() {
                    _selectedOptions[q.id] = optIdx;
                    _checkedAnswers[q.id] = true;
                  });
                  _recordMistakeForQuestion(q, optIdx);
                },
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  margin: const EdgeInsets.only(bottom: 7),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: optBg,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: optBorder, width: 1.2),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        isChecked
                            ? (isCorrectOption
                                ? Icons.check_circle_rounded
                                : (isThisSelected ? Icons.cancel_rounded : Icons.radio_button_unchecked_rounded))
                            : (isThisSelected ? Icons.radio_button_checked_rounded : Icons.radio_button_unchecked_rounded),
                        size: 16,
                        color: isChecked
                            ? (isCorrectOption
                                ? const Color(0xFF10B981)
                                : (isThisSelected ? const Color(0xFFEF4444) : const Color(0xFF94A3B8)))
                            : (isThisSelected ? AppColors.blue : const Color(0xFF94A3B8)),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          optText,
                          style: GoogleFonts.cairo(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFF1E293B),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),

          // Essay Reveal Button
          if (q.type == 'essay') ...[
            InkWell(
              onTap: () {
                setState(() {
                  if (isEssayRevealed) {
                    _revealedEssayAnswers.remove(q.id);
                  } else {
                    _revealedEssayAnswers.add(q.id);
                  }
                });
              },
              borderRadius: BorderRadius.circular(8),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: isEssayRevealed ? const Color(0xFFFEF3C7) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isEssayRevealed ? const Color(0xFFF59E0B) : const Color(0xFFCBD5E1),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      isEssayRevealed ? Icons.visibility_off_rounded : Icons.visibility_rounded,
                      size: 16,
                      color: isEssayRevealed ? const Color(0xFFB45309) : const Color(0xFF475569),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      isEssayRevealed ? 'إخفاء الإجابة النموذجية' : 'عرض الإجابة النموذجية',
                      style: GoogleFonts.cairo(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: isEssayRevealed ? const Color(0xFFB45309) : const Color(0xFF475569),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (isEssayRevealed && q.modelAnswer != null && q.modelAnswer!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFFBEB),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFFDE68A)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.check_circle_outline_rounded, size: 16, color: Color(0xFFD97706)),
                        const SizedBox(width: 6),
                        Text(
                          'الإجابة النموذجية:',
                          style: GoogleFonts.cairo(
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            color: const Color(0xFFB45309),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      q.modelAnswer!,
                      style: GoogleFonts.cairo(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF78350F),
                        height: 1.45,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],

          // Explanation Banner
          if (isChecked && q.explanation != null && q.explanation!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFBBF7D0)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.lightbulb_outline_rounded, size: 16, color: Color(0xFF166534)),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      q.explanation!,
                      style: GoogleFonts.cairo(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF166534),
                        height: 1.4,
                      ),
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

  // ═══════════════════════════════════════════════════════════════
  // ── Pagination Footer ──
  // ═══════════════════════════════════════════════════════════════
  Widget _buildPaginationFooter(int safePage, int totalPages) {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            // السابق (On Right in RTL, points right >)
            OutlinedButton(
              onPressed: safePage > 1
                  ? () => setState(() => _currentPage--)
                  : null,
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                side: BorderSide(color: safePage > 1 ? AppColors.blue : const Color(0xFFCBD5E1)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('السابق', style: GoogleFonts.cairo(fontSize: 11.5, fontWeight: FontWeight.bold)),
                  const SizedBox(width: 4),
                  const Icon(AppIcons.chevronRight, size: 18),
                ],
              ),
            ),

            Text(
              'صفحة $safePage من $totalPages',
              style: GoogleFonts.cairo(
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF334155),
              ),
            ),

            // التالي (On Left in RTL, points left <)
            OutlinedButton(
              onPressed: safePage < totalPages
                  ? () => setState(() => _currentPage++)
                  : null,
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                side: BorderSide(color: safePage < totalPages ? AppColors.blue : const Color(0xFFCBD5E1)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(AppIcons.chevronLeft, size: 18),
                  const SizedBox(width: 4),
                  Text('التالي', style: GoogleFonts.cairo(fontSize: 11.5, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // ── Exams Tab: Scheduled / Platform Online Exams ──
  // ═══════════════════════════════════════════════════════════════
  Widget _buildExamsTabBody() {
    if (_isLoadingQuizzes) {
      return const Center(child: CircularProgressIndicator(color: AppColors.blue));
    }

    final filtered = _quizzes.where((q) {
      if (_examFilter == 'available') return !q.isCompleted;
      if (_examFilter == 'completed') return q.isCompleted;
      return true;
    }).toList();

    return RefreshIndicator(
      color: AppColors.blue,
      onRefresh: _loadQuizzes,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 90),
        children: [
          // Filter Row
          Row(
            children: [
              _buildExamFilterChip(id: 'all', label: 'الكل (${_quizzes.length})'),
              const SizedBox(width: 7),
              _buildExamFilterChip(id: 'available', label: 'متاحة للحل'),
              const SizedBox(width: 7),
              _buildExamFilterChip(id: 'completed', label: 'تم الحل'),
            ],
          ),
          const SizedBox(height: 14),

          if (filtered.isEmpty)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 50),
              alignment: Alignment.center,
              child: Text(
                'لا توجد اختبارات في هذا القسم حالياً',
                style: GoogleFonts.cairo(fontSize: 12, color: const Color(0xFF8B9DB5)),
              ),
            )
          else
            ...filtered.map((quiz) => _buildQuizCard(quiz)),
        ],
      ),
    );
  }

  Widget _buildExamFilterChip({required String id, required String label}) {
    final isSelected = _examFilter == id;
    return InkWell(
      onTap: () => setState(() => _examFilter = id),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.blue : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppColors.blue : const Color(0xFFD9E5F2),
          ),
        ),
        child: Text(
          label,
          style: GoogleFonts.cairo(
            fontSize: 10.5,
            fontWeight: FontWeight.w700,
            color: isSelected ? Colors.white : const Color(0xFF7890AA),
          ),
        ),
      ),
    );
  }

  Widget _buildQuizCard(Quiz quiz) {
    final isCompleted = quiz.isCompleted;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppColors.radiusCard),
        border: Border.all(color: AppColors.line),
        boxShadow: AppColors.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: isCompleted ? const Color(0xFFE7F8EF) : const Color(0xFFEAF3FF),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Center(
                  child: Icon(
                    isCompleted ? Icons.military_tech_outlined : Icons.quiz_outlined,
                    color: isCompleted ? const Color(0xFF1D9B72) : AppColors.blue,
                    size: 24,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      quiz.title,
                      style: GoogleFonts.cairo(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: AppColors.ink,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '${quiz.stage} · ${quiz.questions.length} أسئلة · ${quiz.durationMinutes ?? 25} دقيقة',
                      style: GoogleFonts.cairo(
                        fontSize: 9.5,
                        color: AppColors.muted,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isCompleted ? AppColors.greenLight : AppColors.soft,
                  borderRadius: BorderRadius.circular(15),
                ),
                child: Text(
                  isCompleted ? 'تم الحل بنجاح' : 'جاهز للبدء',
                  style: GoogleFonts.cairo(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w700,
                    color: isCompleted ? const Color(0xFF078456) : AppColors.blueDark,
                  ),
                ),
              ),
              if (isCompleted && quiz.lastScore != null)
                Text(
                  '${quiz.lastScore}%',
                  style: GoogleFonts.cairo(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w900,
                    color: const Color(0xFF118860),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 11),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => QuizPlayerView(quiz: quiz),
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: isCompleted ? const Color(0xFFF0F6FF) : AppColors.blue,
              foregroundColor: isCompleted ? AppColors.blueDark : Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppColors.radiusButton),
              ),
              padding: const EdgeInsets.symmetric(vertical: 8),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  isCompleted ? 'إعادة المحاولة أو مراجعة الإجابات' : 'ابدأ الاختبار الآن',
                  style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.w800),
                ),
                const SizedBox(width: 4),
                const Icon(AppIcons.chevronLeft, size: 16),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
