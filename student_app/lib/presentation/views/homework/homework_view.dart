import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:student_app/core/constants/app_colors.dart';
import 'package:student_app/domain/entities/quiz.dart';
import 'package:student_app/presentation/viewmodels/auth_viewmodel.dart';
import 'package:student_app/presentation/viewmodels/homework_viewmodel.dart';
import 'package:student_app/presentation/views/quizzes/quiz_player_view.dart';
import 'package:student_app/presentation/widgets/lesson_summary_upload_sheet.dart';

class HomeworkView extends StatefulWidget {
  const HomeworkView({super.key});

  @override
  State<HomeworkView> createState() => _HomeworkViewState();
}

class _HomeworkViewState extends State<HomeworkView> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authVm = context.read<AuthViewModel>();
      context.read<HomeworkViewModel>().loadHomework(stage: authVm.currentStudent?.stage);
    });
  }

  @override
  Widget build(BuildContext context) {
    final hwVm = context.watch<HomeworkViewModel>();
    final authVm = context.watch<AuthViewModel>();
    final student = authVm.currentStudent;

    final homeworkList = hwVm.homeworkList;

    return Scaffold(
      backgroundColor: AppColors.bgLight,
      body: RefreshIndicator(
        color: AppColors.blue,
        onRefresh: () => hwVm.loadHomework(stage: student?.stage),
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
                          'واجباتي',
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'واجبات اليوم والمطلوب تسليمه',
                          style: TextStyle(
                            fontSize: 10.5,
                            color: Colors.white70,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    InkWell(
                      onTap: () => hwVm.loadHomework(stage: student?.stage),
                      borderRadius: BorderRadius.circular(11),
                      child: Container(
                        width: 34,
                        height: 34,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(11),
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.38),
                            width: 1,
                          ),
                        ),
                        child: const Icon(
                          Icons.refresh_rounded,
                          color: Colors.white,
                          size: 18,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // ── Content ──
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 30),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Summary Band
                    Container(
                      padding: const EdgeInsets.all(13),
                      decoration: BoxDecoration(
                        color: AppColors.soft,
                        borderRadius: BorderRadius.circular(15),
                        border: Border.all(color: const Color(0xFFDCEAFF)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: const [
                              Text(
                                'واجب اليوم المطلوب تسليمه',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.ink,
                                ),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'تابع التكليفات المطلوبة',
                                style: TextStyle(fontSize: 10, color: AppColors.muted),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.amberLight,
                              borderRadius: BorderRadius.circular(15),
                            ),
                            child: Text(
                              '${homeworkList.isNotEmpty ? homeworkList.length : 2} واجب مطلوب',
                              style: const TextStyle(
                                fontSize: 9.5,
                                fontWeight: FontWeight.w700,
                                color: AppColors.amberDark,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 14),

                    if (hwVm.isLoading)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 40),
                        child: Center(child: CircularProgressIndicator(strokeWidth: 2.5)),
                      )
                    else if (homeworkList.isNotEmpty)
                      ...List.generate(homeworkList.length, (index) {
                        final hw = homeworkList[index];
                        return _buildHomeworkCard(
                          index: index + 1,
                          title: hw.title,
                          detail: 'تُنقل وتُحل في كشكول الواجب بخط اليد',
                          stage: hw.stage.isNotEmpty ? hw.stage : (student?.stage ?? 'الصف الثاني الثانوي'),
                          quiz: hw,
                        );
                      })
                    else ...[
                      // Fallback cards matching the exact design
                      _buildHomeworkCard(
                        index: 1,
                        title: 'واجب منزلي شامل على 3 دروس مختارة (الوحدة الأولى: الذكاء الاصطناعي والمجتمع)',
                        detail: 'تُنقل وتُحل في كشكول الواجب بخط اليد',
                        stage: student?.stage ?? 'الصف الأول الثانوي',
                      ),
                      _buildHomeworkCard(
                        index: 2,
                        title: 'واجب مقالي: الوحدة الأولى (الدرس 1 و 2) — تسليم يدوي بالحصة',
                        detail: 'تُنقل وتُحل في كشكول الواجب بخط اليد',
                        stage: student?.stage ?? 'الصف الأول الثانوي',
                      ),
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

  Widget _buildHomeworkCard({
    required int index,
    required String title,
    required String detail,
    required String stage,
    Quiz? quiz,
  }) {
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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.amberLight,
                  borderRadius: BorderRadius.circular(15),
                ),
                child: const Text(
                  'مطلوب التسليم',
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w700,
                    color: AppColors.amberDark,
                  ),
                ),
              ),
              Text(
                'الواجب $index',
                style: const TextStyle(
                  fontSize: 10,
                  color: AppColors.muted,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            title,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              color: AppColors.ink,
              height: 1.55,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            detail,
            style: const TextStyle(
              fontSize: 10,
              color: AppColors.muted,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 7),
          Text(
            stage,
            style: const TextStyle(
              fontSize: 9.5,
              color: Color(0xFF8294AA),
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              OutlinedButton.icon(
                onPressed: () {
                  if (quiz != null && quiz.questions.isNotEmpty) {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => QuizPlayerView(quiz: quiz),
                      ),
                    );
                  } else {
                    LessonSummaryUploadSheet.show(context, lessonTitle: title);
                  }
                },
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.blueDark,
                  side: const BorderSide(color: Color(0xFFCFE2FF)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppColors.radiusButton),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                ),
                icon: const Icon(Icons.edit_outlined, size: 14),
                label: const Text(
                  'تفاصيل الواجب',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800),
                ),
              ),
              const SizedBox(width: 8),
              OutlinedButton.icon(
                onPressed: () => LessonSummaryUploadSheet.show(context, lessonTitle: title),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.blue,
                  side: const BorderSide(color: Color(0xFFCFE2FF)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppColors.radiusButton),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                ),
                icon: const Icon(Icons.camera_alt_outlined, size: 14),
                label: const Text(
                  'رفع الكشكول',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
