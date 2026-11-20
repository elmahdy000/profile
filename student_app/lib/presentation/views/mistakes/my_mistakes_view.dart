import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_app/core/constants/app_colors.dart';
import 'package:student_app/core/constants/app_icons.dart';
import 'package:student_app/core/services/sound_service.dart';
import 'package:student_app/core/utils/app_toast.dart';
import 'package:student_app/data/repositories/mistakes_repository.dart';
import 'package:student_app/domain/entities/mistake_item.dart';

class MyMistakesView extends StatefulWidget {
  const MyMistakesView({super.key});

  @override
  State<MyMistakesView> createState() => _MyMistakesViewState();
}

class _MyMistakesViewState extends State<MyMistakesView> {
  final _repository = MistakesRepository();
  List<MistakeItem> _questions = [];
  bool _isLoading = true;
  String _selectedFilter = 'all';

  // Questions currently celebrating mastery before sliding out
  final Set<String> _masteredCelebratingIds = {};

  // Questions currently being dismissed with exit animation
  final Set<String> _dismissingIds = {};

  // Interactive self-testing state
  final Map<String, int?> _testChoices = {};
  final Set<String> _testAnswered = {};
  final Set<String> _testCorrectIds = {};

  @override
  void initState() {
    super.initState();
    _loadQuestions();
  }

  Future<void> _loadQuestions() async {
    setState(() => _isLoading = true);
    final items = await _repository.getMistakes();
    if (mounted) {
      setState(() {
        _questions = items;
        _isLoading = false;
      });
    }
  }

  Future<void> _handleUnderstood(String id) async {
    if (_masteredCelebratingIds.contains(id) || _dismissingIds.contains(id)) return;

    // 1. Trigger celebratory audio & green triumph state
    SoundService().playComplete();
    setState(() {
      _masteredCelebratingIds.add(id);
    });

    AppToast.showSuccess(context, 'عاش يا بطل! تم استيعاب السؤال وتثبيته بنجاح 🎯');

    // 2. Allow celebratory visual punch to shine for 420ms
    await Future.delayed(const Duration(milliseconds: 420));
    if (!mounted) return;

    // 3. Trigger smooth slide-out and fade exit animation
    setState(() {
      _dismissingIds.add(id);
    });

    await Future.delayed(const Duration(milliseconds: 360));
    await _repository.resolveMistake(id);

    if (mounted) {
      setState(() {
        _questions.removeWhere((item) => item.id == id);
        _masteredCelebratingIds.remove(id);
        _dismissingIds.remove(id);
        _testChoices.remove(id);
        _testAnswered.remove(id);
        _testCorrectIds.remove(id);
      });
    }
  }

  (Color, Color, IconData, String) _getUnitStyle(String unitName) {
    final lower = unitName.toLowerCase();
    if (lower.contains('الأولى') || lower.contains('الاولى') || lower.contains('الذكاء') || lower.contains('1')) {
      return (
        const Color(0xFF2563EB),
        const Color(0xFF38BDF8),
        Icons.psychology_rounded,
        'الوحدة الأولى: الذكاء الاصطناعي والمجتمع',
      );
    }
    if (lower.contains('الثانية') || lower.contains('التانية') || lower.contains('السيبراني') || lower.contains('التشفير') || lower.contains('2')) {
      return (
        const Color(0xFFE11D48),
        const Color(0xFFFB7185),
        Icons.security_rounded,
        'الوحدة الثانية: الأمن السيبراني والتشفير',
      );
    }
    if (lower.contains('الثالثة') || lower.contains('التالتة') || lower.contains('الويب') || lower.contains('3')) {
      return (
        const Color(0xFF0D9488),
        const Color(0xFF2DD4BF),
        Icons.language_rounded,
        'الوحدة الثالثة: تطبيقات الويب',
      );
    }
    return (
      const Color(0xFF4F46E5),
      const Color(0xFF818CF8),
      Icons.menu_book_rounded,
      unitName,
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _questions.where((item) {
      if (_selectedFilter == 'all') return true;
      final u = item.unitName;
      if (_selectedFilter == 'unit1') {
        return u.contains('الأولى') || u.contains('الاولى') || u.contains('الذكاء') || u.contains('1');
      }
      if (_selectedFilter == 'unit2') {
        return u.contains('الثانية') || u.contains('التانية') || u.contains('السيبراني') || u.contains('التشفير') || u.contains('2');
      }
      if (_selectedFilter == 'unit3') {
        return u.contains('الثالثة') || u.contains('التالتة') || u.contains('الويب') || u.contains('3');
      }
      if (_selectedFilter == 'unit4') {
        return u.contains('الرابعة') || u.contains('الرابعه') || u.contains('الوسائط') || u.contains('4');
      }
      return true;
    }).toList();

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        body: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Executive Academic Blue Header (Title: أخطائي ومراجعاتي) ──
            Container(
              padding: EdgeInsets.fromLTRB(
                16,
                MediaQuery.of(context).padding.top + 10,
                16,
                18,
              ),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF0F172A), Color(0xFF1E3A8A), Color(0xFF2563EB)],
                  begin: Alignment.topRight,
                  end: Alignment.bottomLeft,
                ),
                borderRadius: BorderRadius.vertical(
                  bottom: Radius.circular(26),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Color.fromRGBO(37, 99, 235, 0.28),
                    blurRadius: 20,
                    offset: Offset(0, 8),
                  ),
                ],
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      // Back Button (Guaranteed RTL right arrow →)
                      InkWell(
                        onTap: () => Navigator.of(context).pop(),
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.16),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
                          ),
                          child: const Center(
                            child: Icon(AppIcons.arrowRight, color: Colors.white, size: 22),
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),

                      // Screen Title
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'بنك أخطائي ومراجعاتي 🎯',
                              style: GoogleFonts.cairo(
                                fontSize: 18,
                                fontWeight: FontWeight.w900,
                                color: Colors.white,
                                letterSpacing: -0.2,
                              ),
                            ),
                            const SizedBox(height: 1),
                            Text(
                              'الأسئلة التي تحتاج تركيزاً مع فكرة الحل النموذجية من د. محمود',
                              style: GoogleFonts.cairo(
                                fontSize: 11,
                                color: Colors.white70,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 14),

                  // Curriculum Quick Stats Pill
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.psychology_rounded, color: Color(0xFF38BDF8), size: 17),
                            const SizedBox(width: 6),
                            Text(
                              '${_questions.length} أسئلة في مراجعتك',
                              style: GoogleFonts.cairo(
                                color: Colors.white,
                                fontSize: 11.5,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                        Container(width: 1, height: 16, color: Colors.white24),
                        Row(
                          children: [
                            const Icon(Icons.verified_rounded, color: Color(0xFF6EE7B7), size: 16),
                            const SizedBox(width: 6),
                            Text(
                              'ثبّت المفهوم واكسب التحدي',
                              style: GoogleFonts.cairo(
                                color: Colors.white,
                                fontSize: 11.5,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // ── Curriculum Filter Tabs ──
            Container(
              padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                child: Row(
                  children: [
                    _buildFilterChip('all', 'كل الأسئلة (${_questions.length})'),
                    const SizedBox(width: 8),
                    _buildFilterChip('unit1', 'الوحدة الأولى'),
                    const SizedBox(width: 8),
                    _buildFilterChip('unit2', 'الوحدة الثانية'),
                    const SizedBox(width: 8),
                    _buildFilterChip('unit3', 'الوحدة الثالثة'),
                  ],
                ),
              ),
            ),

            // ── Main Content List with Smooth Cascading Animations ──
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(strokeWidth: 2.5))
                  : filtered.isEmpty
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 24),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Container(
                                  width: 76,
                                  height: 76,
                                  decoration: const BoxDecoration(
                                    color: Color(0xFFECFDF5),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(Icons.verified_rounded, color: Color(0xFF10B981), size: 42),
                                )
                                    .animate()
                                    .scale(duration: 400.ms, curve: Curves.easeOutBack)
                                    .fadeIn(),
                                const SizedBox(height: 16),
                                Text(
                                  _questions.isEmpty
                                      ? 'ممتاز يا بطل! لا توجد أخطاء مسجلة حالياً 🎉'
                                      : 'لا توجد أخطاء متبقية في هذه الوحدة 👍',
                                  style: GoogleFonts.cairo(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w900,
                                    color: const Color(0xFF0F172A),
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  _questions.isEmpty
                                      ? 'كل إجاباتك صحيحة ومثبتة. عند مواجهة أي صعوبة في بنك الأسئلة أو الاختبارات، سيظهر السؤال هنا فوراً لتراجعه.'
                                      : 'انتقل للوحدات الأخرى أو تدرب على أسئلة إضافية من بنك الأسئلة.',
                                  textAlign: TextAlign.center,
                                  style: GoogleFonts.cairo(
                                    fontSize: 12,
                                    color: const Color(0xFF64748B),
                                    height: 1.55,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        )
                      : RefreshIndicator(
                          color: AppColors.blue,
                          onRefresh: _loadQuestions,
                          child: ListView.separated(
                            padding: const EdgeInsets.fromLTRB(16, 6, 16, 95),
                            physics: const BouncingScrollPhysics(),
                            itemCount: filtered.length,
                            separatorBuilder: (context, index) => const SizedBox(height: 16),
                            itemBuilder: (context, index) {
                              final item = filtered[index];
                              final isDismissing = _dismissingIds.contains(item.id);

                              return AnimatedSlide(
                                duration: const Duration(milliseconds: 360),
                                curve: Curves.easeInOutCubic,
                                offset: isDismissing ? const Offset(-1.25, -0.1) : Offset.zero,
                                child: AnimatedOpacity(
                                  duration: const Duration(milliseconds: 320),
                                  opacity: isDismissing ? 0.0 : 1.0,
                                  child: AnimatedScale(
                                    duration: const Duration(milliseconds: 340),
                                    scale: isDismissing ? 0.85 : 1.0,
                                    child: _buildRevisionCard(item, index + 1)
                                        .animate(key: ValueKey('${item.id}_$_selectedFilter'))
                                        .fadeIn(
                                          duration: 380.ms,
                                          delay: (index * 60).clamp(0, 360).ms,
                                          curve: Curves.easeOut,
                                        )
                                        .slideY(
                                          begin: 0.12,
                                          end: 0,
                                          duration: 400.ms,
                                          delay: (index * 60).clamp(0, 360).ms,
                                          curve: Curves.easeOutCubic,
                                        ),
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String key, String label) {
    final isSelected = _selectedFilter == key;
    return InkWell(
      onTap: () => setState(() => _selectedFilter = key),
      borderRadius: BorderRadius.circular(22),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOutCubic,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7.5),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF2563EB) : Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFE2E8F0),
            width: isSelected ? 1.5 : 1.0,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: const Color(0xFF2563EB).withValues(alpha: 0.28),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ]
              : [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.02),
                    blurRadius: 4,
                    offset: const Offset(0, 1),
                  ),
                ],
        ),
        child: Text(
          label,
          style: GoogleFonts.cairo(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w900 : FontWeight.w700,
            color: isSelected ? Colors.white : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // ── High-End Distinctive Mistake Card Design ──
  // ═══════════════════════════════════════════════════════════════
  Widget _buildRevisionCard(MistakeItem item, int questionNumber) {
    final isCelebrating = _masteredCelebratingIds.contains(item.id);
    final isTesting = _testChoices.containsKey(item.id);
    final userChoice = _testChoices[item.id];
    final hasSubmitted = _testAnswered.contains(item.id);
    final isTestCorrect = _testCorrectIds.contains(item.id);

    final (unitPrimary, unitSecondary, unitIcon, unitShortName) = _getUnitStyle(item.unitName);

    const arabicLetters = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

    return AnimatedContainer(
      duration: const Duration(milliseconds: 320),
      curve: Curves.easeOutCubic,
      decoration: BoxDecoration(
        color: isCelebrating ? const Color(0xFFF0FDF4) : Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: isCelebrating
              ? const Color(0xFF10B981)
              : (isTesting ? const Color(0xFF93C5FD) : const Color(0xFFE2E8F0)),
          width: isCelebrating ? 2.2 : (isTesting ? 1.5 : 1.2),
        ),
        boxShadow: isCelebrating
            ? [
                BoxShadow(
                  color: const Color(0xFF10B981).withValues(alpha: 0.35),
                  blurRadius: 22,
                  spreadRadius: 2,
                  offset: const Offset(0, 4),
                ),
              ]
            : [
                BoxShadow(
                  color: const Color(0xFF0F172A).withValues(alpha: 0.05),
                  blurRadius: 18,
                  offset: const Offset(0, 6),
                ),
                BoxShadow(
                  color: unitPrimary.withValues(alpha: 0.03),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(21),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Top Gradient Accent Stripe (Distinct per Unit) ──
            Container(
              height: 4,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: isCelebrating
                      ? [const Color(0xFF10B981), const Color(0xFF34D399)]
                      : [unitPrimary, unitSecondary],
                  begin: Alignment.centerRight,
                  end: Alignment.centerLeft,
                ),
              ),
            ),

            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // ── Celebration Triumph Banner (When Student Taps Mastered) ──
                  if (isCelebrating)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8.5),
                      margin: const EdgeInsets.only(bottom: 14),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF10B981), Color(0xFF059669)],
                          begin: Alignment.topRight,
                          end: Alignment.bottomLeft,
                        ),
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF10B981).withValues(alpha: 0.4),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.stars_rounded, color: Colors.white, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            'عاش يا بطل! تم استيعاب السؤال وتثبيته بنجاح 🎯🎉',
                            style: GoogleFonts.cairo(
                              color: Colors.white,
                              fontSize: 12.5,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ],
                      ),
                    ).animate().scale(duration: 250.ms, curve: Curves.easeOutBack),

                  // ── Card Header Row: Unit Pill + Question Number Badge ──
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Unit Badge with Icon
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4.5),
                            decoration: BoxDecoration(
                              color: unitPrimary.withValues(alpha: 0.10),
                              borderRadius: BorderRadius.circular(9),
                              border: Border.all(
                                color: unitPrimary.withValues(alpha: 0.25),
                                width: 1,
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(unitIcon, size: 14, color: unitPrimary),
                                const SizedBox(width: 5),
                                Text(
                                  unitShortName,
                                  style: GoogleFonts.cairo(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w800,
                                    color: unitPrimary,
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(width: 6),

                          // Target Pill
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7.5, vertical: 3.5),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFEF2F2),
                              borderRadius: BorderRadius.circular(7),
                              border: Border.all(color: const Color(0xFFFECACA), width: 1),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.flag_rounded, size: 11, color: Color(0xFFDC2626)),
                                const SizedBox(width: 3),
                                Text(
                                  'تثبيت مفهوم',
                                  style: GoogleFonts.cairo(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w800,
                                    color: const Color(0xFFDC2626),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),

                      // Question Number Badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3.5),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0F172A),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          'سؤال #$questionNumber',
                          style: GoogleFonts.cairo(
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ],
                  ),

                  // ── Lesson Subtitle ──
                  if (item.lessonTitle.isNotEmpty) ...[
                    const SizedBox(height: 7),
                    Row(
                      children: [
                        const Icon(Icons.bookmark_outline_rounded, size: 13, color: Color(0xFF64748B)),
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(
                            item.lessonTitle,
                            style: GoogleFonts.cairo(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF64748B),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],

                  const SizedBox(height: 12),

                  // ── Question Statement ──
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Text(
                      item.questionPrompt,
                      style: GoogleFonts.cairo(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF0F172A),
                        height: 1.55,
                      ),
                    ),
                  ),

                  // ── Test Mode Result Banner ──
                  if (isTesting && hasSubmitted) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: isTestCorrect ? const Color(0xFFECFDF5) : const Color(0xFFFFF1F2),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: isTestCorrect ? const Color(0xFFA7F3D0) : const Color(0xFFFECDD3),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            isTestCorrect ? Icons.check_circle_rounded : Icons.info_outline_rounded,
                            size: 16,
                            color: isTestCorrect ? const Color(0xFF059669) : const Color(0xFFE11D48),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              isTestCorrect
                                  ? 'إجابة صحيحة وممتازة! يمكنك الضغط على "فهمت السؤال خلاص" لإنهاء مراجعته.'
                                  : 'محاولة قريبة! قارن بين اختيارك والإجابة المعتمدة بالأخضر، واقرأ فكرة الحل.',
                              style: GoogleFonts.cairo(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: isTestCorrect ? const Color(0xFF065F46) : const Color(0xFF9F1239),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 14),

                  // ── 4 Options (Interactive in Self-Test Mode / High-Yield in Review Mode) ──
                  ...item.options.asMap().entries.map((entry) {
                    final optIdx = entry.key;
                    final optText = entry.value;
                    final letter = optIdx < arabicLetters.length ? arabicLetters[optIdx] : '${optIdx + 1}';

                    // ── Mode A: Interactive Self-Test Mode ──
                    if (isTesting && !hasSubmitted) {
                      final isSelected = userChoice == optIdx;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 9),
                        child: InkWell(
                          onTap: () {
                            SoundService().playTap();
                            setState(() {
                              _testChoices[item.id] = optIdx;
                            });
                          },
                          borderRadius: BorderRadius.circular(12),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 180),
                            curve: Curves.easeOutCubic,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            decoration: BoxDecoration(
                              color: isSelected ? const Color(0xFFEFF6FF) : Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFCBD5E1),
                                width: isSelected ? 1.6 : 1.0,
                              ),
                              boxShadow: isSelected
                                  ? [
                                      BoxShadow(
                                        color: const Color(0xFF2563EB).withValues(alpha: 0.18),
                                        blurRadius: 8,
                                        offset: const Offset(0, 2),
                                      ),
                                    ]
                                  : null,
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 24,
                                  height: 24,
                                  decoration: BoxDecoration(
                                    color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFF1F5F9),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Center(
                                    child: Text(
                                      letter,
                                      style: GoogleFonts.cairo(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w900,
                                        color: isSelected ? Colors.white : const Color(0xFF64748B),
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    optText,
                                    style: GoogleFonts.cairo(
                                      fontSize: 12,
                                      fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                                      color: isSelected ? const Color(0xFF1E3A8A) : const Color(0xFF1E293B),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    }

                    // ── Mode B: Reviewed or Self-Test Submitted Mode ──
                    final isCorrect = optIdx == item.correctIdx;
                    final isUserPreviousWrong = !isTesting && (optIdx == item.userSelectedIdx && !isCorrect);
                    final isUserTestedWrong = isTesting && hasSubmitted && (userChoice == optIdx && !isCorrect);

                    Color borderColor = const Color(0xFFE2E8F0);
                    Color bgColor = Colors.white;
                    Color letterBg = const Color(0xFFF1F5F9);
                    Color letterColor = const Color(0xFF64748B);
                    Color textColor = const Color(0xFF1E293B);
                    FontWeight textWeight = FontWeight.w600;
                    Widget? badge;

                    if (isCorrect) {
                      borderColor = const Color(0xFF10B981);
                      bgColor = const Color(0xFFF0FDF4);
                      letterBg = const Color(0xFF10B981);
                      letterColor = Colors.white;
                      textColor = const Color(0xFF065F46);
                      textWeight = FontWeight.w900;
                      badge = Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.check_circle_rounded, color: Colors.white, size: 12),
                            const SizedBox(width: 4),
                            Text(
                              'الإجابة النموذجية المعتمدة',
                              style: GoogleFonts.cairo(
                                color: Colors.white,
                                fontSize: 9.5,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      );
                    } else if (isUserPreviousWrong || isUserTestedWrong) {
                      borderColor = const Color(0xFFFDA4AF);
                      bgColor = const Color(0xFFFFF1F2);
                      letterBg = const Color(0xFFF43F5E);
                      letterColor = Colors.white;
                      textColor = const Color(0xFF881337);
                      textWeight = FontWeight.w700;
                      badge = Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFE4E6),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFFFECDD3)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.cancel_rounded, color: Color(0xFFE11D48), size: 12),
                            const SizedBox(width: 3),
                            Text(
                              isUserTestedWrong ? 'اختيارك (غير صحيح)' : 'إجابتك السابقة (غير صحيحة)',
                              style: GoogleFonts.cairo(
                                color: const Color(0xFFBE123C),
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      );
                    }

                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                      decoration: BoxDecoration(
                        color: bgColor,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: borderColor, width: isCorrect ? 1.4 : 1.0),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 24,
                            height: 24,
                            decoration: BoxDecoration(
                              color: letterBg,
                              shape: BoxShape.circle,
                            ),
                            child: Center(
                              child: isCorrect
                                  ? const Icon(Icons.check_rounded, color: Colors.white, size: 14)
                                  : (isUserPreviousWrong || isUserTestedWrong
                                      ? const Icon(Icons.close_rounded, color: Colors.white, size: 14)
                                      : Text(
                                          letter,
                                          style: GoogleFonts.cairo(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w900,
                                            color: letterColor,
                                          ),
                                        )),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              optText,
                              style: GoogleFonts.cairo(
                                fontSize: 11.8,
                                fontWeight: textWeight,
                                color: textColor,
                              ),
                            ),
                          ),
                          if (badge != null) ...[
                            const SizedBox(width: 8),
                            badge,
                          ],
                        ],
                      ),
                    );
                  }),

                  const SizedBox(height: 6),

                  // ── 💡 High-Yield Teacher Explanation Box (Dr. Mahmoud Elmahdy) ──
                  Container(
                    margin: const EdgeInsets.only(top: 8),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFFFFFBEB), Color(0xFFFEF3C7)],
                        begin: Alignment.topRight,
                        end: Alignment.bottomLeft,
                      ),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFFDE68A), width: 1.2),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFFD97706).withValues(alpha: 0.05),
                          blurRadius: 10,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: IntrinsicHeight(
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Gold Vertical Accent Ribbon
                          Container(
                            width: 4.5,
                            decoration: const BoxDecoration(
                              color: Color(0xFFF59E0B),
                              borderRadius: BorderRadius.only(
                                topRight: Radius.circular(14),
                                bottomRight: Radius.circular(14),
                              ),
                            ),
                          ),
                          Expanded(
                            child: Padding(
                              padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(4),
                                        decoration: const BoxDecoration(
                                          color: Color(0xFFFEF3C7),
                                          shape: BoxShape.circle,
                                        ),
                                        child: const Icon(
                                          Icons.lightbulb_rounded,
                                          color: Color(0xFFD97706),
                                          size: 16,
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        'إضاءة وفكرة الحل · د. محمود المهدي',
                                        style: GoogleFonts.cairo(
                                          fontSize: 11.5,
                                          fontWeight: FontWeight.w900,
                                          color: const Color(0xFF92400E),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    item.explanation.isEmpty
                                        ? 'راجع الدرس المقترن بهذا المفهوم لترسيخ الفهم وحل التدريبات المتشابهة.'
                                        : item.explanation,
                                    style: GoogleFonts.cairo(
                                      fontSize: 11.5,
                                      color: const Color(0xFF78350F),
                                      height: 1.55,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 14),

                  // ── Action Buttons Row ──
                  Row(
                    children: [
                      // Button 1: Retest Mode Toggle / Submit
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            SoundService().playTap();
                            setState(() {
                              if (!isTesting) {
                                _testChoices[item.id] = null;
                              } else if (!hasSubmitted && userChoice != null) {
                                _testAnswered.add(item.id);
                                if (userChoice == item.correctIdx) {
                                  SoundService().playCorrect();
                                  _testCorrectIds.add(item.id);
                                  AppToast.showSuccess(context, 'إجابة صحيحة مية بالمية! أحسنت 🌟');
                                } else {
                                  SoundService().playWrong();
                                  AppToast.showError(context, 'محاولة قريبة! راجع الإجابة المعتمدة وتفسير الحل');
                                }
                              } else {
                                _testChoices.remove(item.id);
                                _testAnswered.remove(item.id);
                                _testCorrectIds.remove(item.id);
                              }
                            });
                          },
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFF2563EB),
                            side: const BorderSide(color: Color(0xFF2563EB), width: 1.2),
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            backgroundColor: isTesting && !hasSubmitted && userChoice != null
                                ? const Color(0xFFEFF6FF)
                                : Colors.white,
                          ),
                          icon: Icon(
                            isTesting && !hasSubmitted
                                ? Icons.check_circle_outline_rounded
                                : Icons.autorenew_rounded,
                            size: 16,
                          ),
                          label: Text(
                            !isTesting
                                ? 'جرّب حلّه بنفسك 🔄'
                                : (!hasSubmitted
                                    ? (userChoice != null ? 'تأكيد إجابتي 🎯' : 'اختر إجابة')
                                    : 'إخفاء التجربة'),
                            style: GoogleFonts.cairo(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ),

                      const SizedBox(width: 10),

                      // Button 2: Mastered & Understood (Celebratory Dismissal)
                      Expanded(
                        child: Container(
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFF10B981), Color(0xFF059669)],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF10B981).withValues(alpha: 0.35),
                                blurRadius: 10,
                                offset: const Offset(0, 3),
                              ),
                            ],
                          ),
                          child: ElevatedButton.icon(
                            onPressed: () => _handleUnderstood(item.id),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.transparent,
                              shadowColor: Colors.transparent,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              elevation: 0,
                            ),
                            icon: const Icon(Icons.thumb_up_alt_rounded, size: 16),
                            label: Text(
                              'فهمت السؤال خلاص 👍',
                              style: GoogleFonts.cairo(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
