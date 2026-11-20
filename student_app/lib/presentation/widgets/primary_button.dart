import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import 'animated_entrance.dart';

class PrimaryButton extends StatelessWidget {
  const PrimaryButton({
    required this.title,
    required this.onPressed,
    super.key,
    this.isLoading = false,
    this.icon,
    this.backgroundColor,
    this.textColor,
    this.gradient,
    this.height = 52,
  });

  final String title;
  final VoidCallback? onPressed;
  final bool isLoading;
  final Widget? icon;
  final Color? backgroundColor;
  final Color? textColor;
  final Gradient? gradient;
  final double height;

  @override
  Widget build(BuildContext context) {
    final effectiveGradient = gradient ??
        (backgroundColor == null && onPressed != null
            ? AppColors.royalGradient
            : null);

    return BouncingWidget(
      onTap: isLoading ? null : onPressed,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        height: height,
        decoration: BoxDecoration(
          color: (onPressed == null && !isLoading)
              ? Colors.grey.shade400
              : (effectiveGradient == null
                  ? (backgroundColor ?? AppColors.primary)
                  : null),
          gradient: (onPressed != null && !isLoading) ? effectiveGradient : null,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            if (onPressed != null && !isLoading)
              BoxShadow(
                color: (backgroundColor ?? AppColors.primary).withValues(alpha: 0.3),
                blurRadius: 14,
                offset: const Offset(0, 6),
              ),
          ],
        ),
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: Center(
          child: isLoading
              ? const SizedBox(
                  height: 22,
                  width: 22,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.4,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                )
              : Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (icon != null) ...[
                      icon!,
                      const SizedBox(width: 8),
                    ],
                    Text(
                      title,
                      style: TextStyle(
                        color: textColor ?? Colors.white,
                        fontSize: 14.5,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.2,
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
