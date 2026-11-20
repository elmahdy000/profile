import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class WhatsAppSupportButton extends StatelessWidget {
  const WhatsAppSupportButton({
    this.studentCode,
    this.studentName,
    super.key,
  });

  final String? studentCode;
  final String? studentName;

  Future<void> _launchWhatsApp(BuildContext context) async {
    final codeMsg = studentCode != null ? ' (كودي: $studentCode)' : '';
    final nameMsg = studentName != null ? 'أنا الطالب $studentName$codeMsg' : 'مرحباً د. محمود';
    final message = '$nameMsg، أود الاستفسار والمساعدة بخصوص منصة وتطبيق التفوق.';
    final url = Uri.parse('https://wa.me/201018882889?text=${Uri.encodeComponent(message)}');

    try {
      final launched = await launchUrl(url, mode: LaunchMode.externalApplication);
      if (!launched && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تعذر فتح تطبيق واتساب مباشرة')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('خطأ في الاتصال: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return FloatingActionButton.extended(
      heroTag: 'whatsapp_support_fab',
      onPressed: () => _launchWhatsApp(context),
      backgroundColor: const Color(0xFF25D366),
      foregroundColor: Colors.white,
      elevation: 4,
      icon: const Icon(Icons.chat_outlined, size: 20),
      label: const Text(
        'الدعم والمساعد',
        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
      ),
    );
  }
}
