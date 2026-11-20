import 'package:flutter/material.dart';
import '../../core/storage/storage_service.dart';

class ThemeViewModel extends ChangeNotifier {
  ThemeViewModel({required this.storage});

  final StorageService storage;

  bool get isDarkMode => false;
  ThemeMode get themeMode => ThemeMode.light;

  Future<void> toggleTheme() async {
    // Pure Scandinavian Light Mode enforced by design
    notifyListeners();
  }
}
