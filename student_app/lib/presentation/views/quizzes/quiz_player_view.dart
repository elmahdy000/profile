import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:student_app/core/constants/app_colors.dart';
import 'package:student_app/core/services/sound_service.dart';
import 'package:student_app/domain/entities/question.dart';
import 'package:student_app/domain/entities/quiz.dart';
import 'package:student_app/domain/repositories/i_quizzes_repository.dart';
import 'package:student_app/presentation/viewmodels/quiz_player_viewmodel.dart';
import 'package:student_app/presentation/widgets/animated_entrance.dart';
import 'package:student_app/presentation/widgets/app_card.dart';
import 'package:student_app/presentation/widgets/primary_button.dart';
import 'package:student_app/presentation/widgets/status_badge.dart';
import 'quiz_review_view.dart';

class QuizPlayerView extends StatelessWidget {
  const QuizPlayerView({required this.quiz, super.key});

  final Quiz quiz;

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (ctx) => QuizPlayerViewModel(
        quiz: quiz,
        quizzesRepository: ctx.read<IQuizzesRepository>(),
      ),
      child: const _QuizPlayerContent(),
    );
  }
}

class _QuizPlayerContent extends StatelessWidget {
  const _QuizPlayerContent();

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<QuizPlayerViewModel>();
    final quiz = vm.quiz;
    final isHomework = vm.isHomework;

    return Scaffold(
      appBar: AppBar(
        title: Text(quiz.title),
        actions: [
          if (!isHomework && vm.secondsRemaining != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Center(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.timer_outlined,
                      size: 16,
                      color: vm.secondsRemaining! < 300 ? AppColors.rose : AppColors.amberDark,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      _formatTime(vm.secondsRemaining!),
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w900,
                        color: vm.secondsRemaining! < 300 ? AppColors.rose : AppColors.amberDark,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          IconButton(
            icon: const Icon(Icons.grid_view_rounded),
            tooltip: 'فهرس الأسئلة',
            onPressed: () => _showQuestionGridSheet(context, vm),
          ),
        ],
      ),
      body: SafeArea(
        child: vm.isFinished
            ? _buildResultScreen(context, vm)
            : quiz.questions.isEmpty
                ? const Center(
                    child: Text(
                      'لا توجد أسئلة مضافة في هذا المستند حالياً.',
                      style: TextStyle(fontSize: 13, color: Colors.grey),
                    ),
                  )
                : Column(
                    children: [
                      // Header Progress Strip
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        color: isHomework
                            ? AppColors.amber.withValues(alpha: 0.12)
                            : AppColors.primary.withValues(alpha: 0.08),
                        child: Row(
                          children: [
                            StatusBadge(
                              text: isHomework
                                  ? 'واجب منزلي (تسليم ورقي بالحصة)'
                                  : 'اختبار إلكتروني تفاعلي',
                              color: isHomework ? AppColors.amberDark : AppColors.primary,
                            ),
                            const Spacer(),
                            Text(
                              'سؤال ${vm.currentIndex + 1} من ${quiz.questions.length}',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
                            ),
                          ],
                        ),
                      ),

                      // Linear Progress bar
                      ClipRRect(
                        child: LinearProgressIndicator(
                          value: (vm.currentIndex + 1) / quiz.questions.length,
                          minHeight: 4,
                          backgroundColor: Colors.transparent,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            isHomework ? AppColors.amberDark : AppColors.primary,
                          ),
                        ),
                      ),

                      // Question Body
                      Expanded(
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.all(16),
                          child: _buildQuestionCard(context, vm),
                        ),
                      ),

                      // Bottom Navigation Actions
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Theme.of(context).cardColor,
                          border: Border(
                            top: BorderSide(
                              color: Theme.of(context).dividerColor,
                            ),
                          ),
                        ),
                        child: Row(
                          children: [
                            if (vm.currentIndex > 0)
                              Expanded(
                                child: OutlinedButton(
                                  onPressed: vm.previousQuestion,
                                  style: OutlinedButton.styleFrom(
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                  ),
                                  child: const Text('السابق'),
                                ),
                              )
                            else
                              const Spacer(),
                            const SizedBox(width: 12),
                            if (vm.currentIndex < quiz.questions.length - 1)
                              Expanded(
                                child: PrimaryButton(
                                  title: 'السؤال التالي',
                                  onPressed: vm.nextQuestion,
                                ),
                              )
                            else if (!isHomework)
                              Expanded(
                                child: PrimaryButton(
                                  title: 'تسليم الاختبار',
                                  backgroundColor: AppColors.emerald,
                                  isLoading: vm.isSubmitting,
                                  onPressed: () => _confirmSubmit(context, vm),
                                ),
                              )
                            else
                              Expanded(
                                child: PrimaryButton(
                                  title: 'تم الانتهاء من المراجعة',
                                  backgroundColor: AppColors.amberDark,
                                  onPressed: () => Navigator.of(context).pop(),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
      ),
    );
  }

  Widget _buildQuestionCard(BuildContext context, QuizPlayerViewModel vm) {
    final q = vm.quiz.questions[vm.currentIndex];
    final isHomework = vm.isHomework;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CircleAvatar(
                    radius: 14,
                    backgroundColor: isHomework
                        ? AppColors.amberDark.withValues(alpha: 0.15)
                        : AppColors.primary.withValues(alpha: 0.15),
                    child: Text(
                      '${vm.currentIndex + 1}',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        color: isHomework ? AppColors.amberDark : AppColors.primary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      q.statement,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, height: 1.45),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),

              // If Question is Essay
              if (q.type == QuestionType.essay) ...[
                if (isHomework) ...[
                  // STRICT HOMEWORK RULE: Never ask for typing!
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.amber.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.amber.withValues(alpha: 0.3)),
                    ),
                    child: const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.edit_note_rounded, color: AppColors.amberDark, size: 22),
                            SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'سؤال مقالي ورقي — يُنقل ويُحل في كشكول الواجب بخط اليد ويُسلّم بالحصة القادمة',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w900,
                                  color: AppColors.amberDark,
                                  height: 1.4,
                                ),
                              ),
                            ),
                          ],
                        ),
                        SizedBox(height: 14),
                        Divider(height: 1),
                        SizedBox(height: 10),
                        Divider(height: 1),
                        SizedBox(height: 10),
                        Divider(height: 1),
                        SizedBox(height: 12),
                        Text(
                          'تنبيه: لا يتطلب الحل كتابة إلكترونية على التطبيق، انقله وحله ورقياً في كشكولك الخاص لتصحيحه بالحصة.',
                          style: TextStyle(fontSize: 11, color: Colors.grey, height: 1.35),
                        ),
                      ],
                    ),
                  ),
                ] else ...[
                  // Online Exam Essay Input
                  TextField(
                    maxLines: 4,
                    decoration: InputDecoration(
                      hintText: 'اكتب إجابتك المقالية وخطوات الحل هنا...',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    onChanged: (val) => vm.updateEssayAnswer(vm.currentIndex, val),
                  ),
                ],
              ] else ...[
                // MCQ / TrueFalse options with animated tap selection
                ...q.options.asMap().entries.map((entry) {
                  final idx = entry.key;
                  final text = entry.value;
                  final isSelected = vm.selectedOptions[vm.currentIndex] == idx;

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: InkWell(
                      onTap: () {
                        SoundService().playTap();
                        vm.selectOption(vm.currentIndex, idx);
                      },
                      borderRadius: BorderRadius.circular(14),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? AppColors.primary.withValues(alpha: 0.12)
                              : Colors.transparent,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: isSelected ? AppColors.primary : Theme.of(context).dividerColor,
                            width: isSelected ? 2 : 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 12,
                              backgroundColor: isSelected ? AppColors.primary : Colors.grey.shade300,
                              child: Text(
                                '${idx + 1}',
                                style: TextStyle(
                                  color: isSelected ? Colors.white : Colors.black,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                text,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: isSelected ? FontWeight.w900 : FontWeight.w600,
                                  color: isSelected ? AppColors.primary : null,
                                ),
                              ),
                            ),
                            if (isSelected)
                              const Icon(Icons.check_circle_rounded, color: AppColors.primary, size: 20),
                          ],
                        ),
                      ),
                    ),
                  );
                }),
              ],
            ],
          ),
        ),
      ],
    );
  }

  void _showQuestionGridSheet(BuildContext context, QuizPlayerViewModel vm) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'فهرس أسئلة الاختبار',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 16),
              Flexible(
                child: GridView.builder(
                  shrinkWrap: true,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 5,
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                    childAspectRatio: 1.2,
                  ),
                  itemCount: vm.quiz.questions.length,
                  itemBuilder: (context, i) {
                    final isAnswered = vm.selectedOptions.containsKey(i) ||
                        vm.essayAnswers.containsKey(i);
                    final isCurrent = vm.currentIndex == i;

                    return GestureDetector(
                      onTap: () {
                        vm.goToQuestion(i);
                        Navigator.of(ctx).pop();
                      },
                      child: Container(
                        decoration: BoxDecoration(
                          color: isCurrent
                              ? AppColors.primary
                              : isAnswered
                                  ? AppColors.emerald.withValues(alpha: 0.15)
                                  : Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: isCurrent
                                ? AppColors.primary
                                : isAnswered
                                    ? AppColors.emerald
                                    : Colors.grey.shade400,
                          ),
                        ),
                        child: Center(
                          child: Text(
                            '${i + 1}',
                            style: TextStyle(
                              color: isCurrent
                                  ? Colors.white
                                  : isAnswered
                                      ? AppColors.emerald
                                      : null,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _confirmSubmit(BuildContext context, QuizPlayerViewModel vm) async {
    final unanswered = vm.quiz.questions.length - vm.selectedOptions.length;
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('تأكيد تسليم الاختبار'),
        content: Text(
          unanswered > 0
              ? 'لديك $unanswered أسئلة لم تقم بالإجابة عليها بعد. هل أنت متأكد من رغبتك في تسليم الاختبار الآن؟'
              : 'هل أنت متأكد من مراجعة جميع الإجابات ورغبتك في تسليم الاختبار؟',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('متابعة الحل'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.emerald),
            child: const Text('تأكيد التسليم', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await vm.submitQuiz();
      if (vm.isFinished) {
        SoundService().playComplete();
      }
    }
  }

  Widget _buildResultScreen(BuildContext context, QuizPlayerViewModel vm) {
    final passed = (vm.score ?? 0) >= vm.quiz.passingScore;

    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            FadeSlideTransition(
              offset: const Offset(0, -0.3),
              child: CircleAvatar(
                radius: 46,
                backgroundColor: passed ? AppColors.emerald : AppColors.amberDark,
                child: Icon(
                  passed ? Icons.emoji_events_rounded : Icons.replay_rounded,
                  color: Colors.white,
                  size: 52,
                ),
              ),
            ),
            const SizedBox(height: 20),
            FadeSlideTransition(
              delay: const Duration(milliseconds: 100),
              child: Text(
                passed ? 'تهانينا، اجتزت الاختبار بنجاح' : 'تم إنهاء الاختبار، استمر في المحاولة والمذاكرة',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
              ),
            ),
            const SizedBox(height: 12),
            FadeSlideTransition(
              delay: const Duration(milliseconds: 200),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                decoration: BoxDecoration(
                  color: (passed ? AppColors.emerald : AppColors.amber).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: (passed ? AppColors.emerald : AppColors.amber).withValues(alpha: 0.35),
                  ),
                ),
                child: Text(
                  'الدرجة النهائية: ${vm.score ?? 0} %',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                    color: passed ? AppColors.emerald : AppColors.amberDark,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),
            FadeSlideTransition(
              delay: const Duration(milliseconds: 250),
              child: OutlinedButton.icon(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => QuizReviewView(
                        quiz: vm.quiz,
                        selectedOptions: vm.selectedOptions,
                        finalScore: vm.score ?? 0,
                      ),
                    ),
                  );
                },
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(48),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  side: const BorderSide(color: AppColors.primary),
                ),
                icon: const Icon(Icons.fact_check_rounded, color: AppColors.primary),
                label: const Text(
                  'مراجعة الإجابات النموذجية بالتفصيل',
                  style: TextStyle(fontWeight: FontWeight.w900, color: AppColors.primary),
                ),
              ),
            ),
            const SizedBox(height: 12),
            FadeSlideTransition(
              delay: const Duration(milliseconds: 300),
              child: PrimaryButton(
                title: 'العودة للمنصة الرئيسية',
                onPressed: () => Navigator.of(context).pop(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(int totalSeconds) {
    final m = totalSeconds ~/ 60;
    final s = totalSeconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }
}
