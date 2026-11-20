import 'package:flutter/material.dart';
import 'package:student_app/core/constants/app_colors.dart';

class EssayExamItem {
  const EssayExamItem({
    required this.id,
    required this.title,
    required this.stage,
    required this.unit,
    required this.durationMinutes,
    required this.totalPoints,
    required this.questions,
    this.status = 'available', // 'available', 'submitted', 'reviewed'
    this.studentScore,
    this.teacherFeedback,
  });

  final int id;
  final String title;
  final String stage;
  final String unit;
  final int durationMinutes;
  final int totalPoints;
  final List<EssayQuestionItem> questions;
  final String status;
  final int? studentScore;
  final String? teacherFeedback;
}

class EssayQuestionItem {
  const EssayQuestionItem({
    required this.id,
    required this.prompt,
    required this.points,
    this.modelAnswer,
  });

  final String id;
  final String prompt;
  final int points;
  final String? modelAnswer;
}

class EssayExamsView extends StatefulWidget {
  const EssayExamsView({super.key});

  @override
  State<EssayExamsView> createState() => _EssayExamsViewState();
}

class _EssayExamsViewState extends State<EssayExamsView> {
  String _selectedFilter = 'all'; // 'all', 'graded', 'open'

  static final List<EssayExamItem> _exams = [
    const EssayExamItem(
      id: 1,
      title: 'امتحان مقالي: كتابة وتتبع خوارزميات التكرار والشرط',
      stage: 'الصف الأول الثانوي',
      unit: 'الوحدة الأولى · الخوارزميات',
      durationMinutes: 30,
      totalPoints: 20,
      status: 'reviewed',
      studentScore: 19,
      teacherFeedback: 'ملاحظة المعلم: إجابة ممتازة وخطوات تحقق منطقية دقيقة! أحسنت يا بطل.',
      questions: [
        EssayQuestionItem(
          id: 'q1',
          prompt: 'اكتب خوارزمية كاملة بلغة بايثون لحساب وطباعة مضروب العدد الصحيح (Factorial).',
          points: 10,
          modelAnswer: 'def factorial(n):\n    result = 1\n    for i in range(1, n + 1):\n        result *= i\n    return result',
        ),
        EssayQuestionItem(
          id: 'q2',
          prompt: 'ارسم خطوات خريطة التدفق لحساب متوسط درجات 5 طلاب وإظهار تقدير كل طالب.',
          points: 10,
          modelAnswer: 'إدخال الدرجات 5 مرات في حلقة تكرار، حساب المجموع والقسمة على 5، ثم مقارنة المتوسط بطباعة التقدير.',
        ),
      ],
    ),
    const EssayExamItem(
      id: 2,
      title: 'امتحان مقالي: معالجة البيانات وبناء هياكل المصفوفات',
      stage: 'الصف الأول الثانوي',
      unit: 'الوحدة الثانية · البرمجة وبايثون',
      durationMinutes: 35,
      totalPoints: 25,
      status: 'available',
      questions: [
        EssayQuestionItem(
          id: 'q3',
          prompt: 'وضح الفرق بين المصفوفة الأحادية (1D Array) والمصفوفة ثنائية الأبعاد (2D Array) مع مثال برمجي.',
          points: 12,
          modelAnswer: 'المصفوفة الأحادية تمثل صفاً واحداً من العناصر المتجاورة، بينما الثنائية تمثل جدولاً من صفوف وأعمدة.',
        ),
        EssayQuestionItem(
          id: 'q4',
          prompt: 'اكتب دالة برمجية تبحث عن أكبر عنصر في قائمة أرقام محددة.',
          points: 13,
          modelAnswer: 'max_val = numbers[0]\nfor num in numbers:\n    if num > max_val:\n        max_val = num',
        ),
      ],
    ),
  ];

  void _showExamDialog(EssayExamItem exam) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 30),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                exam.title,
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 6),
              Text(
                'الدرجة الكلية: ${exam.totalPoints} نقطة · مدة الامتحان: ${exam.durationMinutes} دقيقة',
                style: const TextStyle(fontSize: 11, color: AppColors.muted),
              ),
              const SizedBox(height: 16),
              ...exam.questions.map((q) => Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFD),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.line),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'سؤال: ${q.prompt}',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                        ),
                        if (q.modelAnswer != null) ...[
                          const SizedBox(height: 6),
                          Text(
                            'الإجابة النموذجية: ${q.modelAnswer}',
                            style: const TextStyle(fontSize: 10.5, color: Color(0xFF107050)),
                          ),
                        ],
                      ],
                    ),
                  )),
              const SizedBox(height: 10),
              ElevatedButton(
                onPressed: () => Navigator.of(ctx).pop(),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.blue,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(11)),
                ),
                child: const Text('إغلاق', style: TextStyle(fontWeight: FontWeight.w800)),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _exams.where((e) {
      if (_selectedFilter == 'graded') return e.status == 'reviewed';
      if (_selectedFilter == 'open') return e.status == 'available';
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.bgLight,
      body: SingleChildScrollView(
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
                        'الامتحانات المقالية التحريرية',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'تابع نتائجك والاختبارات المتاحة',
                        style: TextStyle(
                          fontSize: 10.5,
                          color: Colors.white70,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  InkWell(
                    onTap: () => Navigator.of(context).pop(),
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
                        Icons.arrow_forward_rounded,
                        color: Colors.white,
                        size: 22,
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
                              'امتحاناتك المقالية',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w800,
                                color: AppColors.ink,
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'امتحانات محلولة وامتحانات مفتوحة',
                              style: TextStyle(fontSize: 10, color: AppColors.muted),
                            ),
                          ],
                        ),
                        Container(
                          width: 41,
                          height: 41,
                          decoration: BoxDecoration(
                            color: const Color(0xFFD7EAFF),
                            borderRadius: BorderRadius.circular(13),
                          ),
                          child: const Center(
                            child: Icon(Icons.assignment_outlined, color: AppColors.blueDark, size: 22),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 12),

                  // Filter Row
                  Row(
                    children: [
                      _buildFilterChip(id: 'all', label: 'الكل'),
                      const SizedBox(width: 7),
                      _buildFilterChip(id: 'graded', label: 'تم التصحيح'),
                      const SizedBox(width: 7),
                      _buildFilterChip(id: 'open', label: 'متاحة للحل'),
                    ],
                  ),

                  const SizedBox(height: 14),

                  // Exam Cards
                  ...filtered.map((exam) => _buildExamCard(exam)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip({required String id, required String label}) {
    final isSelected = _selectedFilter == id;
    return InkWell(
      onTap: () => setState(() => _selectedFilter = id),
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
          style: TextStyle(
            fontSize: 10.5,
            fontWeight: FontWeight.w700,
            color: isSelected ? Colors.white : const Color(0xFF7890AA),
          ),
        ),
      ),
    );
  }

  Widget _buildExamCard(EssayExamItem exam) {
    final isGraded = exam.status == 'reviewed';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(13),
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
                  color: isGraded ? const Color(0xFFE7F8EF) : const Color(0xFFFFEFF0),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Center(
                  child: Icon(
                    isGraded ? Icons.military_tech_outlined : Icons.edit_note_rounded,
                    color: isGraded ? const Color(0xFF1D9B72) : const Color(0xFFD75D68),
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
                      exam.title,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: AppColors.ink,
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '${exam.stage} · ${exam.unit}',
                      style: const TextStyle(
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
                  color: isGraded ? AppColors.greenLight : AppColors.redLight,
                  borderRadius: BorderRadius.circular(15),
                ),
                child: Text(
                  isGraded ? 'تم التصحيح' : 'لم تبدأ بعد',
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w700,
                    color: isGraded ? const Color(0xFF078456) : const Color(0xFFD35362),
                  ),
                ),
              ),
              Text(
                isGraded ? '${exam.studentScore}/${exam.totalPoints}' : 'متاح للحل',
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w900,
                  color: isGraded ? const Color(0xFF118860) : const Color(0xFFB74F60),
                ),
              ),
            ],
          ),
          if (isGraded && exam.teacherFeedback != null) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFFF5F8FD),
                borderRadius: BorderRadius.circular(11),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.sticky_note_2_outlined, size: 14, color: Color(0xFF617995)),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      exam.teacherFeedback!,
                      style: const TextStyle(
                        fontSize: 10,
                        color: Color(0xFF617995),
                        height: 1.6,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 11),
          if (isGraded)
            OutlinedButton(
              onPressed: () => _showExamDialog(exam),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.blueDark,
                side: const BorderSide(color: Color(0xFFCFE2FF)),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppColors.radiusButton),
                ),
                padding: const EdgeInsets.symmetric(vertical: 8),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: const [
                  Text('عرض التفاصيل', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
                  SizedBox(width: 4),
                  Icon(Icons.chevron_left_rounded, size: 16),
                ],
              ),
            )
          else
            ElevatedButton(
              onPressed: () => _showExamDialog(exam),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.blue,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppColors.radiusButton),
                ),
                padding: const EdgeInsets.symmetric(vertical: 8),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: const [
                  Text('ابدأ الحل', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
                  SizedBox(width: 4),
                  Icon(Icons.chevron_left_rounded, size: 16),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
