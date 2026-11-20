import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import '../../services/active_video_service.dart';
import '../views/courses/lesson_detail_view.dart';

class MiniVideoPlayerBar extends StatelessWidget {
  const MiniVideoPlayerBar({super.key});

  @override
  Widget build(BuildContext context) {
    final service = ActiveVideoService();
    final controller = service.controller;
    final lesson = service.currentLesson;

    if (!service.hasActiveVideo || !service.isMinimized || controller == null || lesson == null) {
      return const SizedBox.shrink();
    }

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Container(
        height: 64,
        decoration: BoxDecoration(
          color: const Color(0xFF0F172A),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.35),
              blurRadius: 10,
              offset: const Offset(0, -3),
            ),
          ],
          border: const Border(
            top: BorderSide(color: Color(0xFF00D2FF), width: 1.5),
          ),
        ),
        child: InkWell(
          onTap: () {
            service.maximize();
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => LessonDetailView(
                  lesson: lesson,
                  courseTitle: service.courseTitle,
                ),
              ),
            );
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10),
            child: Row(
              children: [
                // ── Mini Video Surface (LTR inside video) ──
                Directionality(
                  textDirection: TextDirection.ltr,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: SizedBox(
                      width: 90,
                      height: 50,
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          VideoPlayer(controller),
                          Positioned(
                            bottom: 0,
                            left: 0,
                            right: 0,
                            child: LinearProgressIndicator(
                              value: controller.value.duration.inMilliseconds > 0
                                  ? (controller.value.position.inMilliseconds /
                                          controller.value.duration.inMilliseconds)
                                      .clamp(0.0, 1.0)
                                  : 0.0,
                              minHeight: 2.5,
                              backgroundColor: Colors.white24,
                              valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF00D2FF)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                const SizedBox(width: 10),

                // ── Lesson Title & Doctor ──
                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        lesson.title,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11.5,
                          fontWeight: FontWeight.bold,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'د. محمود المهدي · ${lesson.unitName}',
                        style: const TextStyle(
                          color: Color(0xFF38BDF8),
                          fontSize: 9.5,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),

                // ── Play / Pause Button ──
                ListenableBuilder(
                  listenable: controller,
                  builder: (context, _) {
                    final isPlaying = controller.value.isPlaying;
                    return IconButton(
                      icon: Icon(
                        isPlaying ? Icons.pause_circle_filled_rounded : Icons.play_circle_fill_rounded,
                        color: const Color(0xFF00D2FF),
                        size: 32,
                      ),
                      onPressed: () {
                        if (isPlaying) {
                          controller.pause();
                        } else {
                          controller.play();
                        }
                      },
                    );
                  },
                ),

                // ── Close Floating Mini Player ──
                IconButton(
                  icon: const Icon(Icons.close_rounded, color: Colors.white70, size: 20),
                  onPressed: () {
                    service.close();
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
