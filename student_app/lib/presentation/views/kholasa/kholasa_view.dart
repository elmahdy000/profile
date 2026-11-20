import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:photo_view/photo_view.dart';
import 'package:shimmer/shimmer.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:student_app/core/storage/storage_service.dart';
import 'package:student_app/core/services/mindmap_cache_service.dart';
import 'package:student_app/core/constants/app_colors.dart';
import 'package:student_app/data/datasources/curriculum_bank_data.dart';
import 'package:student_app/data/repositories/kholasa_repository.dart';
import 'package:student_app/domain/entities/course.dart';
import 'package:student_app/domain/entities/kholasa.dart';
import 'package:student_app/presentation/views/courses/lesson_detail_view.dart';

class KholasaView extends StatefulWidget {
  const KholasaView({super.key});

  @override
  State<KholasaView> createState() => _KholasaViewState();
}

class _KholasaViewState extends State<KholasaView> with TickerProviderStateMixin {
  final bool _isLoading = false;
  List<KholasaMaterial> _allMaterials = [];
  String? _selectedUnit; // null = Units Overview
  KholasaMaterial? _activeLesson; // null = Lessons list
  int _activeStudyTab = 0;
  int _selectedSlideIndex = 0; // 0: Video, 1: Defs, 2: Mindmap, 3: Flashcards, 4: Questions, 5: Zatona

  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  // Questions (بنك الأسئلة) state
  String _questionTypeFilter = 'all'; // all, mcq, true_false, essay
  int _questionPage = 1;
  static const int _questionsPerPage = 10;
  final Map<int, int> _selectedQuestionOptions = {};
  final Map<int, bool> _questionAnswerChecked = {};
  final Set<int> _revealedEssayAnswers = {};

  @override
  void initState() {
    super.initState();
    // Load initial curriculum materials immediately (0ms instant startup)
    final repo = context.read<KholasaRepository>();
    _allMaterials = repo.getInitialCurriculumMaterials();

    if (!CurriculumBankData.isLoaded) {
      CurriculumBankData.load().then((_) {
        if (mounted) setState(() {});
      });
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadMaterials();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadMaterials() async {
    final repo = context.read<KholasaRepository>();
    final result = await repo.getAllMaterials();
    result.when(
      onSuccess: (materials) {
        if (mounted && materials.isNotEmpty) {
          setState(() {
            _allMaterials = materials;
          });
          // Background pre-cache any newly updated mindmaps
          for (final m in materials) {
            MindmapCacheService.prefetchUrls(
              m.mindmapImages,
              headers: _authImageHeaders,
              urlResolver: _resolveAuthImageUrl,
            );
          }
        }
      },
      onFailure: (msg, code) {
        // Keep using offline initial materials silently without disturbing student
      },
    );
  }

  static String _getCanonicalUnit(String rawUnit, String title) {
    final combined = '$rawUnit $title'.trim();
    if (combined.contains('الأولى') || combined.contains('الاولى') || combined.contains('Unit 1') || combined.contains('unit 1')) {
      return 'الوحدة الأولى: أساسيات الذكاء الاصطناعي والمجتمع';
    }
    if (combined.contains('الثانية') || combined.contains('التانية') || combined.contains('Unit 2') || combined.contains('unit 2')) {
      return 'الوحدة الثانية: التعامل مع البيانات والأمن السيبراني';
    }
    if (combined.contains('الثالثة') || combined.contains('التالتة') || combined.contains('Unit 3') || combined.contains('unit 3')) {
      return 'الوحدة الثالثة: تصميم وتطوير مواقع الويب ومفاهيم البرمجة';
    }
    if (combined.contains('الرابعة') || combined.contains('الرابعه') || combined.contains('Unit 4') || combined.contains('unit 4')) {
      return 'الوحدة الرابعة: تصميم الويب والوسائط';
    }
    return rawUnit.trim().isNotEmpty ? rawUnit.trim() : 'الوحدة الأولى: أساسيات الذكاء الاصطناعي والمجتمع';
  }

  static int _unitRank(String u) {
    if (u.contains('الأولى') || u.contains('الاولى') || u.contains('1')) return 1;
    if (u.contains('الثانية') || u.contains('التانية') || u.contains('2')) return 2;
    if (u.contains('الثالثة') || u.contains('التالتة') || u.contains('3')) return 3;
    if (u.contains('الرابعة') || u.contains('الرابعه') || u.contains('4')) return 4;
    return 99;
  }

  // ── Group materials by unit ──
  Map<String, List<KholasaMaterial>> get _unitGroups {
    final map = <String, List<KholasaMaterial>>{};
    for (final m in _allMaterials) {
      if (KholasaRepository.isCppOrJsMaterial(m)) continue;
      final unit = _getCanonicalUnit(m.unit, m.lesson);
      map.putIfAbsent(unit, () => []).add(m);
    }
    final sortedEntries = map.entries.toList()
      ..sort((a, b) => _unitRank(a.key).compareTo(_unitRank(b.key)));
    return Map.fromEntries(sortedEntries);
  }

  // ── Smart Question Bank Linkage ──
  List<KholasaQuestion> _getLessonQuestions(KholasaMaterial m) {
    if (KholasaRepository.isCppOrJsMaterial(m)) return const [];
    // 1. Check CurriculumBankData (full questions loaded)
    final fromBank = CurriculumBankData.getQuestionsForLesson(m.lesson)
        .where((q) => !KholasaRepository.isCppOrJsQuestion(q))
        .toList();
    if (fromBank.isNotEmpty) return fromBank;

    // 2. Fallback to material questions from backend
    if (m.questions.isNotEmpty) {
      return m.questions.where((q) => !KholasaRepository.isCppOrJsQuestion(q)).toList();
    }

    // 3. Fallback to generated questions from definitions
    return _generateQuestionsFromDefs(m)
        .where((q) => !KholasaRepository.isCppOrJsQuestion(q))
        .toList();
  }

  List<KholasaQuestion> _generateQuestionsFromDefs(KholasaMaterial m) {
    if (KholasaRepository.isCppOrJsMaterial(m)) return const [];
    final list = <KholasaQuestion>[];
    for (int i = 0; i < m.definitions.length; i++) {
      final d = m.definitions[i];
      if (KholasaRepository.isCppOrJsText(d.term) || KholasaRepository.isCppOrJsText(d.meaning)) continue;
      list.add(
        KholasaQuestion(
          id: m.id * 1000 + i + 1,
          difficulty: 'easy',
          type: 'mcq',
          prompt: 'ما هو المقصود بمصطلح "${d.term}"؟',
          options: [
            d.meaning,
            'أداة برمجية لا علاقة لها بتكنولوجيا المعلومات',
            'بروتوكول شبكي قديم غير مستخدم حالياً',
            'وحدة تخزين إلكترونية مؤقتة',
          ],
          explanation: d.meaning,
          correctIndex: 0,
        ),
      );
    }
    return list;
  }

  String? get _studentCode {
    try {
      final storage = context.read<StorageService>();
      final s = storage.getStudent();
      return (s?['accessCode'] ?? s?['studentCode'])?.toString();
    } catch (_) {
      return null;
    }
  }

  String? get _studentToken {
    try {
      return context.read<StorageService>().getToken();
    } catch (_) {
      return null;
    }
  }

  Map<String, String> get _authImageHeaders {
    final headers = <String, String>{};
    final token = _studentToken;
    final code = _studentCode;
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
      headers['X-Student-Token'] = token;
    }
    if (code != null && code.isNotEmpty) {
      headers['X-Student-Code'] = code;
    }
    return headers;
  }

  String _resolveAuthImageUrl(String url) {
    if (url.isEmpty) return url;
    String fullUrl = url.trim();
    if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
      fullUrl = '${ApiEndpoints.baseUrl}$fullUrl';
    }
    final code = _studentCode;
    if (code != null && code.isNotEmpty && !fullUrl.contains('accessCode=')) {
      final sep = fullUrl.contains('?') ? '&' : '?';
      fullUrl = '$fullUrl${sep}accessCode=${Uri.encodeComponent(code)}';
    }
    return fullUrl;
  }

  void _openMindmapLightbox(List<String> images, int initialIndex, String lessonTitle) {
    showDialog(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.95),
      builder: (ctx) => _MindmapLightboxDialog(
        images: images,
        initialIndex: initialIndex,
        lessonTitle: lessonTitle,
        authHeaders: _authImageHeaders,
        resolveUrl: _resolveAuthImageUrl,
      ),
    );
  }

  void _playLessonVideo(KholasaMaterial m) {
    final resolvedUrl = (m.videoUrl != null && m.videoUrl!.isNotEmpty)
        ? m.videoUrl
        : '${ApiEndpoints.baseUrl}/api/videos/${m.videoId}/stream';

    final lessonObj = Lesson(
      id: m.videoId,
      title: m.lesson,
      unitName: m.unit,
      videoUrl: resolvedUrl,
      durationMinutes: m.durationMinutes,
      isFree: true,
    );

    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => LessonDetailView(
          lesson: lessonObj,
          courseTitle: m.unit,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        top: true,
        child: RefreshIndicator(
          color: AppColors.blue,
          onRefresh: _loadMaterials,
          child: _isLoading
              ? const Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      CircularProgressIndicator(color: AppColors.blue),
                      SizedBox(height: 12),
                      Text(
                        'جارِ تحميل بنك الخلاصة والخرائط...',
                        style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                )
              : _buildCurrentLevel(),
        ),
      ),
    );
  }

  Widget _buildCurrentLevel() {
    if (_activeLesson != null) {
      return _buildLessonStudyView(_activeLesson!);
    }
    if (_selectedUnit != null || _searchQuery.trim().isNotEmpty) {
      return _buildUnitLessonsListView();
    }
    return _buildUnitsOverview();
  }

  // ═══════════════════════════════════════════════════════════════
  // LEVEL 1: الوحدات الدراسية (Units Overview)
  // ═══════════════════════════════════════════════════════════════
  Widget _buildUnitsOverview() {
    final groups = _unitGroups;
    final totalLessons = _allMaterials.length;

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'الخلاصة والخرائط',
                      style: GoogleFonts.cairo(
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        color: const Color(0xFF0F172A),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFBFDBFE)),
                      ),
                      child: Text(
                        '${groups.length} وحدات • $totalLessons درس',
                        style: GoogleFonts.cairo(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF1D4ED8),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'اختر الوحدة الدراسية لفتح دروسها: فيديو الشرح، الخرائط الذهنية، وبنك الأسئلة الشامل.',
                  style: GoogleFonts.cairo(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF64748B),
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 14),

                // Search Bar
                Container(
                  height: 46,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFCBD5E1)),
                  ),
                  child: TextField(
                    controller: _searchController,
                    onChanged: (val) => setState(() => _searchQuery = val),
                    style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.bold),
                    decoration: InputDecoration(
                      hintText: 'ابحث باسم الدرس، المفهوم، أو السؤال...',
                      hintStyle: GoogleFonts.cairo(
                        fontSize: 12,
                        color: const Color(0xFF94A3B8),
                        fontWeight: FontWeight.w600,
                      ),
                      prefixIcon: const Icon(Icons.search_rounded, color: AppColors.blue, size: 20),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),

        // Units Cards List
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          sliver: SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, index) {
                final entry = groups.entries.elementAt(index);
                final unitTitle = entry.key;
                final lessons = entry.value;

                int totalQuestions = 0;

                for (final l in lessons) {
                  totalQuestions += _getLessonQuestions(l).length;
                }

                return InkWell(
                  onTap: () {
                    setState(() {
                      _selectedUnit = unitTitle;
                    });
                  },
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.03),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.folder_open_rounded, size: 14, color: AppColors.blue),
                                  const SizedBox(width: 4),
                                  Text(
                                    'الوحدة ${index + 1}',
                                    style: GoogleFonts.cairo(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                      color: const Color(0xFF1E293B),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              '${lessons.length} دروس',
                              style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.bold, color: const Color(0xFF64748B)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),

                        Text(
                          unitTitle,
                          style: GoogleFonts.cairo(
                            fontSize: 15,
                            fontWeight: FontWeight.w900,
                            color: const Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 10),

                        // Tags
                        Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          children: [
                            _buildCountPill('$totalQuestions سؤال في البنك', const Color(0xFFECFDF5), const Color(0xFF047857)),
                            _buildCountPill('خرائط ذهنية شاملة', const Color(0xFFF0F9FF), const Color(0xFF0284C7)),
                          ],
                        ),

                        const SizedBox(height: 12),
                        const Divider(height: 1, color: Color(0xFFF1F5F9)),
                        const SizedBox(height: 10),

                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'عرض دروس الوحدة',
                              style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.blue),
                            ),
                            const SizedBox(width: 4),
                            const Icon(Icons.chevron_left_rounded, size: 18, color: AppColors.blue),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
              childCount: groups.length,
            ),
          ),
        ),
        const SliverToBoxAdapter(child: SizedBox(height: 80)),
      ],
    );
  }

  Widget _buildCountPill(String text, Color bg, Color textCol) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(6)),
      child: Text(
        text,
        style: GoogleFonts.cairo(fontSize: 10, fontWeight: FontWeight.bold, color: textCol),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // LEVEL 2: دروس الوحدة (Lessons list)
  // ═══════════════════════════════════════════════════════════════
  Widget _buildUnitLessonsListView() {
    final filtered = _allMaterials.where((m) {
      if (_selectedUnit != null && m.unit != _selectedUnit) return false;
      if (_searchQuery.trim().isEmpty) return true;
      final q = _searchQuery.trim().toLowerCase();
      final titleMatch = m.lesson.toLowerCase().contains(q) || m.unit.toLowerCase().contains(q);
      final defMatch = m.definitions.any((d) => d.term.toLowerCase().contains(q) || d.meaning.toLowerCase().contains(q));
      return titleMatch || defMatch;
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Navigation bar
        Container(
          color: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          child: Row(
            children: [
              TextButton.icon(
                onPressed: () {
                  setState(() {
                    _selectedUnit = null;
                    _searchQuery = '';
                    _searchController.clear();
                  });
                },
                icon: const Icon(Icons.arrow_forward_rounded, size: 18, color: Color(0xFF1E293B)),
                label: Text(
                  'كل الوحدات',
                  style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF1E293B)),
                ),
                style: TextButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 8)),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  _selectedUnit ?? 'نتائج البحث: "$_searchQuery"',
                  style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A)),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
        const Divider(height: 1, color: Color(0xFFE2E8F0)),

        Expanded(
          child: filtered.isEmpty
              ? Center(
                  child: Text(
                    'لا توجد دروس تطابق بحثك.',
                    style: GoogleFonts.cairo(color: const Color(0xFF64748B), fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 80),
                  itemCount: filtered.length,
                  itemBuilder: (context, idx) {
                    final lesson = filtered[idx];
                    final questions = _getLessonQuestions(lesson).length;

                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.02),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              lesson.lesson,
                              style: GoogleFonts.cairo(
                                fontSize: 14,
                                fontWeight: FontWeight.w900,
                                color: const Color(0xFF0F172A),
                                height: 1.3,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                const Icon(Icons.timer_outlined, size: 14, color: Color(0xFF64748B)),
                                const SizedBox(width: 4),
                                Text(
                                  '${lesson.durationMinutes} دقيقة',
                                  style: GoogleFonts.cairo(fontSize: 11, color: const Color(0xFF64748B)),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    '$questions سؤال في البنك • خرائط ذهنية شاملة',
                                    style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.w600, color: const Color(0xFF64748B)),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                Expanded(
                                  child: ElevatedButton.icon(
                                    onPressed: () {
                                      setState(() {
                                        _activeLesson = lesson;
                                        _activeStudyTab = 0;
                                        _questionPage = 1;
                                      });
                                    },
                                    icon: const Icon(Icons.menu_book_rounded, size: 16),
                                    label: Text(
                                      'فتح محتوى الدرس',
                                      style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.bold),
                                    ),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppColors.blue,
                                      foregroundColor: Colors.white,
                                      elevation: 0,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                      padding: const EdgeInsets.symmetric(vertical: 8),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                OutlinedButton.icon(
                                  onPressed: () => _playLessonVideo(lesson),
                                  icon: const Icon(Icons.play_circle_outline_rounded, size: 16, color: AppColors.blue),
                                  label: Text(
                                    'فيديو الشرح',
                                    style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.blue),
                                  ),
                                  style: OutlinedButton.styleFrom(
                                    side: const BorderSide(color: Color(0xFFBFDBFE)),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // LEVEL 3: دراسة الدرس المتكاملة (6 Clean Tabs)
  // ═══════════════════════════════════════════════════════════════
  Widget _buildLessonStudyView(KholasaMaterial m) {
    final questions = _getLessonQuestions(m);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Top Back Row
        Container(
          color: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          child: Row(
            children: [
              TextButton.icon(
                onPressed: () {
                  setState(() {
                    _activeLesson = null;
                  });
                },
                icon: const Icon(Icons.arrow_forward_rounded, size: 18, color: Color(0xFF1E293B)),
                label: Text(
                  'رجوع للدروس',
                  style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF1E293B)),
                ),
                style: TextButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 8)),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  m.lesson,
                  style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A)),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
        const Divider(height: 1, color: Color(0xFFE2E8F0)),

        // Horizontal Study Tabs Bar
        Container(
          color: Colors.white,
          height: 48,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            children: [
              _buildStudyTabPill(0, 'فيديو الشرح 🎬', Icons.videocam_rounded),
              _buildStudyTabPill(1, 'الخرائط الذهنية 🗺️', Icons.map_rounded),
              _buildStudyTabPill(2, 'بنك الأسئلة (${questions.length}) ❓', Icons.quiz_rounded),
            ],
          ),
        ),
        const Divider(height: 1, color: Color(0xFFE2E8F0)),

        // Content
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
            child: _buildStudyTabBody(m, questions),
          ),
        ),
      ],
    );
  }

  Widget _buildStudyTabPill(int tabIdx, String label, IconData icon) {
    final isSelected = _activeStudyTab == tabIdx;

    return Padding(
      padding: const EdgeInsets.only(left: 6),
      child: InkWell(
        onTap: () => setState(() => _activeStudyTab = tabIdx),
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.blue : const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(
            children: [
              Icon(icon, size: 14, color: isSelected ? Colors.white : const Color(0xFF64748B)),
              const SizedBox(width: 6),
              Text(
                label,
                style: GoogleFonts.cairo(
                  fontSize: 11,
                  fontWeight: isSelected ? FontWeight.w900 : FontWeight.w700,
                  color: isSelected ? Colors.white : const Color(0xFF475569),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStudyTabBody(
    KholasaMaterial m,
    List<KholasaQuestion> questions,
  ) {
    switch (_activeStudyTab) {
      case 0:
        return _buildVideoTabBody(m);
      case 1:
        return _buildMindmapTabBody(m);
      case 2:
        return _buildQuestionsTabBody(m, questions);
      default:
        return _buildVideoTabBody(m);
    }
  }

  // ── Tab 0: Video ──
  Widget _buildVideoTabBody(KholasaMaterial m) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            height: 180,
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Center(
              child: IconButton(
                onPressed: () => _playLessonVideo(m),
                icon: const Icon(Icons.play_circle_fill_rounded, color: Colors.white, size: 64),
              ),
            ),
          ),
          const SizedBox(height: 14),
          Text(
            m.lesson,
            style: GoogleFonts.cairo(fontSize: 15, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A)),
          ),
          const SizedBox(height: 6),
          Text(
            'شاهد شرح الدكتور محمود المهدي كاملاً بجودة عالية وتحكم كامل في السرعة.',
            style: GoogleFonts.cairo(fontSize: 12, color: const Color(0xFF64748B), height: 1.4),
          ),
          const SizedBox(height: 14),
          ElevatedButton.icon(
            onPressed: () => _playLessonVideo(m),
            icon: const Icon(Icons.play_arrow_rounded, size: 20),
            label: Text('ابدأ مشاهدة الفيديو الآن', style: GoogleFonts.cairo(fontWeight: FontWeight.bold)),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.blue,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              padding: const EdgeInsets.symmetric(vertical: 12),
            ),
          ),
        ],
      ),
    );
  }



  // ── Tab 2: Mindmaps (الخرائط الذهنية التفاعلية الشاملة) ──
  Widget _buildMindmapTabBody(KholasaMaterial m) {
    final validImages = m.mindmapImages.where((s) => s.isNotEmpty).toList();
    final safeIndex = validImages.isEmpty ? 0 : _selectedSlideIndex.clamp(0, validImages.length - 1);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Mindmap Header Card
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF1E3A8A), Color(0xFF2563EB)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.account_tree_rounded, color: Colors.white, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'الخريطة الذهنية والمفاهيمية للدرس',
                      style: GoogleFonts.cairo(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.white),
                    ),
                    Text(
                      'لوحات الشرح الأصلية وشجرة المفاهيم البصرية',
                      style: GoogleFonts.cairo(fontSize: 11, color: Colors.white.withValues(alpha: 0.9)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // ── Mindmap High-Performance Slide Viewer ──
        if (validImages.isNotEmpty) ...[
          // Slide selector header & tabs
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'لوحات الشرح (${validImages.length} لوحات):',
                style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.bold, color: const Color(0xFF1E293B)),
              ),
              InkWell(
                onTap: () => _openMindmapLightbox(validImages, safeIndex, m.lesson),
                child: Row(
                  children: [
                    const Icon(Icons.fullscreen_rounded, color: AppColors.blue, size: 18),
                    const SizedBox(width: 4),
                    Text(
                      'ملء الشاشة',
                      style: GoogleFonts.cairo(fontSize: 11, color: AppColors.blue, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Slide Pills Switcher
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: validImages.asMap().entries.map((entry) {
                final idx = entry.key;
                final isSelected = idx == safeIndex;
                return Padding(
                  padding: const EdgeInsets.only(left: 8),
                  child: InkWell(
                    onTap: () => setState(() => _selectedSlideIndex = idx),
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: isSelected ? AppColors.blue : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: isSelected ? AppColors.blue : const Color(0xFFCBD5E1),
                        ),
                      ),
                      child: Text(
                        'لوحة ${idx + 1}',
                        style: GoogleFonts.cairo(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: isSelected ? Colors.white : const Color(0xFF334155),
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 10),

          // Single Active Slide Card
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFCBD5E1)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Slide Title Bar
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'لوحة ${safeIndex + 1} من ${validImages.length}',
                        style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF1E293B)),
                      ),
                      Text(
                        '💡 اضغط للتكبير والتحريك',
                        style: GoogleFonts.cairo(fontSize: 10, color: const Color(0xFF64748B)),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1, color: Color(0xFFE2E8F0)),

                // Cached Image Viewer with 0ms disk instant loading (Fit to Window Preview)
                InkWell(
                  onTap: () => _openMindmapLightbox(validImages, safeIndex, m.lesson),
                  child: Stack(
                    alignment: Alignment.bottomCenter,
                    children: [
                      Container(
                        constraints: const BoxConstraints(minHeight: 220, maxHeight: 320),
                        width: double.infinity,
                        color: const Color(0xFFF8FAFC),
                        child: Center(
                          child: _CachedMindmapImage(
                            url: _resolveAuthImageUrl(validImages[safeIndex]),
                            authHeaders: _authImageHeaders,
                            cacheWidth: 1080,
                          ),
                        ),
                      ),
                      Container(
                        margin: const EdgeInsets.all(8),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.75),
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.2),
                              blurRadius: 6,
                            ),
                          ],
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.fullscreen_rounded, color: Colors.white, size: 16),
                            const SizedBox(width: 6),
                            Text(
                              'عرض اللوحة بالكامل 🔍',
                              style: GoogleFonts.cairo(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                const Divider(height: 1, color: Color(0xFFE2E8F0)),

                // Slide Navigation Buttons
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      TextButton(
                        onPressed: safeIndex > 0
                            ? () => setState(() => _selectedSlideIndex = safeIndex - 1)
                            : null,
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.arrow_back_rounded, size: 16),
                            const SizedBox(width: 4),
                            Text('السابق', style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                      Text(
                        'لوحة ${safeIndex + 1} من ${validImages.length}',
                        style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.bold, color: const Color(0xFF64748B)),
                      ),
                      TextButton(
                        onPressed: safeIndex < validImages.length - 1
                            ? () => setState(() => _selectedSlideIndex = safeIndex + 1)
                            : null,
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text('التالي', style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.bold)),
                            const SizedBox(width: 4),
                            const Icon(Icons.arrow_forward_rounded, size: 16),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
        ] else ...[
          Container(
            padding: const EdgeInsets.all(14),
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                const Icon(Icons.info_outline_rounded, color: AppColors.blue, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'لا توجد لوحات شرائح مرفوعة لهذا الدرس حالياً، يمكنك الاعتماد كلياً على شجرة المفاهيم التفاعلية أدناه.',
                    style: GoogleFonts.cairo(fontSize: 11, color: const Color(0xFF475569)),
                  ),
                ),
              ],
            ),
          ),
        ],

        // Visual Concept Mindmap Tree (Interactive Nodes)
        Text(
          'شجرة المحاور والمفاهيم الأساسية:',
          style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.bold, color: const Color(0xFF1E293B)),
        ),
        const SizedBox(height: 10),

        // Central Node
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.blue, width: 2),
            boxShadow: [
              BoxShadow(
                color: AppColors.blue.withValues(alpha: 0.2),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Column(
            children: [
              Text(
                '🎯 المركز: ${m.lesson}',
                style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.white),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 4),
              Text(
                m.unit,
                style: GoogleFonts.cairo(fontSize: 11, color: const Color(0xFF93C5FD)),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Branches generated from definitions & key takeaways
        ...m.definitions.asMap().entries.map((entry) {
          final idx = entry.key;
          final d = entry.value;

          final colors = [
            const Color(0xFF1D4ED8), // Blue
            const Color(0xFF059669), // Green
            const Color(0xFF7C3AED), // Purple
            const Color(0xFFD97706), // Amber
            const Color(0xFFDC2626), // Rose
          ];
          final branchColor = colors[idx % colors.length];

          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border(
                right: BorderSide(color: branchColor, width: 4),
                top: const BorderSide(color: Color(0xFFE2E8F0)),
                bottom: const BorderSide(color: Color(0xFFE2E8F0)),
                left: const BorderSide(color: Color(0xFFE2E8F0)),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: branchColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        'محور ${idx + 1}',
                        style: GoogleFonts.cairo(fontSize: 10, fontWeight: FontWeight.bold, color: branchColor),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        d.term,
                        style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  d.meaning,
                  style: GoogleFonts.cairo(fontSize: 12, color: const Color(0xFF475569), height: 1.4),
                ),
                if (d.translation != null && d.translation!.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text('💡 ${d.translation}', style: GoogleFonts.cairo(fontSize: 11, fontStyle: FontStyle.italic, color: const Color(0xFF64748B))),
                ],
              ],
            ),
          );
        }),
      ],
    );
  }



  // ═══════════════════════════════════════════════════════════════
  // Tab 4: بنك الأسئلة الشامل (MCQ, True/False, Essay)
  // ═══════════════════════════════════════════════════════════════
  Widget _buildQuestionsTabBody(KholasaMaterial m, List<KholasaQuestion> allQuestions) {
    if (allQuestions.isEmpty) {
      return Center(
        child: Text(
          'لا توجد أسئلة مسجلة لهذا الدرس حالياً.',
          style: GoogleFonts.cairo(fontSize: 13, color: const Color(0xFF64748B)),
        ),
      );
    }

    final filtered = allQuestions.where((q) {
      if (_questionTypeFilter == 'all') return true;
      return q.type == _questionTypeFilter;
    }).toList();

    final totalPages = (filtered.length / _questionsPerPage).ceil();
    final int currentPage = _questionPage.clamp(1, math.max(1, totalPages)).toInt();
    final int startIdx = (currentPage - 1) * _questionsPerPage;
    final int endIdx = math.min(startIdx + _questionsPerPage, filtered.length);
    final pageItems = filtered.sublist(startIdx, endIdx);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Bank Header Count
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'بنك أسئلة الدرس (${filtered.length} سؤال)',
              style: GoogleFonts.cairo(fontSize: 14, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A)),
            ),
            Text(
              'صفحة $currentPage من $totalPages',
              style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.bold, color: const Color(0xFF64748B)),
            ),
          ],
        ),
        const SizedBox(height: 10),

        // Type Filter Pills
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _buildQFilterChip('all', 'الكل (${allQuestions.length})'),
              _buildQFilterChip('mcq', 'اختيار من متعدد (${allQuestions.where((q) => q.type == 'mcq').length})'),
              _buildQFilterChip('true_false', 'صح أم خطأ (${allQuestions.where((q) => q.type == 'true_false').length})'),
              _buildQFilterChip('essay', 'أسئلة مقالية (${allQuestions.where((q) => q.type == 'essay').length})'),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Question Cards
        ...pageItems.asMap().entries.map((entry) {
          final qIndex = startIdx + entry.key;
          final q = entry.value;
          final selectedOpt = _selectedQuestionOptions[q.id];
          final isChecked = _questionAnswerChecked[q.id] ?? false;
          final isEssayRevealed = _revealedEssayAnswers.contains(q.id);

          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: q.type == 'essay' ? const Color(0xFFFEF3C7) : const Color(0xFFDBEAFE),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        q.type == 'essay' ? 'سؤال مقالي' : (q.type == 'true_false' ? 'صح أم خطأ' : 'اختيار من متعدد'),
                        style: GoogleFonts.cairo(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: q.type == 'essay' ? const Color(0xFFB45309) : const Color(0xFF1E40AF),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'سؤال ${qIndex + 1}',
                      style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.bold, color: const Color(0xFF64748B)),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                Text(
                  q.prompt,
                  style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A), height: 1.4),
                ),
                const SizedBox(height: 10),

                // Options
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
                          _selectedQuestionOptions[q.id] = optIdx;
                          _questionAnswerChecked[q.id] = true;
                        });
                      },
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 6),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
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
                                  ? (isCorrectOption ? const Color(0xFF10B981) : (isThisSelected ? const Color(0xFFEF4444) : const Color(0xFF94A3B8)))
                                  : (isThisSelected ? AppColors.blue : const Color(0xFF94A3B8)),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                optText,
                                style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF1E293B)),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),

                // Explanation
                if (isChecked && q.explanation != null && q.explanation!.isNotEmpty) ...[
                  const SizedBox(height: 6),
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
                            style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.w600, color: const Color(0xFF166534)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                // Essay reveal
                if (q.type == 'essay') ...[
                  const SizedBox(height: 6),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton.icon(
                      onPressed: () {
                        setState(() {
                          if (isEssayRevealed) {
                            _revealedEssayAnswers.remove(q.id);
                          } else {
                            _revealedEssayAnswers.add(q.id);
                          }
                        });
                      },
                      icon: Icon(isEssayRevealed ? Icons.visibility_off_rounded : Icons.lightbulb_rounded, size: 16, color: const Color(0xFFD97706)),
                      label: Text(
                        isEssayRevealed ? 'إخفاء الإجابة النموذجية' : 'عرض الإجابة النموذجية مع عناصر التقييم 💡',
                        style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.bold, color: const Color(0xFFD97706)),
                      ),
                    ),
                  ),
                  if (isEssayRevealed && q.modelAnswer != null)
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF3C7),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFFDE68A)),
                      ),
                      child: Text(
                        q.modelAnswer!,
                        style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.w600, color: const Color(0xFF78350F), height: 1.45),
                      ),
                    ),
                ],
              ],
            ),
          );
        }),

        // Pagination Buttons
        if (totalPages > 1) ...[
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Flexible(
                child: ElevatedButton(
                  onPressed: currentPage > 1
                      ? () => setState(() => _questionPage = (currentPage - 1).toInt())
                      : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: const Color(0xFF1E293B),
                    side: const BorderSide(color: Color(0xFFCBD5E1)),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.arrow_back_rounded, size: 16),
                      const SizedBox(width: 4),
                      Text('السابقة', style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Text(
                    'صفحة $currentPage من $totalPages',
                    style: GoogleFonts.cairo(fontSize: 11.5, fontWeight: FontWeight.bold, color: const Color(0xFF334155)),
                  ),
                ),
              ),
              Flexible(
                child: ElevatedButton(
                  onPressed: currentPage < totalPages
                      ? () => setState(() => _questionPage = (currentPage + 1).toInt())
                      : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.blue,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('التالية', style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.bold)),
                      const SizedBox(width: 4),
                      const Icon(Icons.arrow_forward_rounded, size: 16),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }

  Widget _buildQFilterChip(String type, String label) {
    final isSelected = _questionTypeFilter == type;

    return Padding(
      padding: const EdgeInsets.only(left: 6),
      child: InkWell(
        onTap: () {
          setState(() {
            _questionTypeFilter = type;
            _questionPage = 1;
          });
        },
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            label,
            style: GoogleFonts.cairo(
              fontSize: 11,
              fontWeight: isSelected ? FontWeight.w900 : FontWeight.w700,
              color: isSelected ? Colors.white : const Color(0xFF64748B),
            ),
          ),
        ),
      ),
    );
  }


}


// ══════════════════════════════════════════════════════════════
// ── Mindmap Lightbox Dialog (عرض الخرائط الذهنية بدقة فائقة) ──
// ══════════════════════════════════════════════════════════════
class _MindmapLightboxDialog extends StatefulWidget {
  const _MindmapLightboxDialog({
    required this.images,
    required this.initialIndex,
    required this.lessonTitle,
    required this.authHeaders,
    required this.resolveUrl,
  });

  final List<String> images;
  final int initialIndex;
  final String lessonTitle;
  final Map<String, String> authHeaders;
  final String Function(String) resolveUrl;

  @override
  State<_MindmapLightboxDialog> createState() => _MindmapLightboxDialogState();
}

class _MindmapLightboxDialogState extends State<_MindmapLightboxDialog> {
  late int _currentIndex;
  late PhotoViewController _photoController;
  late PhotoViewScaleStateController _scaleStateController;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex.clamp(0, math.max(0, widget.images.length - 1));
    _photoController = PhotoViewController();
    _scaleStateController = PhotoViewScaleStateController();
  }

  @override
  void dispose() {
    _photoController.dispose();
    _scaleStateController.dispose();
    super.dispose();
  }

  void _resetZoom() {
    _photoController.reset();
    _scaleStateController.scaleState = PhotoViewScaleState.initial;
  }

  void _zoomIn() {
    final cur = _photoController.scale ?? 1.0;
    _photoController.scale = cur * 1.35;
  }

  void _zoomOut() {
    final cur = _photoController.scale ?? 1.0;
    _photoController.scale = math.max(0.1, cur * 0.75);
  }

  ImageProvider _getImageProvider(String url) {
    final assetPath = MindmapCacheService.getBundledAssetPath(url);
    if (assetPath != null) {
      return AssetImage(assetPath);
    }
    final file = MindmapCacheService.getCachedFile(url);
    if (file != null) {
      return FileImage(file);
    }
    return CachedNetworkImageProvider(
      url,
      headers: widget.authHeaders,
      cacheManager: MindmapCacheService.customCacheManager,
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.images.isEmpty) return const SizedBox();
    final rawUrl = widget.images[_currentIndex];
    final resolvedUrl = widget.resolveUrl(rawUrl);

    return Dialog.fullscreen(
      backgroundColor: const Color(0xFF020617),
      child: SafeArea(
        child: Column(
          children: [
            // Top Bar
            Container(
              color: const Color(0xFF0F172A),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 22),
                    tooltip: 'رجوع',
                    style: IconButton.styleFrom(
                      backgroundColor: Colors.white.withValues(alpha: 0.1),
                      padding: const EdgeInsets.all(6),
                      minimumSize: const Size(36, 36),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          widget.lessonTitle,
                          style: GoogleFonts.cairo(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          'لوحة ${_currentIndex + 1} من ${widget.images.length}',
                          style: GoogleFonts.cairo(color: const Color(0xFF38BDF8), fontSize: 11, fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 6),
                  // Fit to Window Reset
                  IconButton(
                    onPressed: _resetZoom,
                    icon: const Icon(Icons.fit_screen_rounded, color: Color(0xFF38BDF8), size: 20),
                    tooltip: 'حجم الشاشة',
                    style: IconButton.styleFrom(
                      backgroundColor: Colors.white.withValues(alpha: 0.1),
                      padding: const EdgeInsets.all(6),
                      minimumSize: const Size(36, 36),
                    ),
                  ),
                  const SizedBox(width: 6),
                  // Zoom In
                  IconButton(
                    onPressed: _zoomIn,
                    icon: const Icon(Icons.zoom_in_rounded, color: Colors.white, size: 20),
                    tooltip: 'تكبير',
                    style: IconButton.styleFrom(
                      backgroundColor: Colors.white.withValues(alpha: 0.1),
                      padding: const EdgeInsets.all(6),
                      minimumSize: const Size(36, 36),
                    ),
                  ),
                  const SizedBox(width: 6),
                  // Zoom Out
                  IconButton(
                    onPressed: _zoomOut,
                    icon: const Icon(Icons.zoom_out_rounded, color: Colors.white, size: 20),
                    tooltip: 'تصغير',
                    style: IconButton.styleFrom(
                      backgroundColor: Colors.white.withValues(alpha: 0.1),
                      padding: const EdgeInsets.all(6),
                      minimumSize: const Size(36, 36),
                    ),
                  ),
                ],
              ),
            ),
            const Divider(height: 1, color: Color(0xFF1E293B)),

            // Viewport with PhotoView (Edge-to-edge, perfectly Fit to Window without unwanted auto-zoom)
            Expanded(
              child: PhotoView(
                key: ValueKey('pv_${_currentIndex}_$resolvedUrl'),
                controller: _photoController,
                scaleStateController: _scaleStateController,
                imageProvider: _getImageProvider(resolvedUrl),
                minScale: PhotoViewComputedScale.contained,
                maxScale: PhotoViewComputedScale.covered * 4.0,
                initialScale: PhotoViewComputedScale.contained,
                basePosition: Alignment.center,
                backgroundDecoration: const BoxDecoration(color: Color(0xFF020617)),
                loadingBuilder: (context, event) => const Center(
                  child: CircularProgressIndicator(color: AppColors.blue),
                ),
              ),
            ),

            const Divider(height: 1, color: Color(0xFF1E293B)),

            // Bottom Navigation Footer
            Container(
              color: const Color(0xFF0F172A),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  if (widget.images.length > 1) ...[
                    // السابق Button (Points Right -> in Arabic RTL)
                    OutlinedButton(
                      onPressed: _currentIndex > 0
                          ? () {
                              _resetZoom();
                              setState(() => _currentIndex--);
                            }
                          : null,
                      style: OutlinedButton.styleFrom(
                        backgroundColor: _currentIndex > 0
                            ? const Color(0xFF1E293B)
                            : const Color(0xFF0F172A),
                        side: BorderSide(
                          color: _currentIndex > 0
                              ? const Color(0xFF38BDF8)
                              : const Color(0xFF334155),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.chevron_right_rounded,
                            size: 18,
                            color: _currentIndex > 0 ? Colors.white : Colors.white30,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'السابق',
                            style: GoogleFonts.cairo(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: _currentIndex > 0 ? Colors.white : Colors.white30,
                            ),
                          ),
                        ],
                      ),
                    ),

                    // لوحة X من Y
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFF334155)),
                      ),
                      child: Text(
                        'لوحة ${_currentIndex + 1} من ${widget.images.length}',
                        style: GoogleFonts.cairo(
                          color: const Color(0xFF38BDF8),
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),

                    // التالي Button (Points Left <- in Arabic RTL)
                    OutlinedButton(
                      onPressed: _currentIndex < widget.images.length - 1
                          ? () {
                              _resetZoom();
                              setState(() => _currentIndex++);
                            }
                          : null,
                      style: OutlinedButton.styleFrom(
                        backgroundColor: _currentIndex < widget.images.length - 1
                            ? const Color(0xFF1E293B)
                            : const Color(0xFF0F172A),
                        side: BorderSide(
                          color: _currentIndex < widget.images.length - 1
                              ? const Color(0xFF38BDF8)
                              : const Color(0xFF334155),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'التالي',
                            style: GoogleFonts.cairo(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: _currentIndex < widget.images.length - 1 ? Colors.white : Colors.white30,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Icon(
                            Icons.chevron_left_rounded,
                            size: 18,
                            color: _currentIndex < widget.images.length - 1 ? Colors.white : Colors.white30,
                          ),
                        ],
                      ),
                    ),
                  ] else ...[
                    const Spacer(),
                    Text(
                      '💡 انقر مرتين أو استخدم إصبعيك للتكبير',
                      style: GoogleFonts.cairo(color: Colors.white70, fontSize: 11),
                    ),
                    const Spacer(),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════
// ── Cached Mindmap Image Widget (عرض فوري في 0ms وحفظ دائم) ──
// ══════════════════════════════════════════════════════════════
class _CachedMindmapImage extends StatelessWidget {
  const _CachedMindmapImage({
    required this.url,
    required this.authHeaders,
    this.cacheWidth = 1080,
  });

  final String url;
  final Map<String, String> authHeaders;
  final int cacheWidth;

  @override
  Widget build(BuildContext context) {
    // 1. Direct Bundled Asset (Instant 0ms, 100% offline, zero network)
    final assetPath = MindmapCacheService.getBundledAssetPath(url);
    if (assetPath != null) {
      return Image.asset(
        assetPath,
        cacheWidth: cacheWidth,
        fit: BoxFit.contain,
        errorBuilder: (context, error, stackTrace) => _buildFallback(context),
      );
    }

    // 2. Direct Disk Cache (Instant 0ms)
    final localFile = MindmapCacheService.getCachedFile(url);
    if (localFile != null) {
      return Image.file(
        localFile,
        cacheWidth: cacheWidth,
        fit: BoxFit.contain,
        errorBuilder: (context, error, stackTrace) => _buildFallback(context),
      );
    }

    // 3. High-Performance CachedNetworkImage with Shimmer
    return CachedNetworkImage(
      imageUrl: url,
      httpHeaders: authHeaders,
      cacheManager: MindmapCacheService.customCacheManager,
      memCacheWidth: cacheWidth,
      fit: BoxFit.contain,
      placeholder: (context, url) => Shimmer.fromColors(
        baseColor: const Color(0xFF1E293B),
        highlightColor: const Color(0xFF334155),
        child: Container(
          height: 180,
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Center(
            child: Icon(Icons.account_tree_rounded, size: 36, color: Color(0xFF475569)),
          ),
        ),
      ),
      errorWidget: (context, url, error) => _buildError(context),
    );
  }

  Widget _buildFallback(BuildContext context) {
    return CachedNetworkImage(
      imageUrl: url,
      httpHeaders: authHeaders,
      cacheManager: MindmapCacheService.customCacheManager,
      memCacheWidth: cacheWidth,
      fit: BoxFit.contain,
      errorWidget: (context, url, error) => _buildError(context),
    );
  }

  Widget _buildError(BuildContext context) {
    return Container(
      height: 140,
      alignment: Alignment.center,
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.broken_image_rounded, size: 28, color: Color(0xFF94A3B8)),
          const SizedBox(height: 6),
          Text(
            'تعذر فتح الصورة، يرجى التحقق من الاتصال بالإنترنت',
            style: GoogleFonts.cairo(fontSize: 11, color: const Color(0xFF64748B)),
          ),
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════
