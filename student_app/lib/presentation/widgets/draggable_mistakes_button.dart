import 'package:flutter/material.dart';
import '../../core/services/sound_service.dart';
import '../../data/repositories/mistakes_repository.dart';
import '../views/mistakes/my_mistakes_view.dart';

/// A sleek, compact, and draggable floating button for student revision & mistakes.
/// Stays compact (46x46), semi-transparent when idle, and can be dragged anywhere on the screen
/// so it never obstructs lesson content or questions.
class DraggableMistakesButton extends StatefulWidget {
  const DraggableMistakesButton({super.key});

  /// Persistent position across tabs / rebuilds within the session
  static Offset? _sharedPosition;

  @override
  State<DraggableMistakesButton> createState() => _DraggableMistakesButtonState();
}

class _DraggableMistakesButtonState extends State<DraggableMistakesButton> {
  bool _isDragging = false;
  Offset _dragStart = Offset.zero;
  Offset? _currentPosition;

  @override
  void initState() {
    super.initState();
    _currentPosition = DraggableMistakesButton._sharedPosition;
    MistakesRepository.ensureInitialized();
  }

  Offset _resolvePosition(
    BoxConstraints constraints,
    double minX,
    double maxX,
    double minY,
    double maxY,
    double btnSize,
  ) {
    if (_currentPosition != null) {
      return Offset(
        _currentPosition!.dx.clamp(minX, maxX),
        _currentPosition!.dy.clamp(minY, maxY),
      );
    }

    if (DraggableMistakesButton._sharedPosition != null) {
      final p = DraggableMistakesButton._sharedPosition!;
      return Offset(
        p.dx.clamp(minX, maxX),
        p.dy.clamp(minY, maxY),
      );
    }

    // Default smart starting position: docked nicely on bottom-left, 20px above the bottom bar
    final defaultX = 16.0;
    final defaultY = (constraints.maxHeight - btnSize - 20.0).clamp(minY, maxY);
    return Offset(defaultX, defaultY);
  }

  void _openMistakes() {
    SoundService().playTap();
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const MyMistakesView()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: LayoutBuilder(
        builder: (context, constraints) {
          const btnSize = 46.0;
          final minX = 12.0;
          final maxX = (constraints.maxWidth - btnSize - 12.0).clamp(minX, double.infinity);
          final minY = 12.0;
          // Dock comfortably and safely above the bottom navigation bar
          final maxY = (constraints.maxHeight - btnSize - 16.0).clamp(minY, double.infinity);

          final pos = _resolvePosition(constraints, minX, maxX, minY, maxY, btnSize);

          return Stack(
            clipBehavior: Clip.none,
            children: [
              Positioned(
                left: pos.dx,
                top: pos.dy,
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onPanStart: (details) {
                    _isDragging = false;
                    _dragStart = details.globalPosition;
                  },
                  onPanUpdate: (details) {
                    final cur = _currentPosition ?? pos;
                    final newX = (cur.dx + details.delta.dx).clamp(minX, maxX);
                    final newY = (cur.dy + details.delta.dy).clamp(minY, maxY);

                    final movedDistance = (details.globalPosition - _dragStart).distance;
                    setState(() {
                      _currentPosition = Offset(newX, newY);
                      DraggableMistakesButton._sharedPosition = _currentPosition;
                      if (movedDistance > 5) {
                        _isDragging = true;
                      }
                    });
                  },
                  onPanEnd: (details) {
                    if (!_isDragging) {
                      _openMistakes();
                    }
                    setState(() => _isDragging = false);
                  },
                  onTap: _openMistakes,
                  child: AnimatedOpacity(
                    opacity: _isDragging ? 1.0 : 0.92,
                    duration: const Duration(milliseconds: 180),
                    child: AnimatedScale(
                      scale: _isDragging ? 1.10 : 1.0,
                      duration: const Duration(milliseconds: 150),
                      child: Stack(
                        clipBehavior: Clip.none,
                        children: [
                          // Compact Circular Floating Button (46x46)
                          Container(
                            width: btnSize,
                            height: btnSize,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: const LinearGradient(
                                colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              border: Border.all(
                                color: const Color(0xFF38BDF8).withValues(alpha: 0.75),
                                width: 1.5,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF38BDF8).withValues(alpha: 0.28),
                                  blurRadius: 10,
                                  spreadRadius: 1,
                                  offset: const Offset(0, 3),
                                ),
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.35),
                                  blurRadius: 6,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: const Center(
                              child: Icon(
                                Icons.psychology_rounded,
                                color: Color(0xFF38BDF8),
                                size: 23,
                              ),
                            ),
                          ),

                          // Live Mistakes Count Badge with instant reactive sync
                          ValueListenableBuilder<int>(
                            valueListenable: MistakesRepository.mistakesCountNotifier,
                            builder: (context, count, _) {
                              if (count <= 0) return const SizedBox.shrink();
                              return Positioned(
                                top: -3,
                                right: -3,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                                  constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFEF4444),
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(color: Colors.white, width: 1.3),
                                    boxShadow: [
                                      BoxShadow(
                                        color: const Color(0xFFEF4444).withValues(alpha: 0.5),
                                        blurRadius: 4,
                                        offset: const Offset(0, 1),
                                      ),
                                    ],
                                  ),
                                  alignment: Alignment.center,
                                  child: Text(
                                    count > 99 ? '99+' : '$count',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 9,
                                      fontWeight: FontWeight.w900,
                                      height: 1.05,
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
