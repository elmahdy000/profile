import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_card_swiper/flutter_card_swiper.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:student_app/core/constants/app_colors.dart';
import 'package:student_app/core/utils/app_toast.dart';
import 'package:student_app/domain/entities/kholasa.dart';

/// ══════════════════════════════════════════════════════════════
/// Swipeable Flashcard Deck (حركة الكروت والتسميع الفيزيائي التفاعلي)
/// ══════════════════════════════════════════════════════════════
class SwipeableFlashcardDeck extends StatefulWidget {
  const SwipeableFlashcardDeck({
    super.key,
    required this.cards,
    required this.masteredCardIds,
    required this.onMastered,
    required this.onUnmastered,
    this.title = 'تسميع سريع واختبر حفظك',
  });

  final List<KholasaFlashcard> cards;
  final Set<String> masteredCardIds;
  final ValueChanged<String> onMastered;
  final ValueChanged<String> onUnmastered;
  final String title;

  @override
  State<SwipeableFlashcardDeck> createState() => _SwipeableFlashcardDeckState();
}

class _SwipeableFlashcardDeckState extends State<SwipeableFlashcardDeck> {
  CardSwiperController _controller = CardSwiperController();
  final Set<int> _flippedIndices = {};
  int _activeCardIndex = 0;
  bool _isCompleted = false;
  int _swiperKeyCounter = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _resetDeck() {
    HapticFeedback.mediumImpact();
    _controller.dispose();
    _controller = CardSwiperController();
    setState(() {
      _flippedIndices.clear();
      _activeCardIndex = 0;
      _isCompleted = false;
      _swiperKeyCounter++;
    });
  }

  void _toggleFlip(int index) {
    HapticFeedback.selectionClick();
    setState(() {
      if (_flippedIndices.contains(index)) {
        _flippedIndices.remove(index);
      } else {
        _flippedIndices.add(index);
      }
    });
  }

  bool _onSwipe(int previousIndex, int? currentIndex, CardSwiperDirection direction) {
    HapticFeedback.lightImpact();
    if (currentIndex != null) {
      setState(() => _activeCardIndex = currentIndex);
    }
    if (previousIndex < widget.cards.length) {
      final card = widget.cards[previousIndex];
      if (direction == CardSwiperDirection.right) {
        widget.onMastered(card.id);
        AppToast.showSuccess(context, 'عاش يا وحش! تمام كدة 🎯');
      } else {
        widget.onUnmastered(card.id);
      }
    }
    return true;
  }

  bool _onUndo(int? previousIndex, int currentIndex, CardSwiperDirection direction) {
    HapticFeedback.lightImpact();
    setState(() {
      _activeCardIndex = currentIndex;
      _isCompleted = false;
    });
    return true;
  }

  void _onEnd() {
    HapticFeedback.heavyImpact();
    setState(() {
      _isCompleted = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (widget.cards.isEmpty) {
      return Container(
        padding: const EdgeInsets.symmetric(vertical: 40),
        alignment: Alignment.center,
        child: Text(
          'مفيش كروت تسميع مسجلة للدرس ده حالياً.',
          style: GoogleFonts.cairo(fontSize: 13, color: const Color(0xFF64748B)),
        ),
      );
    }

    final total = widget.cards.length;
    final masteredCount = widget.cards.where((c) => widget.masteredCardIds.contains(c.id)).length;
    final progressPct = total > 0 ? (masteredCount / total) : 0.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // ── Deck Stats & Progress Bar ──
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Flexible(
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.style_rounded, size: 16, color: AppColors.blue),
                        ),
                        const SizedBox(width: 8),
                        Flexible(
                          child: Text(
                            _isCompleted ? 'خلصت كل الكروت 🎉' : 'كارت ${_activeCardIndex + 1} من $total',
                            style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A)),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFECFDF5),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFA7F3D0)),
                    ),
                    child: Text(
                      'عرفت $masteredCount (${(progressPct * 100).toInt()}%)',
                      style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.bold, color: const Color(0xFF065F46)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: LinearProgressIndicator(
                  value: progressPct,
                  minHeight: 6,
                  backgroundColor: const Color(0xFFF1F5F9),
                  valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF10B981)),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 10),

        // ── Swipe Guidance Hint ──
        if (!_isCompleted)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Flexible(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.swipe_left_rounded, size: 14, color: Color(0xFFF59E0B)),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text(
                          'شمال: هراجعها 🔄',
                          style: GoogleFonts.cairo(fontSize: 10, color: const Color(0xFFB45309), fontWeight: FontWeight.w700),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: Text('💡 دوس لقلب الكارت', style: GoogleFonts.cairo(fontSize: 10, color: const Color(0xFF64748B), fontWeight: FontWeight.w600)),
                ),
                Flexible(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Flexible(
                        child: Text(
                          'يمين: فاهمها تمام 👍',
                          style: GoogleFonts.cairo(fontSize: 10, color: const Color(0xFF059669), fontWeight: FontWeight.w700),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Icon(Icons.swipe_right_rounded, size: 14, color: Color(0xFF10B981)),
                    ],
                  ),
                ),
              ],
            ),
          ),

        const SizedBox(height: 10),

        // ── Interactive Swiper Container / Completion View ──
        if (_isCompleted)
          _buildCompletionView(total, masteredCount)
        else
          SizedBox(
            height: 310,
            child: CardSwiper(
              key: ValueKey('deck_swiper_$_swiperKeyCounter'),
              controller: _controller,
              cardsCount: widget.cards.length,
              isLoop: false,
              allowedSwipeDirection: const AllowedSwipeDirection.symmetric(horizontal: true),
              onSwipe: _onSwipe,
              onUndo: _onUndo,
              onEnd: _onEnd,
              numberOfCardsDisplayed: math.min(3, widget.cards.length),
              backCardOffset: const Offset(0, -14),
              scale: 0.94,
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
              cardBuilder: (context, index, percentX, percentY) {
                final card = widget.cards[index];
                final isFlipped = _flippedIndices.contains(index);
                final isMastered = widget.masteredCardIds.contains(card.id);

                return GestureDetector(
                  onTap: () => _toggleFlip(index),
                  child: Stack(
                    children: [
                      // The 3D Flip Card
                      TweenAnimationBuilder(
                        tween: Tween<double>(begin: 0, end: isFlipped ? math.pi : 0),
                        duration: const Duration(milliseconds: 300),
                        curve: Curves.easeInOutCubic,
                        builder: (context, double val, child) {
                          final isUnder = val >= math.pi / 2;

                          return Transform(
                            alignment: Alignment.center,
                            transform: Matrix4.identity()
                              ..setEntry(3, 2, 0.0012)
                              ..rotateY(val),
                            child: Container(
                              width: double.infinity,
                              height: double.infinity,
                              padding: const EdgeInsets.all(22),
                              decoration: BoxDecoration(
                                gradient: isUnder
                                    ? const LinearGradient(
                                        colors: [Color(0xFF064E3B), Color(0xFF047857), Color(0xFF065F46)],
                                        begin: Alignment.topLeft,
                                        end: Alignment.bottomRight,
                                      )
                                    : const LinearGradient(
                                        colors: [Color(0xFF0F172A), Color(0xFF1E293B), Color(0xFF334155)],
                                        begin: Alignment.topLeft,
                                        end: Alignment.bottomRight,
                                      ),
                                borderRadius: BorderRadius.circular(24),
                                boxShadow: [
                                  BoxShadow(
                                    color: (isUnder ? const Color(0xFF047857) : const Color(0xFF0F172A)).withValues(alpha: 0.28),
                                    blurRadius: 18,
                                    offset: const Offset(0, 8),
                                  ),
                                ],
                                border: Border.all(
                                  color: isUnder
                                      ? const Color(0xFF34D399).withValues(alpha: 0.45)
                                      : const Color(0xFF38BDF8).withValues(alpha: 0.35),
                                  width: 1.5,
                                ),
                              ),
                              child: isUnder
                                  // ── Back Face: الإجابة والشرح ──
                                  ? Transform(
                                      alignment: Alignment.center,
                                      transform: Matrix4.identity()..rotateY(math.pi),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.stretch,
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Row(
                                            children: [
                                              const Icon(Icons.check_circle_rounded, color: Color(0xFF34D399), size: 20),
                                              const SizedBox(width: 6),
                                              Text(
                                                'الإجابة والشرح:',
                                                style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.w900, color: const Color(0xFF6EE7B7)),
                                              ),
                                            ],
                                          ),
                                          Expanded(
                                            child: Center(
                                              child: SingleChildScrollView(
                                                physics: const BouncingScrollPhysics(),
                                                child: Text(
                                                  card.back,
                                                  textAlign: TextAlign.center,
                                                  style: GoogleFonts.cairo(
                                                    fontSize: 14,
                                                    fontWeight: FontWeight.bold,
                                                    color: Colors.white,
                                                    height: 1.5,
                                                  ),
                                                ),
                                              ),
                                            ),
                                          ),
                                          Center(
                                            child: Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                                              decoration: BoxDecoration(
                                                color: Colors.white.withValues(alpha: 0.15),
                                                borderRadius: BorderRadius.circular(20),
                                              ),
                                              child: Text(
                                                'اسحب يمين لو فاهمها تمام 👍',
                                                style: GoogleFonts.cairo(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold),
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    )
                                  // ── Front Face: سؤال التسميع ──
                                  : Column(
                                      crossAxisAlignment: CrossAxisAlignment.stretch,
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                              decoration: BoxDecoration(
                                                color: Colors.white.withValues(alpha: 0.15),
                                                borderRadius: BorderRadius.circular(8),
                                              ),
                                              child: Text(
                                                card.tag,
                                                style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                                              ),
                                            ),
                                            Row(
                                              children: [
                                                if (isMastered) ...[
                                                  const Icon(Icons.check_circle_rounded, color: Color(0xFF34D399), size: 16),
                                                  const SizedBox(width: 4),
                                                ],
                                                Text(
                                                  'كارت ${index + 1} من $total',
                                                  style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white70),
                                                ),
                                              ],
                                            ),
                                          ],
                                        ),
                                        Expanded(
                                          child: Center(
                                            child: SingleChildScrollView(
                                              physics: const BouncingScrollPhysics(),
                                              child: Text(
                                                card.front,
                                                textAlign: TextAlign.center,
                                                style: GoogleFonts.cairo(
                                                  fontSize: 16,
                                                  fontWeight: FontWeight.w900,
                                                  color: Colors.white,
                                                  height: 1.45,
                                                ),
                                              ),
                                            ),
                                          ),
                                        ),
                                        Center(
                                          child: Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                            decoration: BoxDecoration(
                                              color: Colors.white.withValues(alpha: 0.1),
                                              borderRadius: BorderRadius.circular(20),
                                            ),
                                            child: Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                const Icon(Icons.touch_app_rounded, color: Color(0xFF38BDF8), size: 16),
                                                const SizedBox(width: 6),
                                                Text(
                                                  'دوس لقلب الكارت 🔄 أو اسحب بإيدك',
                                                  style: GoogleFonts.cairo(fontSize: 11, color: Colors.white70, fontWeight: FontWeight.bold),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                            ),
                          );
                        },
                      ),

                      // Swipe Right Badge (فاهمها تمام)
                      if (percentX > 15)
                        Positioned(
                          top: 20,
                          right: 20,
                          child: Transform.rotate(
                            angle: -0.2,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                              decoration: BoxDecoration(
                                color: const Color(0xFF10B981).withValues(alpha: (percentX / 100.0).clamp(0.4, 1.0)),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Colors.white, width: 2),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.2),
                                    blurRadius: 8,
                                  ),
                                ],
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.thumb_up_alt_rounded, color: Colors.white, size: 18),
                                  const SizedBox(width: 6),
                                  Text(
                                    'فاهمها تمام 👍',
                                    style: GoogleFonts.cairo(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),

                      // Swipe Left Badge (هراجعها تاني)
                      if (percentX < -15)
                        Positioned(
                          top: 20,
                          left: 20,
                          child: Transform.rotate(
                            angle: 0.2,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF59E0B).withValues(alpha: ((-percentX) / 100.0).clamp(0.4, 1.0)),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Colors.white, width: 2),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.2),
                                    blurRadius: 8,
                                  ),
                                ],
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.refresh_rounded, color: Colors.white, size: 18),
                                  const SizedBox(width: 6),
                                  Text(
                                    'هراجعها تاني 🔄',
                                    style: GoogleFonts.cairo(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                );
              },
            ),
          ),

        const SizedBox(height: 14),

        // ── Deck Bottom Interactive Controls ──
        if (!_isCompleted)
          Row(
            children: [
              // Undo button
              IconButton(
                onPressed: () => _controller.undo(),
                icon: const Icon(Icons.undo_rounded, size: 20, color: Color(0xFF64748B)),
                tooltip: 'تراجع عن السحب',
                style: IconButton.styleFrom(
                  backgroundColor: const Color(0xFFF1F5F9),
                  padding: const EdgeInsets.all(10),
                  minimumSize: const Size(38, 38),
                ),
              ),
              const SizedBox(width: 6),

              // Swipe Left (Review)
              Expanded(
                child: ElevatedButton(
                  onPressed: () => _controller.swipe(CardSwiperDirection.left),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFFFFBEB),
                    foregroundColor: const Color(0xFFB45309),
                    elevation: 0,
                    side: const BorderSide(color: Color(0xFFFDE68A)),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.refresh_rounded, size: 15),
                        const SizedBox(width: 4),
                        Text('هراجعها 🔄', style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 6),

              // Flip Card
              Expanded(
                child: ElevatedButton(
                  onPressed: () => _toggleFlip(_activeCardIndex),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFEFF6FF),
                    foregroundColor: AppColors.blue,
                    elevation: 0,
                    side: const BorderSide(color: Color(0xFFBFDBFE)),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.flip_rounded, size: 15),
                        const SizedBox(width: 4),
                        Text('اقلب الكارت 🔀', style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 6),

              // Swipe Right (Mastered)
              Expanded(
                child: ElevatedButton(
                  onPressed: () => _controller.swipe(CardSwiperDirection.right),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFECFDF5),
                    foregroundColor: const Color(0xFF059669),
                    elevation: 0,
                    side: const BorderSide(color: Color(0xFFA7F3D0)),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.thumb_up_alt_rounded, size: 15),
                        const SizedBox(width: 4),
                        Text('فاهمها 👍', style: GoogleFonts.cairo(fontSize: 11, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
      ],
    );
  }

  /// Completion state when all cards are swiped
  Widget _buildCompletionView(int total, int masteredCount) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF064E3B), Color(0xFF047857), Color(0xFF0F172A)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFF34D399).withValues(alpha: 0.5), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF047857).withValues(alpha: 0.3),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.emoji_events_rounded, color: Color(0xFFFBBF24), size: 48),
          ),
          const SizedBox(height: 14),
          Text(
            'عاش يا وحش! 🎉',
            style: GoogleFonts.cairo(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.white),
          ),
          const SizedBox(height: 6),
          Text(
            'خلصت كل كروت الدرس ده 👏',
            textAlign: TextAlign.center,
            style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.w600, color: const Color(0xFFD1FAE5)),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              'عرفت $masteredCount من أصل $total كارت ⭐',
              style: GoogleFonts.cairo(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF6EE7B7)),
            ),
          ),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: _resetDeck,
            icon: const Icon(Icons.refresh_rounded, size: 18),
            label: Text(
              'سمّع من الأول تاني 🔄',
              style: GoogleFonts.cairo(fontSize: 13, fontWeight: FontWeight.w900),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              foregroundColor: Colors.white,
              elevation: 4,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
          ),
        ],
      ),
    );
  }
}
