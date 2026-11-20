import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:student_app/core/constants/app_colors.dart';
import 'package:student_app/presentation/widgets/animated_entrance.dart';
import 'package:student_app/presentation/widgets/app_card.dart';

class SummarySubmission {
  const SummarySubmission({
    required this.id,
    required this.lessonTitle,
    required this.unitName,
    required this.submittedDate,
    required this.status, // 'approved', 'pending', 'changes_requested'
    this.teacherNote,
    this.ratingStars = 5,
  });

  final int id;
  final String lessonTitle;
  final String unitName;
  final String submittedDate;
  final String status;
  final String? teacherNote;
  final int ratingStars;
}

class StudentSummariesView extends StatefulWidget {
  const StudentSummariesView({super.key});

  @override
  State<StudentSummariesView> createState() => _StudentSummariesViewState();
}

class _StudentSummariesViewState extends State<StudentSummariesView> {
  final List<SummarySubmission> _submissions = [
    const SummarySubmission(
      id: 1,
      lessonTitle: 'الدرس الأول: مقدمة في الذكاء الاصطناعي ومفاهيم التعلم الآلي',
      unitName: 'الوحدة الأولى',
      submittedDate: '12 نوفمبر 2026',
      status: 'approved',
      teacherNote: 'تلخيص ممتاز ومرتب جداً! خط جميل وتنسيق رائع للمفاهيم الرئيسية.',
      ratingStars: 5,
    ),
    const SummarySubmission(
      id: 2,
      lessonTitle: 'الدرس الثاني: الخوارزميات ورسم خرائط التدفق (Flowcharts)',
      unitName: 'الوحدة الأولى',
      submittedDate: '15 نوفمبر 2026',
      status: 'approved',
      teacherNote: 'رسم دقيق للأشكال الهندسية ومسارات القرار. أحسنت عملاً وبارك الله فيك.',
      ratingStars: 5,
    ),
    const SummarySubmission(
      id: 3,
      lessonTitle: 'الدرس الثالث: مبادئ البرمجة بلغة بايثون والجمل الشرطية',
      unitName: 'الوحدة الثانية',
      submittedDate: '17 نوفمبر 2026',
      status: 'pending',
    ),
  ];

  Future<void> _uploadNewSummary() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.camera, imageQuality: 85);
    if (picked != null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppColors.emerald,
            content: Text('تم رفع صفحة الكشكول بنجاح! سيتم مراجعتها وختمها بواسطة المعلم.'),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('كشكول ملخصاتي المرفوعة للمعلم'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_a_photo_outlined),
            tooltip: 'رفع صفحة كشكول جديدة',
            onPressed: _uploadNewSummary,
          ),
        ],
      ),
      body: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 90),
        itemCount: _submissions.length + 1,
        itemBuilder: (context, index) {
          if (index == 0) {
            // Upload Banner Card
            return Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.cardDark : AppColors.headerMintLight,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isDark ? AppColors.borderDark : AppColors.headerMintBorder,
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: const BoxDecoration(
                        color: AppColors.headerMintPill,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.menu_book_rounded, color: Colors.white, size: 22),
                    ),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'كشكول ملخصات الدروس',
                            style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900),
                          ),
                          SizedBox(height: 3),
                          Text(
                            'قم بتصوير كشكولك بعد كل درس لتوثيق حضورك وتقييم التلخيص.',
                            style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                          ),
                        ],
                      ),
                    ),
                    ElevatedButton.icon(
                      onPressed: _uploadNewSummary,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.headerMintPill,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.camera_alt_outlined, size: 16),
                      label: const Text('رفع', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),
            );
          }

          final sub = _submissions[index - 1];
          final isApproved = sub.status == 'approved';

          return FadeSlideTransition(
            delay: Duration(milliseconds: index * 50),
            child: Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: isApproved ? AppColors.pastelMint : AppColors.pastelPeach,
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Icon(
                            isApproved ? Icons.verified_rounded : Icons.hourglass_top_rounded,
                            color: isApproved ? AppColors.pastelMintIcon : AppColors.pastelPeachIcon,
                            size: 22,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                sub.lessonTitle,
                                style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                '${sub.unitName} • تاريخ الرفع: ${sub.submittedDate}',
                                style: const TextStyle(fontSize: 10.5, color: Colors.grey),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: isApproved ? AppColors.statTealBg : const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            isApproved ? 'معتمد وموثق' : 'قيد المراجعة',
                            style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.bold,
                              color: isApproved ? AppColors.statTealText : Colors.grey.shade700,
                            ),
                          ),
                        ),
                      ],
                    ),

                    if (sub.teacherNote != null) ...[
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.cardDarkElevated : const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: isDark ? AppColors.borderDark : const Color(0xFFE2E8F0),
                          ),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.military_tech_rounded, size: 16, color: AppColors.starGold),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                'ملاحظة د. محمود المهدي: ${sub.teacherNote!}',
                                style: TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? AppColors.textDarkSecondary : AppColors.textLightSecondary,
                                ),
                              ),
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
    );
  }
}
