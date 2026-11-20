import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:student_app/core/constants/app_colors.dart';
import '../../viewmodels/auth_viewmodel.dart';
import '../auth/login_view.dart';
import '../card/student_card_view.dart';
import '../files/files_view.dart';
import '../essay/essay_exams_view.dart';

class ProfileView extends StatelessWidget {
  const ProfileView({super.key});

  Future<void> _contactSupport(BuildContext context) async {
    final url = Uri.parse(
      'https://wa.me/201018882889?text=${Uri.encodeComponent("مرحباً د. محمود، أحتاج مساعدة أو استفسار بخصوص حسابي في منصة الطلاب")}',
    );
    try {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تعذر فتح تطبيق واتساب، رقم الدعم: 01018882889')),
        );
      }
    }
  }

  void _showLogoutDialog(BuildContext context, AuthViewModel authVm) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('تسجيل الخروج', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        content: const Text('هل أنت متأكد من رغبتك في تسجيل الخروج من حسابك؟', style: TextStyle(fontSize: 13)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('إلغاء', style: TextStyle(color: AppColors.muted)),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              await authVm.logout();
              if (context.mounted) {
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const LoginView()),
                  (route) => false,
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.red,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('تسجيل خروج'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authVm = context.watch<AuthViewModel>();
    final student = authVm.currentStudent;

    final studentName = student?.name.isNotEmpty == true ? student!.name : 'Yahia elsayed hassan';
    final initialLetter = studentName.isNotEmpty ? studentName[0].toUpperCase() : 'Y';
    final studentCode = student?.studentCode.isNotEmpty == true ? student!.studentCode : 'LD824C';
    final centerName = student?.center?.isNotEmpty == true ? student!.center! : 'سنتر زاج (Zag) — عربي';

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
                        'حسابي',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'ملف الطالب الأكاديمي',
                        style: TextStyle(
                          fontSize: 10.5,
                          color: Colors.white70,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  Container(
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
                      Icons.person_rounded,
                      color: Colors.white,
                      size: 18,
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
                  // 1. Account Panel Card
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 21),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(AppColors.radiusCard),
                      border: Border.all(color: AppColors.line),
                      boxShadow: AppColors.cardShadow,
                    ),
                    child: Column(
                      children: [
                        // Big Avatar
                        Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: const Color(0xFFDFEDFF),
                            border: Border.all(color: const Color(0xFFB4D7FF), width: 3),
                          ),
                          child: Center(
                            child: Text(
                              initialLetter,
                              style: const TextStyle(
                                fontSize: 29,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF1B75DC),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 9),
                        Text(
                          studentName,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: AppColors.ink,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'منصة د. محمود المهدي الأكاديمية',
                          style: TextStyle(fontSize: 10.5, color: Color(0xFF8295AF)),
                        ),
                        const SizedBox(height: 9),
                        // Verified Pill
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.greenLight,
                            borderRadius: BorderRadius.circular(15),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: const [
                              Icon(Icons.shield_outlined, size: 14, color: Color(0xFF078456)),
                              SizedBox(width: 4),
                              Text(
                                'طالب معتمد',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF078456),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 14),
                        // Stats Tags Row
                        Wrap(
                          spacing: 12,
                          runSpacing: 6,
                          alignment: WrapAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                color: AppColors.soft,
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: const Text(
                                'معدل التفاعل 4.8',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.blueDark,
                                ),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                color: AppColors.soft,
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: Text(
                                centerName,
                                style: const TextStyle(
                                  fontSize: 10,
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

                  const SizedBox(height: 14),

                  // 2. Account Items
                  Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(13),
                    ),
                    child: Column(
                      children: [
                        // Copy Student Code
                        _buildAccountItem(
                          icon: Icons.copy_rounded,
                          title: 'كود الطالب',
                          trailingText: studentCode,
                          onTap: () {
                            Clipboard.setData(ClipboardData(text: studentCode));
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                backgroundColor: AppColors.green,
                                content: Text('تم نسخ كود الطالب بنجاح'),
                                duration: Duration(seconds: 2),
                              ),
                            );
                          },
                        ),
                        const SizedBox(height: 8),

                        // Account Status
                        _buildAccountItem(
                          icon: Icons.shield_outlined,
                          title: 'حالة الحساب',
                          trailingText: 'معتمد',
                        ),
                        const SizedBox(height: 8),

                        // Library Link
                        _buildAccountItem(
                          icon: Icons.folder_open_outlined,
                          title: 'مكتبة الملازم',
                          isAction: true,
                          onTap: () => Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => const FilesView()),
                          ),
                        ),
                        const SizedBox(height: 8),

                        // Essay Exams Link
                        _buildAccountItem(
                          icon: Icons.assignment_outlined,
                          title: 'الامتحانات المقالية',
                          isAction: true,
                          onTap: () => Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => const EssayExamsView()),
                          ),
                        ),
                        const SizedBox(height: 8),

                        // Digital Student Card (QR)
                        _buildAccountItem(
                          icon: Icons.qr_code_2_rounded,
                          title: 'كارنيه الطالب الرقمي (QR)',
                          isAction: true,
                          onTap: () => Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => const StudentCardView()),
                          ),
                        ),
                        const SizedBox(height: 8),

                        // Support Link
                        _buildAccountItem(
                          icon: Icons.chat_outlined,
                          title: 'الدعم والمساعدة',
                          isAction: true,
                          onTap: () => _contactSupport(context),
                        ),
                        const SizedBox(height: 8),

                        // Logout Button
                        _buildAccountItem(
                          icon: Icons.logout_rounded,
                          title: 'تسجيل الخروج',
                          iconColor: AppColors.red,
                          titleColor: AppColors.red,
                          isAction: true,
                          onTap: () => _showLogoutDialog(context, authVm),
                        ),
                      ],
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

  Widget _buildAccountItem({
    required IconData icon,
    required String title,
    String? trailingText,
    bool isAction = false,
    Color? iconColor,
    Color? titleColor,
    VoidCallback? onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(13),
      child: Container(
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(13),
          border: Border.all(color: AppColors.line),
          boxShadow: AppColors.cardShadow,
        ),
        child: Row(
          children: [
            Icon(icon, color: iconColor ?? AppColors.blue, size: 20),
            const SizedBox(width: 9),
            Text(
              title,
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
                color: titleColor ?? AppColors.ink,
              ),
            ),
            const Spacer(),
            if (trailingText != null)
              Text(
                trailingText,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: AppColors.muted,
                ),
              ),
            if (isAction)
              const Icon(Icons.chevron_left_rounded, size: 16, color: AppColors.muted),
          ],
        ),
      ),
    );
  }
}
