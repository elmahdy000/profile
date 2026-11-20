import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:student_app/core/constants/app_colors.dart';
import 'package:student_app/presentation/viewmodels/auth_viewmodel.dart';
import 'package:student_app/presentation/widgets/animated_entrance.dart';
import 'package:student_app/presentation/widgets/app_card.dart';

/// Official Student Digital ID & QR Code Scanner Pass for Centers
class StudentCardView extends StatefulWidget {
  const StudentCardView({super.key});

  @override
  State<StudentCardView> createState() => _StudentCardViewState();
}

class _StudentCardViewState extends State<StudentCardView> {
  void _showFullscreenQr(String qrValue, String studentName) {
    showDialog(
      context: context,
      builder: (ctx) {
        return Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(28),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.25),
                  blurRadius: 30,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'رمز الدخول للسنتر (QR)',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: Color(0xFF64748B)),
                      onPressed: () => Navigator.of(ctx).pop(),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: QrImageView(
                    data: qrValue,
                    version: QrVersions.auto,
                    size: 240.0,
                    backgroundColor: Colors.white,
                    errorCorrectionLevel: QrErrorCorrectLevel.H,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  studentName,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  qrValue,
                  style: const TextStyle(
                    fontSize: 12,
                    fontFamily: 'monospace',
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF64748B),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'يرجى توجيه الشاشة نحو ماسح الباركود عند بوابة السنتر',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 11.5, color: Color(0xFF94A3B8)),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final authVm = context.watch<AuthViewModel>();
    final student = authVm.currentStudent;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final studentId = student?.id ?? 0;
    final phone = student?.phone ?? '';
    final studentCode = student?.studentCode ?? '';
    final studentName = student?.name ?? 'طالب منصة التفوق';
    final qrValue = 'STD-$studentId-$phone';

    return Scaffold(
      appBar: AppBar(
        title: const Text('كارنيه الطالب الرقمي'),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner_rounded),
            tooltip: 'تكبير الباركود',
            onPressed: () => _showFullscreenQr(qrValue, studentName),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 90),
        child: Column(
          children: [
            // ── 1. Digital ID Card Surface ──
            FadeSlideTransition(
              offset: const Offset(0, -0.15),
              child: Container(
                decoration: BoxDecoration(
                  gradient: isDark
                      ? const LinearGradient(
                          colors: [Color(0xFF131B2B), Color(0xFF0D131F)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        )
                      : const LinearGradient(
                          colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: isDark
                          ? Colors.black.withValues(alpha: 0.5)
                          : const Color(0xFF2563EB).withValues(alpha: 0.3),
                      blurRadius: 24,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    // Top Card Header
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.school_rounded, color: Colors.white, size: 22),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'منصة د. محمود المهدي',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w900,
                                    color: Colors.white,
                                  ),
                                ),
                                Text(
                                  'الحاسب الآلي والذكاء الاصطناعي • بطاقة الطالب المعتمدة',
                                  style: TextStyle(
                                    fontSize: 10.5,
                                    color: Colors.white.withValues(alpha: 0.8),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.emerald,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.verified_rounded, size: 13, color: Colors.white),
                                SizedBox(width: 4),
                                Text(
                                  'مفعل',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    const Divider(color: Colors.white24, height: 1),

                    // Card Body (Student Info + QR Code)
                    Padding(
                      padding: const EdgeInsets.all(20),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Left Side: QR Code
                          GestureDetector(
                            onTap: () => _showFullscreenQr(qrValue, studentName),
                            child: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.15),
                                    blurRadius: 10,
                                  ),
                                ],
                              ),
                              child: Column(
                                children: [
                                  QrImageView(
                                    data: qrValue,
                                    version: QrVersions.auto,
                                    size: 110,
                                    backgroundColor: Colors.white,
                                  ),
                                  const SizedBox(height: 4),
                                  const Text(
                                    'اضغط للتكبير',
                                    style: TextStyle(
                                      fontSize: 9.5,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF64748B),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),

                          // Right Side: Student Details
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  studentName,
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w900,
                                    color: Colors.white,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                _buildCardDetailRow(
                                  icon: Icons.vpn_key_outlined,
                                  label: 'كود الطالب:',
                                  value: studentCode,
                                  isCode: true,
                                ),
                                const SizedBox(height: 4),
                                _buildCardDetailRow(
                                  icon: Icons.layers_outlined,
                                  label: 'المرحلة:',
                                  value: student?.stage ?? 'المرحلة الثانوية',
                                ),
                                const SizedBox(height: 4),
                                _buildCardDetailRow(
                                  icon: Icons.location_on_outlined,
                                  label: 'السنتر:',
                                  value: student?.center ?? 'المنصة أونلاين',
                                ),
                                const SizedBox(height: 4),
                                _buildCardDetailRow(
                                  icon: Icons.group_outlined,
                                  label: 'المجموعة:',
                                  value: student?.groupName ?? student?.appointmentSlot ?? 'الدفعة العامة',
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Bottom Card Footer
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.15),
                        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(24)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.phone_outlined, size: 14, color: Colors.white70),
                              const SizedBox(width: 6),
                              Text(
                                phone,
                                style: const TextStyle(
                                  fontSize: 11.5,
                                  color: Colors.white70,
                                  fontFamily: 'monospace',
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                          Text(
                            'العام الدراسي 2026/2027',
                            style: TextStyle(
                              fontSize: 10.5,
                              color: Colors.white.withValues(alpha: 0.7),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 20),

            // ── 2. Quick Action Buttons ──
            FadeSlideTransition(
              delay: const Duration(milliseconds: 100),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: studentCode));
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            backgroundColor: AppColors.emerald,
                            content: Text('تم نسخ كود الطالب بنجاح'),
                            duration: Duration(seconds: 2),
                          ),
                        );
                      },
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 13),
                        side: BorderSide(
                          color: isDark ? AppColors.borderDark : const Color(0xFFE2E8F0),
                        ),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      icon: const Icon(Icons.copy_rounded, size: 16),
                      label: const Text('نسخ كود الطالب', style: TextStyle(fontSize: 12)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _showFullscreenQr(qrValue, studentName),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.stitchCoral,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 13),
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      icon: const Icon(Icons.fullscreen_rounded, size: 18),
                      label: const Text(
                        'إبراز الباركود للسنتر',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // ── 3. Center Access Guidelines ──
            FadeSlideTransition(
              delay: const Duration(milliseconds: 160),
              child: AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.info_outline_rounded, size: 18, color: AppColors.primary),
                        SizedBox(width: 8),
                        Text(
                          'إرشادات استخدام الكارنيه والدخول بالسنتر',
                          style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _buildGuidelineItem(
                      number: '1',
                      text: 'يتم مسح رمز الـ QR من خلال سكرتارية السنتر لتسجيل حضور الحصة تلقائياً.',
                    ),
                    const SizedBox(height: 8),
                    _buildGuidelineItem(
                      number: '2',
                      text: 'يحتوي الكود على بيانات اشتراكك بالسنتر ومجموعتك الدراسية المعتمدة.',
                    ),
                    const SizedBox(height: 8),
                    _buildGuidelineItem(
                      number: '3',
                      text: 'يمكنك إبراز الكارنيه عبر الهاتف في أي وقت دون الحاجة لطباعته ورقياً.',
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCardDetailRow({
    required IconData icon,
    required String label,
    required String value,
    bool isCode = false,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Icon(icon, size: 13, color: Colors.white70),
        const SizedBox(width: 5),
        Text(
          label,
          style: TextStyle(fontSize: 10.5, color: Colors.white.withValues(alpha: 0.7)),
        ),
        const SizedBox(width: 4),
        Expanded(
          child: Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: isCode ? AppColors.starGold : Colors.white,
              fontFamily: isCode ? 'monospace' : null,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildGuidelineItem({required String number, required String text}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 20,
          height: 20,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(
              number,
              style: const TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
              ),
            ),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(fontSize: 12, height: 1.4, color: Color(0xFF64748B)),
          ),
        ),
      ],
    );
  }
}
