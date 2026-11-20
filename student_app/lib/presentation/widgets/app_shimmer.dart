import 'package:flutter/material.dart';

/// High-performance shimmer loading effect for lightning-fast perception
class AppShimmer extends StatefulWidget {
  const AppShimmer({
    super.key,
    required this.child,
    this.baseColor = const Color(0xFFE2E8F0),
    this.highlightColor = const Color(0xFFF8FAFC),
    this.duration = const Duration(milliseconds: 1400),
  });

  final Widget child;
  final Color baseColor;
  final Color highlightColor;
  final Duration duration;

  @override
  State<AppShimmer> createState() => _AppShimmerState();
}

class _AppShimmerState extends State<AppShimmer> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: widget.duration)..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return ShaderMask(
          blendMode: BlendMode.srcATop,
          shaderCallback: (bounds) {
            final percent = _controller.value;
            final double start = percent * 2.0 - 1.0;
            return LinearGradient(
              begin: Alignment(start - 0.5, 0),
              end: Alignment(start + 0.5, 0),
              colors: [
                widget.baseColor,
                widget.highlightColor,
                widget.baseColor,
              ],
              stops: const [0.0, 0.5, 1.0],
            ).createShader(bounds);
          },
          child: widget.child,
        );
      },
    );
  }
}

/// Shimmer Skeleton Box
class ShimmerBox extends StatelessWidget {
  const ShimmerBox({
    super.key,
    this.width,
    this.height = 16,
    this.borderRadius = 8,
  });

  final double? width;
  final double height;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: const Color(0xFFE2E8F0),
        borderRadius: BorderRadius.circular(borderRadius),
      ),
    );
  }
}

/// Skeleton for Lesson Row in Course or Home View
class LessonRowSkeleton extends StatelessWidget {
  const LessonRowSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return AppShimmer(
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(9),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFFE5ECF6)),
        ),
        child: Row(
          children: [
            const ShimmerBox(width: 80, height: 54, borderRadius: 8),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  ShimmerBox(width: double.infinity, height: 13, borderRadius: 4),
                  SizedBox(height: 6),
                  ShimmerBox(width: 120, height: 10, borderRadius: 4),
                ],
              ),
            ),
            const SizedBox(width: 10),
            const ShimmerBox(width: 50, height: 26, borderRadius: 6),
          ],
        ),
      ),
    );
  }
}

/// Skeleton for Unit Card
class UnitCardSkeleton extends StatelessWidget {
  const UnitCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return AppShimmer(
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2EAF5)),
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              color: const Color(0xFFF1F6FD),
              child: Row(
                children: const [
                  ShimmerBox(width: 24, height: 24, borderRadius: 6),
                  SizedBox(width: 8),
                  ShimmerBox(width: 160, height: 14, borderRadius: 4),
                  Spacer(),
                  ShimmerBox(width: 48, height: 18, borderRadius: 6),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(8),
              child: Column(
                children: const [
                  LessonRowSkeleton(),
                  LessonRowSkeleton(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
