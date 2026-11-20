import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class StorageService {
  StorageService(this._prefs);

  final SharedPreferences _prefs;

  static const String _keyToken = 'auth_token';
  static const String _keyStudent = 'current_student';
  static const String _keyDarkMode = 'is_dark_mode';

  static Future<StorageService> init() async {
    final prefs = await SharedPreferences.getInstance();
    return StorageService(prefs);
  }

  // Token
  Future<bool> saveToken(String token) => _prefs.setString(_keyToken, token);
  String? getToken() => _prefs.getString(_keyToken);
  Future<bool> clearToken() => _prefs.remove(_keyToken);

  // Student Data Cache
  Future<bool> saveStudent(Map<String, dynamic> data) =>
      _prefs.setString(_keyStudent, jsonEncode(data));

  Map<String, dynamic>? getStudent() {
    final raw = _prefs.getString(_keyStudent);
    if (raw == null) return null;
    try {
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  Future<bool> clearStudent() => _prefs.remove(_keyStudent);

  // Dark Mode - Permanently false (Pure Scandinavian Lumina Light Theme)
  bool isDarkMode() => false;
  Future<bool> setDarkMode(bool value) => _prefs.setBool(_keyDarkMode, false);

  // Full Logout
  Future<void> clearAll() async {
    await clearToken();
    await clearStudent();
  }
}
