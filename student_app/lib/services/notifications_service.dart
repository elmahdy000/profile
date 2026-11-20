import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../core/constants/api_endpoints.dart';
import '../core/services/sound_service.dart';

class AcademicNotification {
  AcademicNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.timeAgo,
    required this.icon,
    required this.iconBg,
    required this.iconColor,
    this.isUnread = true,
    this.targetRoute,
    this.rawCreatedAt,
  });

  final String id;
  final String title;
  final String body;
  final String timeAgo;
  final IconData icon;
  final Color iconBg;
  final Color iconColor;
  bool isUnread;
  final String? targetRoute;
  final DateTime? rawCreatedAt;

  factory AcademicNotification.fromBackendJson(Map<String, dynamic> json) {
    final id = json['id']?.toString() ?? '0';
    final title = (json['title'] ?? '').toString();
    final message = (json['message'] ?? '').toString();
    final type = (json['type'] ?? 'info').toString().toLowerCase();
    final readAt = json['readAt'];
    final isUnread = readAt == null;

    DateTime? createdAt;
    final createdStr = json['createdAt']?.toString();
    if (createdStr != null && createdStr.isNotEmpty) {
      try {
        createdAt = DateTime.parse(createdStr).toLocal();
      } catch (_) {}
    }

    final (icon, iconBg, iconColor, route) = _resolveTypeVisuals(type);

    return AcademicNotification(
      id: id,
      title: title.isNotEmpty ? title : 'إشعار أكاديمي',
      body: message,
      timeAgo: _formatTimeAgo(createdAt),
      icon: icon,
      iconBg: iconBg,
      iconColor: iconColor,
      isUnread: isUnread,
      targetRoute: route,
      rawCreatedAt: createdAt,
    );
  }

  static (IconData, Color, Color, String) _resolveTypeVisuals(String type) {
    switch (type) {
      case 'quiz':
      case 'exam':
      case 'test':
        return (
          Icons.quiz_rounded,
          const Color(0xFFFFF4DF),
          const Color(0xFFD08729),
          'quizzes',
        );
      case 'homework':
      case 'assignment':
        return (
          Icons.assignment_turned_in_rounded,
          const Color(0xFFE5F8F0),
          const Color(0xFF1BA774),
          'homework',
        );
      case 'video':
      case 'lesson':
      case 'course':
        return (
          Icons.play_lesson_rounded,
          const Color(0xFFE9F3FF),
          const Color(0xFF176DDB),
          'courses',
        );
      case 'file':
      case 'pdf':
      case 'notes':
        return (
          Icons.menu_book_rounded,
          const Color(0xFFEFF6FF),
          const Color(0xFF2563EB),
          'files',
        );
      case 'attendance':
        return (
          Icons.event_available_rounded,
          const Color(0xFFF3E8FF),
          const Color(0xFF7E22CE),
          'attendance',
        );
      default:
        return (
          Icons.notifications_active_rounded,
          const Color(0xFFE0F2FE),
          const Color(0xFF0284C7),
          'courses',
        );
    }
  }

  static String _formatTimeAgo(DateTime? time) {
    if (time == null) return 'الآن';
    final diff = DateTime.now().difference(time);
    if (diff.inSeconds < 60) return 'الآن';
    if (diff.inMinutes < 60) return 'منذ ${diff.inMinutes} دقيقة';
    if (diff.inHours < 24) return 'منذ ${diff.inHours} ساعة';
    if (diff.inDays == 1) return 'أمس';
    if (diff.inDays < 7) return 'منذ ${diff.inDays} أيام';
    if (diff.inDays < 30) return 'منذ ${(diff.inDays / 7).floor()} أسابيع';
    return 'منذ ${(diff.inDays / 30).floor()} شهر';
  }
}

class NotificationsService extends ChangeNotifier {
  NotificationsService._internal() {
    _initNotifications();
  }

  static final NotificationsService _instance = NotificationsService._internal();
  factory NotificationsService() => _instance;

  final List<AcademicNotification> _notifications = [];
  bool _isLoading = false;

  List<AcademicNotification> get notifications => List.unmodifiable(_notifications);
  int get unreadCount => _notifications.where((n) => n.isUnread).length;
  bool get isLoading => _isLoading;

  void _initNotifications() {
    _loadFallbackNotifications();
    fetchNotifications();
  }

  void _loadFallbackNotifications() {
    _notifications.clear();
    _notifications.addAll([
      AcademicNotification(
        id: 'f1',
        title: 'شرح تفاعلي جديد متاح للوحدة الأولى',
        body: 'تم تجهيز فيديو الشرح التفصيلي للدرس الأول والخرائط الذهنية وبنك الأسئلة.',
        timeAgo: 'منذ ساعتين',
        icon: Icons.play_lesson_rounded,
        iconBg: const Color(0xFFE9F3FF),
        iconColor: const Color(0xFF176DDB),
        isUnread: true,
        targetRoute: 'courses',
      ),
      AcademicNotification(
        id: 'f2',
        title: 'مراجعة كشكول الواجب المنزلي',
        body: 'تمت مراجعة حلول كشكول الواجب للدرس السابق بنجاح، ملاحظة د. محمود: ممتاز واستمر.',
        timeAgo: 'منذ 5 ساعات',
        icon: Icons.assignment_turned_in_rounded,
        iconBg: const Color(0xFFE5F8F0),
        iconColor: const Color(0xFF1BA774),
        isUnread: true,
        targetRoute: 'homework',
      ),
      AcademicNotification(
        id: 'f3',
        title: 'بنك الأسئلة المنهجي المطور',
        body: 'تم تنظيم أكثر من 3000 سؤال منهجي وفق معايير التقييم الحديثة جاهزة للتدريب.',
        timeAgo: 'منذ يوم',
        icon: Icons.quiz_rounded,
        iconBg: const Color(0xFFFFF4DF),
        iconColor: const Color(0xFFD08729),
        isUnread: false,
        targetRoute: 'quizzes',
      ),
    ]);
  }

  Future<void> fetchNotifications() async {
    if (_isLoading) return;
    _isLoading = true;
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('student_token') ?? '';
      final studentStr = prefs.getString('student_user');
      String code = '';
      if (studentStr != null && studentStr.isNotEmpty) {
        try {
          final studentObj = jsonDecode(studentStr);
          if (studentObj is Map) {
            code = (studentObj['accessCode'] ?? studentObj['studentCode'] ?? '').toString();
          }
        } catch (_) {}
      }

      final headers = <String, String>{
        'Accept': 'application/json',
      };
      if (token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
        headers['X-Student-Token'] = token;
      }
      if (code.isNotEmpty) {
        headers['X-Student-Code'] = code;
      }

      final res = await http.get(
        Uri.parse(ApiEndpoints.notifications),
        headers: headers,
      ).timeout(const Duration(seconds: 10));

      if (res.statusCode >= 200 && res.statusCode < 300) {
        final decoded = jsonDecode(utf8.decode(res.bodyBytes));
        if (decoded is List) {
          final items = decoded
              .whereType<Map<String, dynamic>>()
              .map((j) => AcademicNotification.fromBackendJson(j))
              .toList();

          if (items.isNotEmpty) {
            _notifications.clear();
            _notifications.addAll(items);
            notifyListeners();
          }
        }
      }
    } catch (_) {
      // Keep existing/fallback notifications if offline
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> markAsRead(String id) async {
    final idx = _notifications.indexWhere((n) => n.id == id);
    if (idx != -1 && _notifications[idx].isUnread) {
      _notifications[idx].isUnread = false;
      notifyListeners();
      SoundService().playTap();

      // Sync with backend
      try {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString('student_token') ?? '';
        final studentStr = prefs.getString('student_user');
        String code = '';
        if (studentStr != null) {
          try {
            final s = jsonDecode(studentStr);
            code = (s['accessCode'] ?? s['studentCode'] ?? '').toString();
          } catch (_) {}
        }
        final headers = <String, String>{
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        };
        if (token.isNotEmpty) {
          headers['Authorization'] = 'Bearer $token';
          headers['X-Student-Token'] = token;
        }
        if (code.isNotEmpty) {
          headers['X-Student-Code'] = code;
        }

        await http.patch(
          Uri.parse(ApiEndpoints.markNotificationRead(id)),
          headers: headers,
        ).timeout(const Duration(seconds: 5));
      } catch (_) {}
    }
  }

  Future<void> markAllAsRead() async {
    bool changed = false;
    for (final n in _notifications) {
      if (n.isUnread) {
        n.isUnread = false;
        changed = true;
      }
    }
    if (changed) {
      notifyListeners();
      SoundService().playTap();

      try {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString('student_token') ?? '';
        final studentStr = prefs.getString('student_user');
        String code = '';
        if (studentStr != null) {
          try {
            final s = jsonDecode(studentStr);
            code = (s['accessCode'] ?? s['studentCode'] ?? '').toString();
          } catch (_) {}
        }
        final headers = <String, String>{
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        };
        if (token.isNotEmpty) {
          headers['Authorization'] = 'Bearer $token';
          headers['X-Student-Token'] = token;
        }
        if (code.isNotEmpty) {
          headers['X-Student-Code'] = code;
        }

        await http.post(
          Uri.parse(ApiEndpoints.markAllNotificationsRead),
          headers: headers,
        ).timeout(const Duration(seconds: 5));
      } catch (_) {}
    }
  }
}
