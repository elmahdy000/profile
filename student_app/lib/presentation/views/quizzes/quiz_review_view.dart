import 'package:flutter/material.dart';
import 'package:student_app/core/constants/app_colors.dart';
import 'package:student_app/core/services/sound_service.dart';
import 'package:student_app/domain/entities/quiz.dart';
import 'package:student_app/domain/entities/question.dart';
import 'package:student_app/presentation/widgets/animated_entrance.dart';
import 'package:student_app/presentation/widgets/app_card.dart';
import 'package:student_app/presentation/widgets/status_badge.dart';

class QuizReviewView extends StatefulWidget {
  const QuizReviewView({
    required this.quiz,
    required this.selectedOptions,
    required this.finalScore,
    super.key,
  });

  final Quiz quiz;
  final Map<int, int> selectedOptions;
  final int finalScore;

  @override
  State<QuizReviewView> createState() => _QuizReviewViewState();
}

class _QuizReviewViewState extends State<QuizReviewView> {
  String _filter = 'all'; // 'all', 'correct', 'incorrect'

  @override
  void initState() {
    super.initState();
    if (widget.finalScore >= widget.quiz.passingScore) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        SoundService().playComplete();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final quiz = widget.quiz;
    final questions = quiz.questions;

    final reviewedQuestions = questions.asMap().entries.map((entry) {
      final idx = entry.key;
      final q = entry.value;
      final selected = widget.selectedOptions[idx];

      bool isCorrect = false;
      if (q.type == QuestionType.essay) {
        isCorrect = true; // marked as submitted
      } else {
        if (q.correctIndex != null && selected != null) {
          isCorrect = selected == q.correctIndex;
        } else if (q.correctAnswer != null && selected != null && selected < q.options.length) {
          isCorrect = q.options[selected].trim() == q.correctAnswer!.trim();
        }
      }

      return (
        index: idx,
        question: q,
        selectedOption: selected,
        isCorrect: isCorrect,
      );
    }).toList();

    final filtered = reviewedQuestions.where((item) {
      if (_filter == 'correct') return item.isCorrect;
      if (_filter == 'incorrect') return !item.isCorrect;
      return true;
    }).toList();

    final totalCorrect = reviewedQuestions.where((i) => i.isCorrect).length;
    final totalQuestions = reviewedQuestions.length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('مراجعة إجابات الاختبار'),
      ),
      body: Column(
        children: [
          // Score Summary Banner
          FadeSlideTransition(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              color: AppColors.primary.withValues(alpha: 0.08),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 20,
                    backgroundColor: AppColors.primary,
                    child: Text(
                      '${widget.finalScore}%',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          quiz.title,
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'أجبت $totalCorrect إجابة صحيحة من أصل $totalQuestions سؤال',
                          style: const TextStyle(fontSize: 11, color: Colors.grey),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Filters
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                _buildFilterButton('الكل ($totalQuestions)', 'all'),
                const SizedBox(width: 8),
                _buildFilterButton('الصحيحة ($totalCorrect)', 'correct'),
                const SizedBox(width: 8),
                _buildFilterButton('الخاطئة (${totalQuestions - totalCorrect})', 'incorrect'),
              ],
            ),
          ),

          Expanded(
            child: filtered.isEmpty
                ? const Center(
                    child: Text(
                      'لا توجد أسئلة تطابق التصفية الحالية',
                      style: TextStyle(fontSize: 13, color: Colors.grey),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: filtered.length,
                    itemBuilder: (context, idx) {
                      final item = filtered[idx];
                      final q = item.question;

                      return FadeSlideTransition(
                        delay: Duration(milliseconds: idx * 40),
                        child: Padding(
                          padding: const EdgeInsets.only(bottom: 14),
                          child: AppCard(
                            borderColor: item.isCorrect
                                ? AppColors.emerald.withValues(alpha: 0.3)
                                : AppColors.rose.withValues(alpha: 0.3),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    StatusBadge(
                                      text: item.isCorrect ? 'إجابة صحيحة' : 'إجابة خاطئة',
                                      color: item.isCorrect ? AppColors.emerald : AppColors.rose,
                                      icon: item.isCorrect
                                          ? Icons.check_circle_rounded
                                          : Icons.cancel_rounded,
                                    ),
                                    const Spacer(),
                                    Text(
                                      'سؤال ${item.index + 1}',
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.grey,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  q.statement,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w900,
                                    height: 1.4,
                                  ),
                                ),
                                const SizedBox(height: 14),

                                // Options Breakdown
                                ...q.options.asMap().entries.map((optEntry) {
                                  final optIdx = optEntry.key;
                                  final optText = optEntry.value;
                                  final isChosen = item.selectedOption == optIdx;
                                  final isCorrectOpt = q.correctIndex == optIdx ||
                                      (q.correctAnswer != null &&
                                          optText.trim() == q.correctAnswer!.trim());

                                  Color? bgColor;
                                  Color borderColor = Theme.of(context).dividerColor;
                                  Color? textColor;
                                  IconData? trailingIcon;

                                  if (isCorrectOpt) {
                                    bgColor = AppColors.emerald.withValues(alpha: 0.12);
                                    borderColor = AppColors.emerald;
                                    textColor = AppColors.emerald;
                                    trailingIcon = Icons.check_circle_rounded;
                                  } else if (isChosen && !item.isCorrect) {
                                    bgColor = AppColors.rose.withValues(alpha: 0.12);
                                    borderColor = AppColors.rose;
                                    textColor = AppColors.rose;
                                    trailingIcon = Icons.close_rounded;
                                  }

                                  return Container(
                                    margin: const EdgeInsets.only(bottom: 8),
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                    decoration: BoxDecoration(
                                      color: bgColor ?? Colors.transparent,
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: borderColor),
                                    ),
                                    child: Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            optText,
                                            style: TextStyle(
                                              fontSize: 13,
                                              fontWeight: (isChosen || isCorrectOpt)
                                                  ? FontWeight.w900
                                                  : FontWeight.w500,
                                              color: textColor,
                                            ),
                                          ),
                                        ),
                                        if (isChosen && !isCorrectOpt)
                                          const Text(
                                            '(إجابتك) ',
                                            style: TextStyle(
                                              fontSize: 11,
                                              color: AppColors.rose,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        if (isCorrectOpt)
                                          const Text(
                                            '(الإجابة النموذجية) ',
                                            style: TextStyle(
                                              fontSize: 11,
                                              color: AppColors.emerald,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        if (trailingIcon != null)
                                          Icon(trailingIcon, size: 18, color: textColor),
                                      ],
                                    ),
                                  );
                                }),

                                // Explanation if present
                                if (q.explanation != null && q.explanation!.isNotEmpty) ...[
                                  const SizedBox(height: 8),
                                  Container(
                                    width: double.infinity,
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: AppColors.primary.withValues(alpha: 0.08),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: AppColors.primary.withValues(alpha: 0.2),
                                      ),
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Row(
                                          children: [
                                            Icon(Icons.lightbulb_outline_rounded,
                                                color: AppColors.primary, size: 16),
                                            SizedBox(width: 6),
                                            Text(
                                              'توضيح وشرح السؤال:',
                                              style: TextStyle(
                                                fontSize: 11,
                                                fontWeight: FontWeight.w900,
                                                color: AppColors.primary,
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          q.explanation!,
                                          style: const TextStyle(fontSize: 12, height: 1.4),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ],
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
  }

  Widget _buildFilterButton(String label, String value) {
    final isSelected = _filter == value;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _filter = value),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected ? AppColors.primary : Theme.of(context).dividerColor,
            ),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 11,
              fontWeight: isSelected ? FontWeight.w900 : FontWeight.w600,
              color: isSelected ? Colors.white : Colors.grey,
            ),
          ),
        ),
      ),
    );
  }
}
