import 'package:flutter/services.dart';

class SoundService {
  SoundService._internal();

  static final SoundService _instance = SoundService._internal();
  factory SoundService() => _instance;

  bool isEnabled = true;

  Future<void> playCorrect() async {
    try {
      HapticFeedback.lightImpact();
      if (!isEnabled) return;
      await SystemSound.play(SystemSoundType.click);
    } catch (_) {}
  }

  Future<void> playWrong() async {
    try {
      HapticFeedback.mediumImpact();
      if (!isEnabled) return;
      await SystemSound.play(SystemSoundType.alert);
    } catch (_) {}
  }

  Future<void> playComplete() async {
    try {
      HapticFeedback.heavyImpact();
      if (!isEnabled) return;
      await SystemSound.play(SystemSoundType.click);
      await Future.delayed(const Duration(milliseconds: 120));
      await HapticFeedback.mediumImpact();
      await SystemSound.play(SystemSoundType.click);
    } catch (_) {}
  }

  Future<void> playPing() async {
    try {
      HapticFeedback.lightImpact();
      if (!isEnabled) return;
      await SystemSound.play(SystemSoundType.click);
    } catch (_) {}
  }

  Future<void> playTap() async {
    try {
      HapticFeedback.selectionClick();
      if (!isEnabled) return;
      await SystemSound.play(SystemSoundType.click);
    } catch (_) {}
  }
}
