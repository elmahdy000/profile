import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:student_app/core/constants/app_colors.dart';
import 'package:student_app/core/constants/app_icons.dart';
import 'package:student_app/core/utils/app_toast.dart';
import 'package:student_app/domain/entities/course.dart';
import 'package:student_app/presentation/viewmodels/auth_viewmodel.dart';
import 'package:student_app/presentation/viewmodels/home_viewmodel.dart';
import 'package:student_app/presentation/views/courses/courses_view.dart';
import 'package:student_app/presentation/views/courses/lesson_detail_view.dart';
import 'package:student_app/presentation/views/homework/homework_view.dart';
import 'package:student_app/presentation/views/mistakes/my_mistakes_view.dart';
import 'package:student_app/presentation/views/quizzes/quizzes_view.dart';
import 'package:student_app/presentation/widgets/notifications_sheet.dart';
import 'package:student_app/services/notifications_service.dart';

class HomeView extends StatefulWidget {
  const HomeView({super.key});

  @override
  State<HomeView> createState() => _HomeViewState();
}

class _HomeViewState extends State<HomeView> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  Future<void> _loadData() async {
    if (!mounted) return;
    final homeVm = context.read<HomeViewModel>();
    try {
      await Future.wait([
        homeVm.loadDashboardData(),
        NotificationsService().fetchNotifications(),
      ]);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final authVm = context.watch<AuthViewModel>();
    final homeVm = context.watch<HomeViewModel>();
    final student = authVm.currentStudent;

    final studentName = student?.name.isNotEmpty == true ? student!.name : 'Yahia elsayed hassan';
    final initialLetter = studentName.isNotEmpty ? studentName[0].toUpperCase() : 'Y';
    final stageName = (student?.stage?.isNotEmpty ?? false) ? student!.stage : 'الصف الأول الثانوي';

    final primaryCourse = homeVm.recentCourses.isNotEmpty ? homeVm.recentCourses.first : null;
    final primaryCourseTitle = primaryCourse?.title ?? 'الذكاء الاصطناعي والتقنيات الحديثة';

    final notifService = NotificationsService();

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.bgLight,
        body: RefreshIndicator(
          color: AppColors.blue,
          onRefresh: () async {
            await _loadData();
            if (!mounted) return;
            await authVm.checkAuthStatus();
            if (!context.mounted) return;
            AppToast.showSuccess(context, 'تمت مزامنة بياناتك الأكاديمية بنجاح');
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // ── 1. Luxury Executive Blue Header (Clean & Peaceful) ──
                Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Color(0xFF1E3A8A), Color(0xFF2563EB)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.vertical(
                      bottom: Radius.circular(24),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Color.fromRGBO(37, 99, 235, 0.22),
                        blurRadius: 18,
                        offset: Offset(0, 8),
                      ),
                    ],
                  ),
                  padding: EdgeInsets.fromLTRB(
                    16,
                    MediaQuery.of(context).padding.top + 10,
                    16,
                    18,
                  ),
                  child: Column(
                    children: [
                      // Greeting & Notifications Row
                      Row(
                        children: [
                          // Avatar Circle
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.22),
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: Colors.white.withValues(alpha: 0.8),
                                width: 2,
                              ),
                            ),
                            child: Center(
                              child: Text(
                                initialLetter,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 18,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),

                          // Welcome & Student Name
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'مرحباً بك يا بطل',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: Colors.white70,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  studentName,
                                  style: const TextStyle(
                                    fontSize: 15.5,
                                    fontWeight: FontWeight.w900,
                                    color: Colors.white,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),

                          // Notification Bell with Dynamic Unread Counter
                          ListenableBuilder(
                            listenable: notifService,
                            builder: (context, _) {
                              final unread = notifService.unreadCount;
                              return InkWell(
                                onTap: () => NotificationsSheet.show(context),
                                borderRadius: BorderRadius.circular(12),
                                child: Stack(
                                  clipBehavior: Clip.none,
                                  children: [
                                    Container(
                                      width: 40,
                                      height: 40,
                                      decoration: BoxDecoration(
                                        color: Colors.white.withValues(alpha: 0.16),
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(
                                          color: Colors.white.withValues(alpha: 0.35),
                                          width: 1,
                                        ),
                                      ),
                                      child: const Center(
                                        child: Icon(
                                          Icons.notifications_outlined,
                                          color: Colors.white,
                                          size: 20,
                                        ),
                                      ),
                                    ),
                                    if (unread > 0)
                                      Positioned(
                                        top: -3,
                                        left: -3,
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFEF4444),
                                            borderRadius: BorderRadius.circular(10),
                                            border: Border.all(color: Colors.white, width: 1.5),
                                          ),
                                          child: Text(
                                            '$unread',
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 9,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                              );
                            },
                          ),
                        ],
                      ),

                      const SizedBox(height: 12),

                      // Stage & Academic Path Banner
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.14),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.25),
                            width: 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.school_rounded, color: Color(0xFF38BDF8), size: 18),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                '$stageName · د. محمود المهدي',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w700,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFF10B981).withValues(alpha: 0.25),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text(
                                'حساب نشط',
                                style: TextStyle(
                                  color: Color(0xFF6EE7B7),
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                // ── 2. Body Content (Spacious, Uncrowded, High Focus) ──
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Continue Learning Hero Card
                      _buildContinueLearningCard(context, primaryCourse, primaryCourseTitle),

                      const SizedBox(height: 20),

                      // 4 Core Academic Pillars Header
                      const Text(
                        'الخدمات الأكاديمية الأساسية',
                        style: TextStyle(
                          fontSize: 14.5,
                          fontWeight: FontWeight.w900,
                          color: AppColors.ink,
                        ),
                      ),
                      const SizedBox(height: 10),

                      // 4 Academic Bento Tiles (No code editor, no duplicate error cards)
                      _buildAcademicGrid(context),

                      const SizedBox(height: 18),

                      // Calm, Elegant Concept Mastery Tile (Replaces harsh red spotlight)
                      _buildConceptMasteryBanner(context),

                      const SizedBox(height: 18),

                      // Upcoming Homework & Tasks Section
                      _buildHomeworkSection(context),

                      // Safe bottom clearance for docked bar and draggable button
                      const SizedBox(height: 100),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildContinueLearningCard(
    BuildContext context,
    dynamic primaryCourse,
    String primaryCourseTitle,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.line),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF2F89F6).withValues(alpha: 0.08),
            blurRadius: 16,
            offset: const Offset(0, 6),
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
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                decoration: BoxDecoration(
                  color: AppColors.soft,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.video_library_rounded, color: AppColors.blueDark, size: 14),
                    SizedBox(width: 5),
                    Text(
                      'كمّل مذاكرتك',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: AppColors.blueDark,
                      ),
                    ),
                  ],
                ),
              ),
              const Row(
                children: [
                  Icon(Icons.person_rounded, size: 13, color: AppColors.blueDark),
                  SizedBox(width: 4),
                  Text(
                    'د. محمود المهدي',
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w700,
                      color: AppColors.blueDark,
                    ),
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 10),

          Text(
            primaryCourseTitle,
            style: const TextStyle(
              fontSize: 14.5,
              fontWeight: FontWeight.w900,
              color: AppColors.ink,
              height: 1.35,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'الوحدة 1 · الدرس الأول: المفاهيم الأساسية وخريطة المنهج',
            style: TextStyle(
              fontSize: 11,
              color: AppColors.muted,
              fontWeight: FontWeight.w600,
            ),
          ),

          const SizedBox(height: 12),

          // Progress bar
          Row(
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: const LinearProgressIndicator(
                    value: 0.45,
                    minHeight: 5,
                    backgroundColor: AppColors.soft,
                    valueColor: AlwaysStoppedAnimation<Color>(AppColors.blue),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              const Text(
                '45% مكتمل',
                style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.bold,
                  color: AppColors.blue,
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),

          // Resume Button
          InkWell(
            onTap: () {
              Lesson targetLesson;
              if (primaryCourse != null && (primaryCourse.lessons as List).isNotEmpty) {
                targetLesson = primaryCourse.lessons.first;
              } else {
                targetLesson = const Lesson(
                  id: 1,
                  title: 'الدرس الأول: المفاهيم الأساسية وخريطة المنهج',
                  unitName: 'الوحدة الأولى: تقنيات ناشئة',
                  videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                );
              }
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => LessonDetailView(
                    lesson: targetLesson,
                    courseTitle: primaryCourseTitle,
                  ),
                ),
              );
            },
            borderRadius: BorderRadius.circular(10),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 9),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
                ),
                borderRadius: BorderRadius.circular(10),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF2563EB).withValues(alpha: 0.25),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.play_arrow_rounded, color: Colors.white, size: 18),
                  SizedBox(width: 6),
                  Text(
                    'متابعة المشاهدة الآن',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAcademicGrid(BuildContext context) {
    return Row(
      children: [
        // 1. شرح المنهج والدروس
        Expanded(
          child: _buildActionTile(
            title: 'شرح المنهج',
            subtitle: 'الدروس والفيديوهات',
            icon: Icons.play_lesson_rounded,
            accentColor: const Color(0xFF2563EB),
            bgTint: const Color(0xFFEFF6FF),
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const CoursesView()),
            ),
          ),
        ),
        const SizedBox(width: 12),

        // 2. بنك الأسئلة والامتحانات
        Expanded(
          child: _buildActionTile(
            title: 'بنك الأسئلة',
            subtitle: 'تدريبات مقسمة وامتحانات',
            icon: Icons.quiz_rounded,
            accentColor: const Color(0xFF4F46E5),
            bgTint: const Color(0xFFEEF2FF),
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const QuizzesView()),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildActionTile({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color accentColor,
    required Color bgTint,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.line),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: bgTint,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: accentColor, size: 20),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.centerRight,
                    child: Text(
                      title,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        color: AppColors.ink,
                      ),
                    ),
                  ),
                  const SizedBox(height: 2),
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.centerRight,
                    child: Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 9.5,
                        color: AppColors.muted,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 4),
            const Icon(
              AppIcons.chevronLeft, // Explicit non-flipping RTL Drill-down arrow (<)
              color: AppColors.muted,
              size: 16,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildConceptMasteryBanner(BuildContext context) {
    return InkWell(
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const MyMistakesView()),
      ),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
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
              child: const Icon(Icons.tips_and_updates_rounded, color: Color(0xFF2563EB), size: 20),
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'المراجعة',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w900,
                      color: AppColors.ink,
                    ),
                  ),
                  SizedBox(height: 2),
                  Text(
                    'بنك الأسئلة الشامل والتدريبات مع د. محمود المهدي',
                    style: TextStyle(
                      fontSize: 10,
                      color: AppColors.muted,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(
              AppIcons.chevronLeft,
              color: AppColors.muted,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHomeworkSection(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'الواجبات والتكليفات القادمة',
              style: TextStyle(
                fontSize: 14.5,
                fontWeight: FontWeight.w900,
                color: AppColors.ink,
              ),
            ),
            InkWell(
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const HomeworkView()),
              ),
              child: const Row(
                children: [
                  Text('عرض الكل', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.blue)),
                  SizedBox(width: 2),
                  Icon(AppIcons.chevronLeft, size: 16, color: AppColors.blue),
                ],
              ),
            ),
          ],
        ),

        const SizedBox(height: 10),

        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.line),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF4DF),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text(
                      'واجب منزلي · يحتاج تسليم',
                      style: TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFFD08729),
                      ),
                    ),
                  ),
                  const Spacer(),
                  const Text('متبقي يومان', style: TextStyle(fontSize: 10, color: AppColors.muted)),
                ],
              ),
              const SizedBox(height: 8),
              const Text(
                'واجب شامل على 3 دروس مختارة (الوحدة الأولى: الذكاء الاصطناعي)',
                style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: AppColors.ink),
              ),
              const SizedBox(height: 4),
              const Text(
                'يُحل في كشكول الواجب بخط اليد وتصوير الصفحات ورفعها بالمنصة.',
                style: TextStyle(fontSize: 10.5, color: AppColors.muted),
              ),
              const SizedBox(height: 12),
              InkWell(
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const HomeworkView()),
                ),
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.soft,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Center(
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.upload_file_rounded, size: 15, color: AppColors.blue),
                        SizedBox(width: 6),
                        Text(
                          'رفع حل الواجب الآن',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.blue),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
