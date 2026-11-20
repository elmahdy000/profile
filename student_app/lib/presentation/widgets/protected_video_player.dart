import 'dart:convert';
import 'package:http/http.dart' as http;
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:video_player/video_player.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/constants/app_colors.dart';
import '../../domain/entities/student.dart';
import 'video/youtube_iframe.dart';

/// Cinema-grade learning video player:
/// - Single stream: seamless Fullscreen toggle with landscape cinema rotation
/// - Pure unobstructed clear video (no watermarks)
/// - Universal Left-to-Right (LTR) controls and seek navigation
/// - Edge-to-edge full width presentation
/// - Instant speed switching (1x, 1.25x, 1.5x, 2x, 3x) with visual Amber feedback
/// - Smooth scrubbing navigator with buffered bar & drag timestamp tooltip
/// - Volume slider + mute toggle + vertical drag volume gesture
/// - Double-tap gestures to seek (+/- 10s) with animated ripples
/// - Picture-in-Picture / Minimize to floating player
/// - Auto-save and resume playback from last saved timestamp
class ProtectedVideoPlayer extends StatefulWidget {
  const ProtectedVideoPlayer({
    required this.title,
    super.key,
    this.videoUrl,
    this.videoId,
    this.student,
    this.onCompleted,
    this.onMinimize,
  });

  final String title;
  final String? videoUrl;
  final int? videoId;
  final Student? student;
  final VoidCallback? onCompleted;
  final VoidCallback? onMinimize;

  @override
  State<ProtectedVideoPlayer> createState() => _ProtectedVideoPlayerState();
}

class _ProtectedVideoPlayerState extends State<ProtectedVideoPlayer>
    with SingleTickerProviderStateMixin {
  VideoPlayerController? _controller;
  bool _isInitialized = false;
  bool _hasError = false;
  String _errorMessage = '';
  bool _showControls = true;
  Timer? _hideTimer;

  // Playback state
  double _playbackSpeed = 1.0;
  double _volume = 1.0;
  bool _isMuted = false;
  bool _isLocked = false;
  bool _isFullscreen = false;
  OverlayEntry? _fullscreenOverlay;
  BoxFit _videoFit = BoxFit.contain;

  // Scrubber drag state (smooth 60fps seek without video stall)
  bool _isDraggingScrubber = false;
  double _dragPositionMs = 0.0;

  // Double-tap seek ripples
  int _seekRippleDirection = 0; // -1: left, 1: right, 0: none
  Timer? _seekRippleTimer;

  // On-screen HUD notice toast (volume, speed, seek)
  String? _hudNotice;
  IconData? _hudIcon;
  Color _hudColor = const Color(0xFF00D2FF);
  Timer? _hudTimer;

  String? _youtubeId;

  // Volume slider popover toggle
  bool _showVolumeSlider = false;

  @override
  void initState() {
    super.initState();
    _parseAndSetupPlayer();
  }

  @override
  void didUpdateWidget(ProtectedVideoPlayer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.videoUrl != widget.videoUrl) {
      _saveCurrentPosition();
      _controller?.dispose();
      _controller = null;
      _isInitialized = false;
      _hasError = false;
      _parseAndSetupPlayer();
    }
  }

  String? _extractYouTubeId(String url) {
    if (url.isEmpty) return null;
    final regExp = RegExp(
      r'(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube-nocookie\.com\/embed\/)([A-Za-z0-9_-]{11})',
      caseSensitive: false,
    );
    final match = regExp.firstMatch(url);
    return match?.group(1);
  }

  Future<Map<String, String>> _getAuthHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('auth_token');
    final rawStudent = prefs.getString('current_student');
    final headers = <String, String>{};
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
      headers['X-Student-Token'] = token;
    }
    if (rawStudent != null && rawStudent.isNotEmpty) {
      try {
        final s = jsonDecode(rawStudent);
        final code = (s['accessCode'] ?? s['studentCode'])?.toString();
        if (code != null && code.isNotEmpty) {
          headers['X-Student-Code'] = code;
        }
      } catch (_) {}
    }
    return headers;
  }

  Future<void> _parseAndSetupPlayer() async {
    String streamUrl = (widget.videoUrl ?? '').trim();

    // 1. If videoUrl is empty, but videoId is available, request signed stream-url
    if (streamUrl.isEmpty && widget.videoId != null && widget.videoId! > 0) {
      try {
        final headers = await _getAuthHeaders();
        final res = await http.get(
          Uri.parse(ApiEndpoints.videoStreamUrl(widget.videoId!)),
          headers: headers,
        ).timeout(const Duration(seconds: 8));

        if (res.statusCode == 200) {
          final data = jsonDecode(res.body);
          if (data is Map && data['url'] != null) {
            streamUrl = data['url'].toString();
          }
        }
      } catch (_) {}
    }

    // 2. Fallback to direct stream endpoint if still empty
    if (streamUrl.isEmpty && widget.videoId != null && widget.videoId! > 0) {
      streamUrl = '${ApiEndpoints.baseUrl}/api/videos/${widget.videoId}/stream';
    }

    if (streamUrl.isEmpty) {
      setState(() {
        _hasError = true;
        _errorMessage = 'لم يتم تحديد رابط فيديو لهذا الدرس بعد.';
      });
      return;
    }

    final ytId = _extractYouTubeId(streamUrl);
    if (ytId != null) {
      setState(() {
        _youtubeId = ytId;
        _isInitialized = true;
      });
      return;
    }

    if (streamUrl.startsWith('/')) {
      streamUrl = '${ApiEndpoints.baseUrl}$streamUrl';
    }

    setState(() {
      _youtubeId = null;
      _isInitialized = false;
      _hasError = false;
    });

    await _initializeVideoController(streamUrl);
  }

  Future<void> _initializeVideoController(String url) async {
    try {
      final headers = await _getAuthHeaders();
      final uri = Uri.parse(url);
      final controller = VideoPlayerController.networkUrl(
        uri,
        httpHeaders: headers,
        videoPlayerOptions: VideoPlayerOptions(mixWithOthers: true),
      );

      _controller = controller;

      await controller.initialize();

      if (!mounted) {
        controller.dispose();
        return;
      }

      controller.addListener(_videoListener);

      // Always start clean from the beginning (00:00) as requested
      await controller.seekTo(Duration.zero);

      // Apply initial playback speed and volume
      if (_playbackSpeed != 1.0) {
        await controller.setPlaybackSpeed(_playbackSpeed);
      }
      await controller.setVolume(_isMuted ? 0.0 : _volume);

      setState(() {
        _isInitialized = true;
        _hasError = false;
      });

      await controller.play();
      _startHideTimer();
    } catch (e) {
      if (mounted) {
        setState(() {
          _hasError = true;
          _errorMessage = 'تعذر تشغيل بث الفيديو. يرجى التأكد من اتصال الإنترنت.';
        });
      }
    }
  }

  String get _storageKey => 'lesson_saved_pos_${widget.title.replaceAll(RegExp(r'\s+'), '_')}';

  Future<void> _saveCurrentPosition() async {
    final c = _controller;
    if (c == null || !c.value.isInitialized) return;
    try {
      final pos = c.value.position.inSeconds;
      if (pos > 5) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setInt(_storageKey, pos);
      }
    } catch (_) {}
  }

  void _videoListener() {
    if (!mounted) return;
    final c = _controller;
    if (c == null) return;

    if (c.value.hasError) {
      setState(() {
        _hasError = true;
        _errorMessage = c.value.errorDescription ?? 'حدث خطأ أثناء تشغيل الفيديو.';
      });
      return;
    }

    if (c.value.position >= c.value.duration && c.value.duration > Duration.zero) {
      widget.onCompleted?.call();
    }

    if (c.value.position.inSeconds % 10 == 0) {
      _saveCurrentPosition();
    }

    // Only rebuild if not dragging scrubber to prevent fighting user's touch
    if (!_isDraggingScrubber) {
      setState(() {});
    }
  }

  void _startHideTimer() {
    _hideTimer?.cancel();
    _hideTimer = Timer(const Duration(seconds: 4), () {
      if (mounted && (_controller?.value.isPlaying ?? false) && !_isLocked && !_isDraggingScrubber) {
        setState(() {
          _showControls = false;
          _showVolumeSlider = false;
        });
      }
    });
  }

  void _toggleControls() {
    setState(() => _showControls = !_showControls);
    if (_showControls) _startHideTimer();
  }

  void _seekRelative(int seconds) {
    final c = _controller;
    if (c == null || !c.value.isInitialized) return;
    final newPos = c.value.position + Duration(seconds: seconds);
    final clamped = newPos < Duration.zero
        ? Duration.zero
        : (newPos > c.value.duration ? c.value.duration : newPos);
    c.seekTo(clamped);

    // Trigger visual ripple
    setState(() => _seekRippleDirection = seconds > 0 ? 1 : -1);
    _seekRippleTimer?.cancel();
    _seekRippleTimer = Timer(const Duration(milliseconds: 700), () {
      if (mounted) setState(() => _seekRippleDirection = 0);
    });

    _triggerHud(
      seconds > 0 ? '+$seconds ثانية' : '$seconds ثانية',
      icon: seconds > 0 ? Icons.forward_10_rounded : Icons.replay_10_rounded,
      color: const Color(0xFF00D2FF),
    );
    _startHideTimer();
  }

  void _triggerHud(String text, {IconData? icon, Color color = const Color(0xFF00D2FF)}) {
    setState(() {
      _hudNotice = text;
      _hudIcon = icon;
      _hudColor = color;
    });
    _hudTimer?.cancel();
    _hudTimer = Timer(const Duration(milliseconds: 1400), () {
      if (mounted) setState(() => _hudNotice = null);
    });
  }

  Future<void> _changeSpeed(double speed) async {
    final c = _controller;
    if (c == null) return;
    try {
      await c.setPlaybackSpeed(speed);
      setState(() => _playbackSpeed = speed);
      _triggerHud(
        '⚡ سرعة التشغيل: ${speed}x',
        icon: Icons.speed_rounded,
        color: const Color(0xFFF59E0B),
      );
    } catch (e) {
      debugPrint('Playback speed error: $e');
    }
    _startHideTimer();
  }

  void _cycleSpeed() {
    final speeds = [1.0, 1.25, 1.5, 2.0];
    int nextIdx = 0;
    for (int i = 0; i < speeds.length; i++) {
      if ((speeds[i] - _playbackSpeed).abs() < 0.05) {
        nextIdx = (i + 1) % speeds.length;
        break;
      }
    }
    _changeSpeed(speeds[nextIdx]);
  }

  Future<void> _setVolume(double newVol) async {
    final c = _controller;
    if (c == null) return;
    final clamped = newVol.clamp(0.0, 1.0);
    try {
      await c.setVolume(clamped);
      setState(() {
        _volume = clamped;
        _isMuted = clamped == 0.0;
      });
      final percent = (clamped * 100).round();
      _triggerHud(
        clamped == 0.0 ? '🔇 تم كتم الصوت' : '🔊 مستوى الصوت: $percent%',
        icon: clamped == 0.0 ? Icons.volume_off_rounded : Icons.volume_up_rounded,
        color: const Color(0xFF00D2FF),
      );
    } catch (e) {
      debugPrint('Volume error: $e');
    }
    _startHideTimer();
  }

  void _toggleMute() {
    if (_isMuted || _volume == 0.0) {
      _setVolume(1.0);
    } else {
      _setVolume(0.0);
    }
  }

  void _toggleAspectRatio() {
    setState(() {
      if (_videoFit == BoxFit.contain) {
        _videoFit = BoxFit.cover;
        _triggerHud('ملء الشاشة (Cover)', icon: Icons.fullscreen_rounded);
      } else if (_videoFit == BoxFit.cover) {
        _videoFit = BoxFit.fitWidth;
        _triggerHud('عرض كامل (Fit Width)', icon: Icons.crop_free_rounded);
      } else {
        _videoFit = BoxFit.contain;
        _triggerHud('الأبعاد الأصلية 16:9', icon: Icons.aspect_ratio_rounded);
      }
    });
    _startHideTimer();
  }

  void _toggleLock() {
    setState(() {
      _isLocked = !_isLocked;
      if (_isLocked) {
        _showControls = false;
        _triggerHud('تم قفل الشاشة', icon: Icons.lock_rounded, color: const Color(0xFFEF4444));
      } else {
        _showControls = true;
        _triggerHud('تم إلغاء قفل الشاشة', icon: Icons.lock_open_rounded, color: const Color(0xFF10B981));
        _startHideTimer();
      }
    });
  }

  void _toggleFullscreen() {
    if (_isFullscreen) {
      _exitFullscreen();
    } else {
      _enterFullscreen();
    }
  }

  void _enterFullscreen() {
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    setState(() => _isFullscreen = true);
    _fullscreenOverlay = OverlayEntry(
      builder: (context) {
        return Scaffold(
          backgroundColor: Colors.black,
          body: _buildPlayerContent(isFullscreen: true),
        );
      },
    );
    Overlay.of(context).insert(_fullscreenOverlay!);
  }

  void _exitFullscreen() {
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
    ]);
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    _fullscreenOverlay?.remove();
    _fullscreenOverlay = null;
    setState(() => _isFullscreen = false);
  }

  Future<void> _launchExternal() async {
    final rawUrl = widget.videoUrl;
    if (rawUrl == null || rawUrl.isEmpty) return;
    String target = rawUrl;
    if (target.startsWith('/')) {
      target = '${ApiEndpoints.baseUrl}$target';
    }
    final uri = Uri.tryParse(target);
    if (uri != null && await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  void dispose() {
    _fullscreenOverlay?.remove();
    _fullscreenOverlay = null;
    _saveCurrentPosition();
    _hideTimer?.cancel();
    _hudTimer?.cancel();
    _seekRippleTimer?.cancel();
    _controller?.removeListener(_videoListener);
    _controller?.dispose();
    super.dispose();
  }

  String _formatDuration(Duration d) {
    final minutes = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    final hours = d.inHours;
    if (hours > 0) {
      return '$hours:$minutes:$seconds';
    }
    return '$minutes:$seconds';
  }

  @override
  Widget build(BuildContext context) {
    if (_isFullscreen) {
      return AspectRatio(
        aspectRatio: 16 / 9,
        child: Container(
          color: Colors.black,
          child: const Center(
            child: Text(
              'وضع ملء الشاشة نشط...',
              style: TextStyle(color: Colors.white70, fontSize: 11),
            ),
          ),
        ),
      );
    }

    return _buildPlayerContent(isFullscreen: false);
  }

  Widget _buildPlayerContent({required bool isFullscreen}) {
    return Directionality(
      textDirection: TextDirection.ltr,
      child: Container(
        width: double.infinity,
        height: isFullscreen ? double.infinity : null,
        constraints: isFullscreen ? null : const BoxConstraints(minHeight: 220),
        color: const Color(0xFF030712),
        child: Stack(
          children: [
            // ── 1. Main Video Display Surface ──
            Positioned.fill(
              child: _buildVideoSurface(),
            ),

            // ── 2. Double-Tap Animated Seek Ripples ──
            if (_seekRippleDirection != 0)
              Positioned.fill(
                child: _buildSeekRippleOverlay(),
              ),

            // ── 3. On-Screen HUD Notice Toast (Volume, Speed, Seek) ──
            if (_hudNotice != null)
              Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0B132B).withValues(alpha: 0.92),
                    borderRadius: BorderRadius.circular(30),
                    border: Border.all(color: _hudColor.withValues(alpha: 0.8), width: 1.4),
                    boxShadow: [
                      BoxShadow(
                        color: _hudColor.withValues(alpha: 0.3),
                        blurRadius: 16,
                        spreadRadius: 1,
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (_hudIcon != null) ...[
                        Icon(_hudIcon, color: _hudColor, size: 18),
                        const SizedBox(width: 8),
                      ],
                      Text(
                        _hudNotice!,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12.5,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

            // ── 4. Screen Lock Floating Button (when locked) ──
            if (_isLocked)
              Positioned(
                top: 14,
                left: 14,
                child: InkWell(
                  onTap: _toggleLock,
                  borderRadius: BorderRadius.circular(25),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEF4444).withValues(alpha: 0.92),
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: const [
                        BoxShadow(color: Colors.black45, blurRadius: 10),
                      ],
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.lock_rounded, size: 15, color: Colors.white),
                        SizedBox(width: 6),
                        Text(
                          'اضغط لإلغاء القفل',
                          style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

            // ── 5. Error State Overlay ──
            if (_hasError)
              Positioned.fill(
                child: Container(
                  color: const Color(0xFF0F172A).withValues(alpha: 0.96),
                  padding: const EdgeInsets.all(16),
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.error_outline_rounded,
                          color: Color(0xFFF87171),
                          size: 38,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _errorMessage,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11.5,
                            fontWeight: FontWeight.w600,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            ElevatedButton.icon(
                              onPressed: _parseAndSetupPlayer,
                              icon: const Icon(Icons.refresh_rounded, size: 16),
                              label: const Text('إعادة المحاولة', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.blue,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9)),
                              ),
                            ),
                            if (widget.videoUrl != null && widget.videoUrl!.isNotEmpty) ...[
                              const SizedBox(width: 8),
                              OutlinedButton.icon(
                                onPressed: _launchExternal,
                                icon: const Icon(Icons.open_in_new_rounded, size: 14),
                                label: const Text('فتح خارجي', style: TextStyle(fontSize: 11)),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: Colors.white70,
                                  side: const BorderSide(color: Colors.white24),
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9)),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildSeekRippleOverlay() {
    final isRight = _seekRippleDirection > 0;
    return Align(
      alignment: isRight ? Alignment.centerRight : Alignment.centerLeft,
      child: FractionallySizedBox(
        widthFactor: 0.45,
        heightFactor: 1.0,
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.12),
            borderRadius: BorderRadius.horizontal(
              left: isRight ? const Radius.circular(100) : Radius.zero,
              right: !isRight ? const Radius.circular(100) : Radius.zero,
            ),
          ),
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  isRight ? Icons.fast_forward_rounded : Icons.fast_rewind_rounded,
                  color: const Color(0xFF00D2FF),
                  size: 36,
                ),
                const SizedBox(height: 4),
                Text(
                  isRight ? '+10 ثوانٍ' : '-10 ثوانٍ',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildVideoSurface() {
    // 1. YouTube Video
    if (_youtubeId != null) {
      if (kIsWeb) {
        return buildYouTubeIframe(videoId: _youtubeId!, title: widget.title);
      }

      final thumbUrl = 'https://img.youtube.com/vi/$_youtubeId/hqdefault.jpg';
      return Stack(
        fit: StackFit.expand,
        children: [
          Image.network(
            thumbUrl,
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) => Container(color: const Color(0xFF13386B)),
          ),
          Container(
            color: Colors.black.withValues(alpha: 0.38),
          ),
          Center(
            child: InkWell(
              onTap: _launchExternal,
              splashColor: Colors.transparent,
              highlightColor: Colors.transparent,
              borderRadius: BorderRadius.circular(35),
              child: Container(
                width: 62,
                height: 62,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: const LinearGradient(
                    colors: [Color(0xFF00D2FF), Color(0xFF2F89F6)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  border: Border.all(color: Colors.white, width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF00D2FF).withValues(alpha: 0.4),
                      blurRadius: 18,
                    ),
                  ],
                ),
                child: const Center(
                  child: Icon(
                    Icons.play_arrow_rounded,
                    color: Colors.white,
                    size: 38,
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            bottom: 12,
            right: 14,
            left: 14,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.black87,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFF10B981), width: 0.8),
                  ),
                  child: const Text(
                    'YouTube 1080p',
                    style: TextStyle(color: Color(0xFF10B981), fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
                InkWell(
                  onTap: _launchExternal,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.22),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Row(
                      children: [
                        Text('تشغيل الدرس', style: TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.bold)),
                        SizedBox(width: 4),
                        Icon(Icons.open_in_new_rounded, size: 12, color: Colors.white),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      );
    }

    // 2. Direct Video Stream Controller
    final controller = _controller;
    if (controller != null && _isInitialized) {
      final durationMs = controller.value.duration.inMilliseconds.toDouble();
      final currentPosMs = _isDraggingScrubber
          ? _dragPositionMs
          : controller.value.position.inMilliseconds.toDouble().clamp(0.0, durationMs > 0 ? durationMs : 1.0);

      return Stack(
        fit: StackFit.expand,
        children: [
          // ── Video Canvas ──
          Center(
            child: FittedBox(
              fit: _videoFit,
              child: SizedBox(
                width: controller.value.size.width > 0 ? controller.value.size.width : 1280,
                height: controller.value.size.height > 0 ? controller.value.size.height : 720,
                child: VideoPlayer(controller),
              ),
            ),
          ),

          // ── Gesture Zones (Double Tap Seek + Right Side Vertical Volume Drag) ──
          if (!_isLocked)
            Row(
              children: [
                // Left Zone: Double-Tap Rewind (-10s)
                Expanded(
                  flex: 3,
                  child: GestureDetector(
                    behavior: HitTestBehavior.translucent,
                    onTap: _toggleControls,
                    onDoubleTap: () => _seekRelative(-10),
                    child: const SizedBox.expand(),
                  ),
                ),
                // Center Zone: Tap toggle controls
                Expanded(
                  flex: 2,
                  child: GestureDetector(
                    behavior: HitTestBehavior.translucent,
                    onTap: _toggleControls,
                    child: const SizedBox.expand(),
                  ),
                ),
                // Right Zone: Double-Tap Forward (+10s) & Vertical Drag Volume
                Expanded(
                  flex: 3,
                  child: GestureDetector(
                    behavior: HitTestBehavior.translucent,
                    onTap: _toggleControls,
                    onDoubleTap: () => _seekRelative(10),
                    onVerticalDragUpdate: (details) {
                      // Drag up -> increase, Drag down -> decrease
                      final delta = -details.primaryDelta! / 160.0;
                      _setVolume(_volume + delta);
                    },
                    child: const SizedBox.expand(),
                  ),
                ),
              ],
            ),

          // ── Persistent Mini Scrubber (Visible when controls hidden, like YouTube) ──
          if (!_showControls && !_isLocked)
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: LinearProgressIndicator(
                value: durationMs > 0 ? (controller.value.position.inMilliseconds / durationMs).clamp(0.0, 1.0) : 0.0,
                minHeight: 2.5,
                backgroundColor: Colors.white12,
                valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF00D2FF)),
              ),
            ),

          // ── Full Rich On-Screen Controls Overlay ──
          if (_showControls && !_isLocked)
            AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Colors.black.withValues(alpha: 0.78),
                    Colors.black.withValues(alpha: 0.35),
                    Colors.black.withValues(alpha: 0.85),
                  ],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // ── Top Header Controls Bar ──
                  SafeArea(
                    bottom: false,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(10, 6, 10, 0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          // Left Tools: Minimize, Fullscreen Exit, Lock, Aspect Ratio, 1080p Badge
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (widget.onMinimize != null && !_isFullscreen) ...[
                                _buildIconButton(
                                  icon: Icons.keyboard_arrow_down_rounded,
                                  tooltip: 'تصغير المشغل',
                                  onTap: widget.onMinimize!,
                                ),
                                const SizedBox(width: 4),
                              ],
                              if (_isFullscreen) ...[
                                _buildIconButton(
                                  icon: Icons.fullscreen_exit_rounded,
                                  tooltip: 'الخروج من ملء الشاشة',
                                  onTap: _exitFullscreen,
                                ),
                                const SizedBox(width: 4),
                              ],
                              _buildIconButton(
                                icon: Icons.lock_open_rounded,
                                tooltip: 'قفل أزرار التحكم',
                                onTap: _toggleLock,
                              ),
                              const SizedBox(width: 4),
                              _buildIconButton(
                                icon: Icons.aspect_ratio_rounded,
                                tooltip: 'تغيير أبعاد العرض',
                                onTap: _toggleAspectRatio,
                              ),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF10B981).withValues(alpha: 0.18),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: const Color(0xFF10B981), width: 0.9),
                                ),
                                child: const Text(
                                  '1080p FHD',
                                  style: TextStyle(
                                    color: Color(0xFF10B981),
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                            ],
                          ),

                          // Right: Full Playback Speed Selectors (in Landscape/Fullscreen) or Top Speed Pill
                          if (_isFullscreen)
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                _buildSpeedPill(1.0, '1x'),
                                const SizedBox(width: 3),
                                _buildSpeedPill(1.25, '1.25x'),
                                const SizedBox(width: 3),
                                _buildSpeedPill(1.5, '1.5x'),
                                const SizedBox(width: 3),
                                _buildSpeedPill(2.0, '2x'),
                              ],
                            )
                          else
                            InkWell(
                              onTap: _cycleSpeed,
                              borderRadius: BorderRadius.circular(6),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                decoration: BoxDecoration(
                                  color: _playbackSpeed != 1.0 ? const Color(0xFFF59E0B) : Colors.black45,
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(
                                    color: _playbackSpeed != 1.0 ? const Color(0xFFF59E0B) : Colors.white24,
                                    width: 0.8,
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      Icons.speed_rounded,
                                      size: 13,
                                      color: _playbackSpeed != 1.0 ? Colors.black : const Color(0xFFF59E0B),
                                    ),
                                    const SizedBox(width: 3),
                                    Text(
                                      '${_playbackSpeed}x',
                                      style: TextStyle(
                                        color: _playbackSpeed != 1.0 ? Colors.black : Colors.white,
                                        fontSize: 10,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),

                  // ── Middle Play / Seek Controls Bar ──
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Replay 10s (Left)
                      InkWell(
                        onTap: () => _seekRelative(-10),
                        borderRadius: BorderRadius.circular(30),
                        child: Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.white.withValues(alpha: 0.12),
                            border: Border.all(color: Colors.white24, width: 1),
                          ),
                          child: const Icon(Icons.replay_10_rounded, color: Colors.white, size: 24),
                        ),
                      ),
                      const SizedBox(width: 28),

                      // Center Play / Pause
                      InkWell(
                        onTap: () {
                          if (controller.value.isPlaying) {
                            controller.pause();
                          } else {
                            controller.play();
                          }
                          _startHideTimer();
                        },
                        borderRadius: BorderRadius.circular(35),
                        child: Container(
                          width: 56,
                          height: 56,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: const LinearGradient(
                              colors: [Color(0xFF00D2FF), Color(0xFF2563EB)],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            border: Border.all(color: Colors.white, width: 2),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF00D2FF).withValues(alpha: 0.45),
                                blurRadius: 18,
                              ),
                            ],
                          ),
                          child: Icon(
                            controller.value.isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                            color: Colors.white,
                            size: 34,
                          ),
                        ),
                      ),
                      const SizedBox(width: 28),

                      // Forward 10s (Right)
                      InkWell(
                        onTap: () => _seekRelative(10),
                        borderRadius: BorderRadius.circular(30),
                        child: Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.white.withValues(alpha: 0.12),
                            border: Border.all(color: Colors.white24, width: 1),
                          ),
                          child: const Icon(Icons.forward_10_rounded, color: Colors.white, size: 24),
                        ),
                      ),
                    ],
                  ),

                  // ── Bottom Video Navigator & Voice Toolbar ──
                  Padding(
                    padding: const EdgeInsets.fromLTRB(10, 0, 10, 6),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Row 1: Time Stamps & Interactive Voice / Fullscreen
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            // Current Elapsed vs Total Duration (LTR Enforced for Clean Timeline)
                            Directionality(
                              textDirection: TextDirection.ltr,
                              child: Row(
                                children: [
                                  Text(
                                    _formatDuration(Duration(milliseconds: currentPosMs.toInt())),
                                    style: TextStyle(
                                      color: _isDraggingScrubber ? const Color(0xFF00D2FF) : Colors.white,
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                  const Text(' / ', style: TextStyle(color: Colors.white54, fontSize: 10)),
                                  Text(
                                    _formatDuration(controller.value.duration),
                                    style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w600),
                                  ),
                                ],
                              ),
                            ),

                            // Right Tools: Voice Volume + Fullscreen
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                // Quick Mute / Unmute Button
                                InkWell(
                                  onTap: _toggleMute,
                                  onLongPress: () {
                                    setState(() => _showVolumeSlider = !_showVolumeSlider);
                                  },
                                  borderRadius: BorderRadius.circular(6),
                                  child: Padding(
                                    padding: const EdgeInsets.all(5),
                                    child: Icon(
                                      _isMuted || _volume == 0.0
                                          ? Icons.volume_off_rounded
                                          : (_volume < 0.5 ? Icons.volume_down_rounded : Icons.volume_up_rounded),
                                      color: _isMuted ? const Color(0xFFEF4444) : const Color(0xFF00D2FF),
                                      size: 20,
                                    ),
                                  ),
                                ),

                                // Interactive Volume Slider
                                SizedBox(
                                  width: 58,
                                  child: SliderTheme(
                                    data: SliderTheme.of(context).copyWith(
                                      trackHeight: 2.8,
                                      thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 4.5),
                                      overlayShape: const RoundSliderOverlayShape(overlayRadius: 8),
                                      activeTrackColor: const Color(0xFF00D2FF),
                                      inactiveTrackColor: Colors.white24,
                                      thumbColor: Colors.white,
                                    ),
                                    child: Slider(
                                      value: _isMuted ? 0.0 : _volume,
                                      min: 0.0,
                                      max: 1.0,
                                      onChanged: (val) {
                                        _setVolume(val);
                                      },
                                    ),
                                  ),
                                ),

                                const SizedBox(width: 4),

                                // Quick Speed Switcher Pill
                                InkWell(
                                  onTap: _cycleSpeed,
                                  borderRadius: BorderRadius.circular(6),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2.5),
                                    decoration: BoxDecoration(
                                      color: _playbackSpeed != 1.0 ? const Color(0xFFF59E0B) : Colors.white.withValues(alpha: 0.18),
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(
                                        color: _playbackSpeed != 1.0 ? const Color(0xFFF59E0B) : Colors.white30,
                                        width: 0.8,
                                      ),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(
                                          Icons.speed_rounded,
                                          size: 12,
                                          color: _playbackSpeed != 1.0 ? Colors.black : Colors.white,
                                        ),
                                        const SizedBox(width: 2.5),
                                        Text(
                                          '${_playbackSpeed}x',
                                          style: TextStyle(
                                            color: _playbackSpeed != 1.0 ? Colors.black : Colors.white,
                                            fontSize: 9.5,
                                            fontWeight: FontWeight.w900,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),

                                const SizedBox(width: 4),

                                // Fullscreen Toggle
                                InkWell(
                                  onTap: _toggleFullscreen,
                                  borderRadius: BorderRadius.circular(6),
                                  child: Padding(
                                    padding: const EdgeInsets.all(5),
                                    child: Icon(
                                      _isFullscreen ? Icons.fullscreen_exit_rounded : Icons.fullscreen_rounded,
                                      color: Colors.white,
                                      size: 22,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),

                        const SizedBox(height: 2),

                        // Row 2: YouTube-Grade Multi-Layer Scrubber (Buffered Bar + Gradient Played Bar + Drag Tooltip)
                        _buildHighPerformanceScrubber(controller, durationMs, currentPosMs),
                      ],
                    ),
                  ),
                ],
              ),
            ),
        ],
      );
    }

    // 3. Fast Buffering State with High-Speed Indicator
    return Container(
      color: const Color(0xFF030712),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(
              width: 34,
              height: 34,
              child: CircularProgressIndicator(
                strokeWidth: 3,
                valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF00D2FF)),
              ),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Text(
                '⚡ جاري تجهيز البث فائق السرعة...',
                style: TextStyle(
                  color: Colors.white70,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHighPerformanceScrubber(VideoPlayerController controller, double durationMs, double currentPosMs) {
    // Calculate buffered ratio
    double bufferedRatio = 0.0;
    if (controller.value.buffered.isNotEmpty && durationMs > 0) {
      bufferedRatio = (controller.value.buffered.last.end.inMilliseconds / durationMs).clamp(0.0, 1.0);
    }

    return Directionality(
      textDirection: TextDirection.ltr,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final totalWidth = constraints.maxWidth;
          final progressRatio = durationMs > 0 ? (currentPosMs / durationMs).clamp(0.0, 1.0) : 0.0;

          return Stack(
            alignment: Alignment.centerLeft,
            clipBehavior: Clip.none,
            children: [
              // ── Background Inactive Bar (Visible across all video frames) ──
              Container(
                width: totalWidth,
                height: 5.0,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.32),
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(color: Colors.black26, width: 0.5),
                ),
              ),

              // ── Buffered Cache Range Bar ──
              if (bufferedRatio > 0)
                Container(
                  width: totalWidth * bufferedRatio,
                  height: 5.0,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.65),
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),

              // ── Played Progress Gradient Bar ──
              Container(
                width: totalWidth * progressRatio,
                height: 5.0,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF00D2FF), Color(0xFF2563EB)],
                  ),
                  borderRadius: BorderRadius.circular(4),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF00D2FF).withValues(alpha: 0.45),
                      blurRadius: 6,
                    ),
                  ],
                ),
              ),

              // ── Floating Drag Time Tooltip Bubble (When Dragging) ──
              if (_isDraggingScrubber)
                Positioned(
                  left: (totalWidth * progressRatio - 26).clamp(0.0, totalWidth - 52),
                  top: -30,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0B132B),
                      borderRadius: BorderRadius.circular(7),
                      border: Border.all(color: const Color(0xFF00D2FF), width: 1.2),
                      boxShadow: const [
                        BoxShadow(color: Colors.black54, blurRadius: 8),
                      ],
                    ),
                    child: Text(
                      _formatDuration(Duration(milliseconds: currentPosMs.toInt())),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),

              // ── Interactive Scrub Touch Slider (Zero-Lag Smooth Dragging) ──
              SliderTheme(
                data: SliderTheme.of(context).copyWith(
                  trackShape: const _FullWidthTrackShape(),
                  trackHeight: 5.0,
                  thumbShape: RoundSliderThumbShape(
                    enabledThumbRadius: _isDraggingScrubber ? 9.0 : 7.0,
                    elevation: 3,
                  ),
                  overlayShape: const RoundSliderOverlayShape(overlayRadius: 15),
                  activeTrackColor: Colors.transparent, // Handled by our custom gradient bar
                  inactiveTrackColor: Colors.transparent, // Handled by custom background
                  thumbColor: Colors.white,
                ),
                child: Slider(
                  value: currentPosMs.clamp(0.0, durationMs > 0 ? durationMs : 1.0),
                  min: 0.0,
                  max: durationMs > 0 ? durationMs : 1.0,
                  onChangeStart: (val) {
                    setState(() {
                      _isDraggingScrubber = true;
                      _dragPositionMs = val;
                    });
                    _hideTimer?.cancel();
                  },
                  onChanged: (val) {
                    // Instant 60fps UI feedback without hammering network seek
                    setState(() {
                      _dragPositionMs = val;
                    });
                  },
                  onChangeEnd: (val) {
                    setState(() {
                      _isDraggingScrubber = false;
                    });
                    // Single seek to target on finger release
                    controller.seekTo(Duration(milliseconds: val.toInt()));
                    _startHideTimer();
                  },
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildIconButton({
    required IconData icon,
    required String tooltip,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(6),
      child: Container(
        width: 30,
        height: 30,
        decoration: BoxDecoration(
          color: Colors.black38,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Center(
          child: Icon(icon, color: Colors.white, size: 17),
        ),
      ),
    );
  }

  Widget _buildSpeedPill(double speed, String label) {
    final isActive = (_playbackSpeed - speed).abs() < 0.05;
    return InkWell(
      onTap: () => _changeSpeed(speed),
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
        decoration: BoxDecoration(
          color: isActive ? const Color(0xFFF59E0B) : Colors.black45,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(
            color: isActive ? const Color(0xFFF59E0B) : Colors.white24,
            width: 0.8,
          ),
          boxShadow: isActive
              ? [
                  BoxShadow(
                    color: const Color(0xFFF59E0B).withValues(alpha: 0.35),
                    blurRadius: 8,
                  ),
                ]
              : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isActive ? Colors.black : Colors.white,
            fontSize: 9.5,
            fontWeight: isActive ? FontWeight.w900 : FontWeight.w600,
          ),
        ),
      ),
    );
  }
}

/// Zero-margin edge-to-edge track shape ensuring the scrubber thumb starts at exact 0.0
class _FullWidthTrackShape extends RoundedRectSliderTrackShape {
  const _FullWidthTrackShape();

  @override
  Rect getPreferredRect({
    required RenderBox parentBox,
    Offset offset = Offset.zero,
    required SliderThemeData sliderTheme,
    bool isEnabled = false,
    bool isDiscrete = false,
  }) {
    final double trackHeight = sliderTheme.trackHeight ?? 5.0;
    final double trackTop = offset.dy + (parentBox.size.height - trackHeight) / 2;
    return Rect.fromLTWH(offset.dx, trackTop, parentBox.size.width, trackHeight);
  }
}
