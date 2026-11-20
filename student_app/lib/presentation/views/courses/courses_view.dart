import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:student_app/core/constants/app_colors.dart';
import 'package:student_app/core/constants/app_icons.dart';
import 'package:student_app/domain/entities/course.dart';
import 'package:student_app/presentation/viewmodels/auth_viewmodel.dart';
import 'package:student_app/presentation/viewmodels/courses_viewmodel.dart';
import 'package:student_app/presentation/widgets/lesson_thumbnail.dart';
import 'lesson_detail_view.dart';

class CoursesView extends StatefulWidget {
  const CoursesView({super.key});

  @override
  State<CoursesView> createState() => _CoursesViewState();
}

class _CoursesViewState extends State<CoursesView> {
  String _searchQuery = '';
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authVm = context.read<AuthViewModel>();
      context.read<CoursesViewModel>().loadCourses(stage: authVm.currentStudent?.stage);
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final coursesVm = context.watch<CoursesViewModel>();
    final authVm = context.watch<AuthViewModel>();
    final student = authVm.currentStudent;

    final filteredCourses = coursesVm.courses.where((c) {
      if (_searchQuery.trim().isEmpty) return true;
      final q = _searchQuery.toLowerCase();
      final titleMatch = c.title.toLowerCase().contains(q);
      final lessonMatch = c.lessons.any((l) =>
          l.title.toLowerCase().contains(q) || l.unitName.toLowerCase().contains(q));
      return titleMatch || lessonMatch;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.bgLight,
      body: RefreshIndicator(
        color: AppColors.blue,
        onRefresh: () => coursesVm.loadCourses(stage: student?.stage),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ── Blue Curved Header ──
              Container(
                padding: EdgeInsets.fromLTRB(
                  18,
                  MediaQuery.of(context).padding.top + 14,
                  18,
                  20,
                ),
                decoration: BoxDecoration(
                  color: AppColors.blue,
                  borderRadius: const BorderRadius.vertical(
                    bottom: Radius.circular(AppColors.radiusHero),
                  ),
                  boxShadow: AppColors.heroShadow,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text(
                          'الدروس والوحدات',
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'متقسمة كوحدات منظمة بالشرح وبنك الأسئلة والخرائط',
                          style: TextStyle(
                            fontSize: 10.5,
                            color: Colors.white70,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(11),
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.35),
                          width: 1,
                        ),
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.play_lesson_rounded,
                          color: Colors.white,
                          size: 19,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // ── Content ──
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Search Bar
                    Container(
                      height: 44,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(13),
                        border: Border.all(color: const Color(0xFFD6E2F0), width: 1),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.blue.withValues(alpha: 0.04),
                            blurRadius: 10,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: TextField(
                        controller: _searchController,
                        onChanged: (val) => setState(() => _searchQuery = val),
                        style: const TextStyle(fontSize: 12, color: AppColors.ink),
                        textDirection: TextDirection.rtl,
                        decoration: InputDecoration(
                          hintText: 'بتدور على وحدة أو درس معين؟...',
                          hintStyle: const TextStyle(fontSize: 11, color: Color(0xFF8B9DB5)),
                          hintTextDirection: TextDirection.rtl,
                          prefixIcon: const Icon(Icons.search_rounded, color: AppColors.blue, size: 20),
                          suffixIcon: _searchQuery.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.clear_rounded, size: 16, color: AppColors.muted),
                                  onPressed: () {
                                    _searchController.clear();
                                    setState(() => _searchQuery = '');
                                  },
                                )
                              : null,
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                        ),
                      ),
                    ),

                    const SizedBox(height: 14),

                    // Quick Stats & Friendly Greeting
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFDBEAFE)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: AppColors.blue.withValues(alpha: 0.12),
                              shape: BoxShape.circle,
                            ),
                            child: const Center(
                              child: Icon(Icons.auto_stories_rounded, color: AppColors.blue, size: 18),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  student != null ? 'منهجك جاهز يا ${student.name.split(' ').first}' : 'منهجك جاهز بالكامل',
                                  style: const TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w800,
                                    color: AppColors.blueDark,
                                  ),
                                ),
                                const SizedBox(height: 1),
                                const Text(
                                  'كل درس فيه الشرح الفول HD، الخرائط الذهنية، وبنك الأسئلة الشامل.',
                                  style: TextStyle(fontSize: 9.5, color: Color(0xFF475569)),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 14),

                    if (coursesVm.isLoading)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 40),
                        child: Center(child: CircularProgressIndicator(strokeWidth: 2.5)),
                      )
                    else if (filteredCourses.isEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(vertical: 40),
                        alignment: Alignment.center,
                        child: const Text(
                          'لا توجد محاضرات مطابقة للبحث',
                          style: TextStyle(fontSize: 12, color: Color(0xFF8B9DB5)),
                        ),
                      )
                    else ...[
                      ...filteredCourses.map((c) => _buildCourseCard(c)),
                      const SizedBox(height: 100),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCourseCard(Course course) {
    // Group lessons by canonical unitName so all unit lessons are gathered together
    final Map<String, List<Lesson>> unitGroups = {};
    for (final lesson in course.lessons) {
      final unit = _getCanonicalUnit(lesson.unitName, lesson.title);
      unitGroups.putIfAbsent(unit, () => []).add(lesson);
    }

    int unitRank(String u) {
      if (u.contains('الأولى') || u.contains('الاولى') || u.contains('1')) return 1;
      if (u.contains('الثانية') || u.contains('التانية') || u.contains('2')) return 2;
      if (u.contains('الثالثة') || u.contains('التالتة') || u.contains('3')) return 3;
      if (u.contains('الرابعة') || u.contains('الرابعه') || u.contains('4')) return 4;
      if (u.contains('الخامسة') || u.contains('الخامسه') || u.contains('5')) return 5;
      if (u.contains('السادسة') || u.contains('السادسه') || u.contains('6')) return 6;
      return 99;
    }

    final sortedUnitEntries = unitGroups.entries.toList()
      ..sort((a, b) => unitRank(a.key).compareTo(unitRank(b.key)));

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppColors.radiusCard),
        border: Border.all(color: AppColors.line),
        boxShadow: AppColors.cardShadow,
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          initiallyExpanded: true,
          tilePadding: const EdgeInsets.all(12),
          childrenPadding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
          leading: Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Center(
              child: Icon(Icons.menu_book_rounded, color: Colors.white, size: 26),
            ),
          ),
          title: Text(
            course.title,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: AppColors.ink,
            ),
          ),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 3),
              Text(
                '${course.stage} · د. محمود المهدي',
                style: const TextStyle(fontSize: 10.5, color: Color(0xFF8294AA)),
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEAF3FF),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      '${unitGroups.keys.length} وحدات دراسية',
                      style: const TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.w700,
                        color: AppColors.blueDark,
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      '${course.lessons.length} درس مسجل',
                      style: const TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF475569),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          children: [
            const Divider(height: 1, color: AppColors.line),
            const SizedBox(height: 10),

            if (course.lessons.isEmpty)
              const Padding(
                padding: EdgeInsets.all(16),
                child: Text('الدروس قيد التجهيز والرفع للطلاب', style: TextStyle(fontSize: 11, color: AppColors.muted)),
              )
            else
              ...sortedUnitEntries.map((entry) => _buildUnitSection(course, entry.key, entry.value)),
          ],
        ),
      ),
    );
  }

  Widget _buildUnitSection(Course course, String unitName, List<Lesson> lessons) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFFBFDFF),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2EBF5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ── Unit Header ──
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
            decoration: const BoxDecoration(
              color: Color(0xFFF1F6FD),
              borderRadius: BorderRadius.vertical(top: Radius.circular(11)),
              border: Border(bottom: BorderSide(color: Color(0xFFE2EBF5))),
            ),
            child: Row(
              children: [
                Container(
                  width: 26,
                  height: 26,
                  decoration: BoxDecoration(
                    color: AppColors.blue.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(7),
                  ),
                  child: const Center(
                    child: Icon(Icons.folder_outlined, color: AppColors.blue, size: 16),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    unitName,
                    style: const TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w800,
                      color: AppColors.ink,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFFD3E2F4)),
                  ),
                  child: Text(
                    '${lessons.length} دروس',
                    style: const TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w800,
                      color: AppColors.blueDark,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ── Lesson List inside Unit ──
          Padding(
            padding: const EdgeInsets.all(8),
            child: Column(
              children: lessons.map((lesson) => _buildLessonRow(course, lesson)).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLessonRow(Course course, Lesson lesson) {
    return InkWell(
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => LessonDetailView(
              lesson: lesson,
              courseTitle: course.title,
            ),
          ),
        );
      },
      splashColor: Colors.transparent,
      highlightColor: Colors.transparent,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        margin: const EdgeInsets.only(bottom: 7),
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFFE8EEF6)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.02),
              blurRadius: 4,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Row(
          children: [
            // Real Video Thumbnail with Duration Badge and Play Button
            LessonThumbnail(
              thumbnailUrl: lesson.thumbnailUrl,
              durationMinutes: lesson.durationMinutes ?? 45,
              width: 84,
              height: 56,
              borderRadius: 8,
            ),

            const SizedBox(width: 10),

            // Lesson Details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    lesson.title,
                    style: const TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w800,
                      color: AppColors.ink,
                      height: 1.4,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF0FDF4),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          'خريطة ذهنية',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF15803D),
                          ),
                        ),
                      ),
                      const SizedBox(width: 5),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          'بنك الأسئلة',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                            color: AppColors.blueDark,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(width: 6),
            const Icon(AppIcons.chevronLeft, size: 20, color: AppColors.muted),
          ],
        ),
      ),
    );
  }

  String _getCanonicalUnit(String rawUnit, String title) {
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
    if (combined.contains('الخامسة') || combined.contains('الخامسه') || combined.contains('Unit 5') || combined.contains('unit 5')) {
      return 'الوحدة الخامسة: الحوسبة السحابية';
    }
    if (combined.contains('السادسة') || combined.contains('السادسه') || combined.contains('Unit 6') || combined.contains('unit 6')) {
      return 'الوحدة السادسة: مفاهيم متقدمة';
    }
    return rawUnit.trim().isNotEmpty ? rawUnit.trim() : 'الوحدة الأولى: أساسيات الذكاء الاصطناعي والمجتمع';
  }
}
