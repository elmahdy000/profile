import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import '../domain/entities/course.dart';

/// Global service managing active video playback across the app,
/// enabling YouTube-like Picture-in-Picture floating mini-player.
class ActiveVideoService extends ChangeNotifier {
  ActiveVideoService._internal();
  static final ActiveVideoService _instance = ActiveVideoService._internal();
  factory ActiveVideoService() => _instance;

  VideoPlayerController? _controller;
  Lesson? _currentLesson;
  String _courseTitle = '';
  bool _isMinimized = false;

  bool get hasActiveVideo => _controller != null && _controller!.value.isInitialized;
  bool get isMinimized => _isMinimized;
  VideoPlayerController? get controller => _controller;
  Lesson? get currentLesson => _currentLesson;
  String get courseTitle => _courseTitle;

  void attachVideo({
    required VideoPlayerController controller,
    required Lesson lesson,
    required String courseTitle,
  }) {
    if (_controller != controller) {
      _controller = controller;
    }
    _currentLesson = lesson;
    _courseTitle = courseTitle;
    notifyListeners();
  }

  void minimize() {
    _isMinimized = true;
    notifyListeners();
  }

  void maximize() {
    _isMinimized = false;
    notifyListeners();
  }

  void close() {
    _controller?.pause();
    _controller = null;
    _currentLesson = null;
    _courseTitle = '';
    _isMinimized = false;
    notifyListeners();
  }
}
