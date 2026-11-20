import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import 'animated_entrance.dart';

class AppCard extends StatelessWidget {
  const AppCard({
    required this.child,
    super.key,
    this.padding = const EdgeInsets.all(18),
    this.onTap,
    this.borderColor,
    this.backgroundColor,
    this.gradient,
    this.borderRadius = 20,
    this.elevation = 4,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final Color? borderColor;
  final Color? backgroundColor;
  final Gradient? gradient;
  final double borderRadius;
  final double elevation;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = backgroundColor ?? (isDark ? AppColors.cardDark : AppColors.cardLight);
    final border = borderColor ?? (isDark ? AppColors.borderDark : const Color(0xFFE2E8F0));

    final cardContent = AnimatedContainer(
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeOut,
      padding: padding,
      decoration: BoxDecoration(
        color: gradient == null ? bg : null,
        gradient: gradient,
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(color: border, width: 1.2),
        boxShadow: [
          if (elevation > 0)
            BoxShadow(
              color: isDark
                  ? Colors.black.withValues(alpha: 0.28)
                  : const Color(0xFF0F172A).withValues(alpha: 0.04),
              blurRadius: elevation * 3.5,
              offset: Offset(0, elevation),
            ),
        ],
      ),
      child: child,
    );

    if (onTap == null) return cardContent;

    return BouncingWidget(
      onTap: onTap,
      scaleFactor: 0.98,
      child: cardContent,
    );
  }
}
