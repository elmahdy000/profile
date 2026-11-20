import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../../domain/entities/mistake_item.dart';

class MistakesRepository {
  static const _storageKey = 'student_revision_bank_v3';
  static const _apiBaseUrl = 'https://drelmahdy.com';

  /// Global real-time notifier for mistakes count across all screens and widgets
  static final ValueNotifier<int> mistakesCountNotifier = ValueNotifier<int>(0);

  static bool _hasLoadedInitial = false;

  /// Ensure initial count is loaded once
  static Future<void> ensureInitialized() async {
    if (_hasLoadedInitial) return;
    _hasLoadedInitial = true;
    try {
      final repo = MistakesRepository();
      await repo.getMistakes();
    } catch (_) {}
  }

  Future<Map<String, String>> _getAuthHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    final token = prefs.getString('auth_token');
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
      headers['X-Student-Token'] = token;
    }
    final rawStudent = prefs.getString('current_student');
    if (rawStudent != null) {
      try {
        final map = jsonDecode(rawStudent) as Map<String, dynamic>;
        final code = (map['accessCode'] ?? map['studentCode'])?.toString();
        if (code != null && code.isNotEmpty) {
          headers['X-Student-Code'] = code;
        }
      } catch (_) {}
    }
    return headers;
  }

  Future<List<MistakeItem>> getMistakes() async {
    // 1. Try fetching from live backend
    try {
      final headers = await _getAuthHeaders();
      final url = Uri.parse('$_apiBaseUrl/api/learning/mistakes');
      final resp = await http.get(url, headers: headers).timeout(const Duration(seconds: 8));
      if (resp.statusCode == 200) {
        final data = jsonDecode(utf8.decode(resp.bodyBytes)) as Map<String, dynamic>;
        final rawList = data['mistakes'] as List? ?? [];
        if (rawList.isNotEmpty) {
          final items = rawList.map((e) => MistakeItem.fromBackendJson(e as Map<String, dynamic>)).toList();
          // Cache locally
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString(_storageKey, jsonEncode(items.map((e) => e.toJson()).toList()));
          mistakesCountNotifier.value = items.length;
          return items;
        }
      }
    } catch (_) {}

    // 2. Fallback to local storage
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_storageKey);
      if (raw != null && raw.isNotEmpty) {
        final decoded = jsonDecode(raw) as List;
        final list = decoded.map((e) => MistakeItem.fromJson(e as Map<String, dynamic>)).toList();
        // Purge any legacy mock questions (XOR, LIFO, rev- logic/ds)
        final validList = list.where((item) =>
          !item.id.startsWith('rev-') &&
          !item.unitName.contains('المنطقي') &&
          !item.unitName.contains('هياكل') &&
          !item.questionPrompt.contains('XOR') &&
          !item.questionPrompt.contains('LIFO')
        ).toList();
        if (validList.length != list.length) {
          await prefs.setString(_storageKey, jsonEncode(validList.map((e) => e.toJson()).toList()));
        }
        mistakesCountNotifier.value = validList.length;
        return validList;
      }
    } catch (_) {}

    mistakesCountNotifier.value = 0;
    return [];
  }

  Future<void> recordMistake(MistakeItem mistake) async {
    // 1. Save locally immediately
    try {
      final prefs = await SharedPreferences.getInstance();
      final list = await getMistakes();
      list.removeWhere((item) => item.id == mistake.id);
      list.insert(0, mistake);
      final encoded = jsonEncode(list.map((e) => e.toJson()).toList());
      await prefs.setString(_storageKey, encoded);

      // Instantly notify all listening widgets across the whole app
      mistakesCountNotifier.value = list.length;
    } catch (_) {}

    // 2. Sync to live backend non-blocking
    try {
      final headers = await _getAuthHeaders();
      final url = Uri.parse('$_apiBaseUrl/api/learning/mistakes/record');
      final body = jsonEncode({
        'question': {
          'prompt': mistake.questionPrompt,
          'options': mistake.options,
          'correctIndex': mistake.correctIdx,
          'explanation': mistake.explanation,
        },
        'selectedOption': mistake.userSelectedIdx,
        'isCorrect': false,
        'unit': mistake.unitName,
        'lesson': mistake.lessonTitle,
      });
      await http.post(url, headers: headers, body: body).timeout(const Duration(seconds: 6));
    } catch (_) {}
  }

  Future<void> resolveMistake(String id) async {
    // 1. Remove locally immediately
    try {
      final prefs = await SharedPreferences.getInstance();
      final list = await getMistakes();
      list.removeWhere((item) => item.id == id);
      final encoded = jsonEncode(list.map((e) => e.toJson()).toList());
      await prefs.setString(_storageKey, encoded);

      // Instantly notify all listening widgets across the whole app
      mistakesCountNotifier.value = list.length;
    } catch (_) {}

    // 2. Sync resolve to backend if numeric ID
    final numericId = int.tryParse(id);
    if (numericId != null && numericId > 0) {
      try {
        final headers = await _getAuthHeaders();
        final url = Uri.parse('$_apiBaseUrl/api/learning/mistakes/$numericId/resolve');
        await http.post(url, headers: headers).timeout(const Duration(seconds: 6));
      } catch (_) {}
    }
  }
}
