import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

class StatusBadge extends StatelessWidget {
  const StatusBadge({
    this.text,
    this.label,
    this.color,
    this.isSuccess,
    super.key,
    this.icon,
  });

  final String? text;
  final String? label;
  final Color? color;
  final bool? isSuccess;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final displayText = label ?? text ?? '';
    final effectiveColor = color ??
        (isSuccess == true
            ? AppColors.emerald
            : (isSuccess == false ? AppColors.amberDark : AppColors.primary));
    final effectiveIcon = icon ??
        (isSuccess == true
            ? Icons.check_circle_rounded
            : (isSuccess == false ? Icons.access_time_rounded : null));

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: effectiveColor.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: effectiveColor.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (effectiveIcon != null) ...[
            Icon(effectiveIcon, size: 12, color: effectiveColor),
            const SizedBox(width: 4),
          ],
          Text(
            displayText,
            style: TextStyle(
              color: effectiveColor,
              fontSize: 10.5,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}
