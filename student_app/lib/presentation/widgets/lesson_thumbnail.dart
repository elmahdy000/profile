import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

class LessonThumbnail extends StatelessWidget {
  const LessonThumbnail({
    super.key,
    this.thumbnailUrl,
    this.durationMinutes,
    this.width = 96,
    this.height = 64,
    this.borderRadius = 10,
    this.showPlayBadge = true,
  });

  final String? thumbnailUrl;
  final int? durationMinutes;
  final double width;
  final double height;
  final double borderRadius;
  final bool showPlayBadge;

  @override
  Widget build(BuildContext context) {
    final validUrl = thumbnailUrl != null && thumbnailUrl!.trim().isNotEmpty;

    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: Container(
        width: width,
        height: height,
        color: const Color(0xFFE6EFFB),
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Background image or gradient
            if (validUrl)
              Image.network(
                thumbnailUrl!,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => _buildPlaceholder(),
                loadingBuilder: (context, child, loadingProgress) {
                  if (loadingProgress == null) return child;
                  return _buildLoadingPlaceholder();
                },
              )
            else
              _buildPlaceholder(),

            // Subtle dark overlay for contrast
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withValues(alpha: 0.05),
                    Colors.black.withValues(alpha: 0.45),
                  ],
                ),
              ),
            ),

            // Center play badge
            if (showPlayBadge)
              Center(
                child: Container(
                  width: width > 80 ? 28 : 22,
                  height: width > 80 ? 28 : 22,
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.65),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white.withValues(alpha: 0.8), width: 1.2),
                  ),
                  child: Center(
                    child: Icon(
                      Icons.play_arrow_rounded,
                      color: Colors.white,
                      size: width > 80 ? 17 : 13,
                    ),
                  ),
                ),
              ),

            // Duration Pill
            if (durationMinutes != null && durationMinutes! > 0)
              Positioned(
                bottom: 4,
                left: 4,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.75),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    '${durationMinutes!} د',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 8.5,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.2,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF2563EB),
            Color(0xFF1D4ED8),
          ],
        ),
      ),
      child: Center(
        child: Icon(
          Icons.play_circle_fill_rounded,
          color: Colors.white.withValues(alpha: 0.85),
          size: width > 80 ? 32 : 22,
        ),
      ),
    );
  }

  Widget _buildLoadingPlaceholder() {
    return Container(
      color: const Color(0xFFE2E8F0),
      child: const Center(
        child: SizedBox(
          width: 16,
          height: 16,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            valueColor: AlwaysStoppedAnimation<Color>(AppColors.blue),
          ),
        ),
      ),
    );
  }
}
