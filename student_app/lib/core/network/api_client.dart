import 'dart:convert';
import 'package:http/http.dart' as http;
import '../storage/storage_service.dart';
import 'result.dart';

class ApiClient {
  ApiClient({required this.storage, http.Client? client})
      : _client = client ?? http.Client();

  final StorageService storage;
  final http.Client _client;
  static const Duration _timeout = Duration(seconds: 15);

  Map<String, String> _buildHeaders() {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    final token = storage.getToken();
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
      headers['X-Student-Token'] = token;
    }
    final student = storage.getStudent();
    if (student != null) {
      final code = (student['accessCode'] ?? student['studentCode'])?.toString();
      if (code != null && code.isNotEmpty) {
        headers['X-Student-Code'] = code;
      }
    }
    return headers;
  }

  Future<Result<dynamic>> get(String url) async {
    try {
      final response = await _client
          .get(Uri.parse(url), headers: _buildHeaders())
          .timeout(_timeout);

      return _handleResponse(response);
    } catch (e) {
      return Failure('تعذر الاتصال بالخادم، يرجى التأكد من اتصال الإنترنت: $e');
    }
  }

  Future<Result<dynamic>> post(String url, {Map<String, dynamic>? body}) async {
    try {
      final response = await _client
          .post(
            Uri.parse(url),
            headers: _buildHeaders(),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(_timeout);

      return _handleResponse(response);
    } catch (e) {
      return Failure('تعذر الاتصال بالخادم: $e');
    }
  }

  Future<Result<dynamic>> patch(String url, {Map<String, dynamic>? body}) async {
    try {
      final response = await _client
          .patch(
            Uri.parse(url),
            headers: _buildHeaders(),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(_timeout);

      return _handleResponse(response);
    } catch (e) {
      return Failure('تعذر الاتصال بالخادم: $e');
    }
  }

  Future<Result<dynamic>> delete(String url) async {
    try {
      final response = await _client
          .delete(Uri.parse(url), headers: _buildHeaders())
          .timeout(_timeout);

      return _handleResponse(response);
    } catch (e) {
      return Failure('تعذر الاتصال بالخادم: $e');
    }
  }

  Result<dynamic> _handleResponse(http.Response response) {
    final code = response.statusCode;
    if (code >= 200 && code < 300) {
      if (response.body.isEmpty) return const Success(null);
      try {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes));
        return Success(decoded);
      } catch (e) {
        return Failure('فشل قراءة بيانات الخادم: $e', code);
      }
    } else {
      try {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes));
        final msg = decoded is Map ? (decoded['error'] ?? decoded['message']) : null;
        if (msg != null && msg.toString().trim().isNotEmpty) {
          return Failure(msg.toString(), code);
        }
      } catch (_) {}

      if (code == 401 || code == 403) {
        return Failure('انتهت صلاحية الجلسة أو الكود غير صحيح، يرجى المحاولة مجدداً', code);
      }
      return Failure('حدث خطأ في الخادم ($code)', code);
    }
  }
}
