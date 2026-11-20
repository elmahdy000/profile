import 'package:flutter/material.dart';

class AppToast {
  static void showSuccess(BuildContext context, String message, {IconData icon = Icons.check_circle_rounded}) {
    _show(
      context,
      message: message,
      icon: icon,
      iconColor: const Color(0xFF10B981),
      borderColor: const Color(0xFF10B981).withValues(alpha: 0.35),
    );
  }

  static void showInfo(BuildContext context, String message, {IconData icon = Icons.info_outline_rounded}) {
    _show(
      context,
      message: message,
      icon: icon,
      iconColor: const Color(0xFF38BDF8),
      borderColor: const Color(0xFF38BDF8).withValues(alpha: 0.35),
    );
  }

  static void showError(BuildContext context, String message, {IconData icon = Icons.error_outline_rounded}) {
    _show(
      context,
      message: message,
      icon: icon,
      iconColor: const Color(0xFFF87171),
      borderColor: const Color(0xFFF87171).withValues(alpha: 0.35),
    );
  }

  static void _show(
    BuildContext context, {
    required String message,
    required IconData icon,
    required Color iconColor,
    required Color borderColor,
  }) {
    final messenger = ScaffoldMessenger.of(context);
    messenger.hideCurrentSnackBar();

    messenger.showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        elevation: 6,
        margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        backgroundColor: const Color(0xFF1E293B),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: BorderSide(color: borderColor, width: 1.2),
        ),
        duration: const Duration(milliseconds: 2200),
        content: Directionality(
          textDirection: TextDirection.rtl,
          child: Row(
            children: [
              Icon(icon, color: iconColor, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  message,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
