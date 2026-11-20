import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../../core/network/result.dart';
import '../../core/storage/storage_service.dart';
import '../../domain/entities/student.dart';
import '../../domain/repositories/i_auth_repository.dart';
import '../models/student_model.dart';

class AuthRepositoryImpl implements IAuthRepository {
  AuthRepositoryImpl({
    required this.apiClient,
    required this.storage,
  });

  final ApiClient apiClient;
  final StorageService storage;

  @override
  bool get isAuthenticated => storage.getToken() != null;

  @override
  Future<Result<Student>> login({
    required String phone,
    required String studentCode,
  }) async {
    // Determine the access code to send (support entering code directly or with phone)
    final code = studentCode.trim().isNotEmpty ? studentCode.trim() : phone.trim();

    final res = await apiClient.post(
      ApiEndpoints.studentLogin,
      body: {
        'accessCode': code,
        if (phone.trim().isNotEmpty && phone.trim() != code) 'phone': phone.trim(),
      },
    );

    return res.when(
      onSuccess: (data) async {
        if (data is Map<String, dynamic>) {
          final token = data['token']?.toString();
          if (token != null && token.isNotEmpty) {
            await storage.saveToken(token);
          }

          final studentData = data['student'] ?? data['user'] ?? data;
          if (studentData is Map<String, dynamic>) {
            // Also try to fetch latest streak & motivation from /api/student/me
            try {
              final meRes = await apiClient.get(ApiEndpoints.studentMe);
              if (meRes.isSuccess && meRes.dataOrNull is Map<String, dynamic>) {
                final meData = meRes.dataOrNull as Map<String, dynamic>;
                final sData = meData['student'] as Map<String, dynamic>? ?? studentData;
                final streak = meData['streak'] is int ? meData['streak'] as int : 0;
                final prog = meData['overallProgress'] is int ? meData['overallProgress'] as int : 0;
                final model = StudentModel.fromJson(
                  sData,
                  streak: streak,
                  overallProgress: prog,
                  motivation: meData['motivation'] is Map
                      ? (meData['motivation'] as Map)['message']?.toString()
                      : meData['motivation']?.toString(),
                );
                await storage.saveStudent(model.toJson());
                return Success(model);
              }
            } catch (_) {}

            final model = StudentModel.fromJson(studentData);
            await storage.saveStudent(model.toJson());
            return Success(model);
          }
        }
        return const Failure('صيغة البيانات غير صحيحة من الخادم');
      },
      onFailure: (msg, code) => Failure(msg, code),
    );
  }

  @override
  Future<Result<Student?>> getCurrentStudent() async {
    // 1. Try local cache first
    final cached = storage.getStudent();
    Student? localStudent;
    if (cached != null) {
      localStudent = StudentModel.fromJson(cached);
    }

    if (!isAuthenticated) {
      return Success(localStudent);
    }

    // 2. Fetch fresh profile and streak from remote /api/student/me
    final res = await apiClient.get(ApiEndpoints.studentMe);
    return res.when(
      onSuccess: (data) async {
        if (data is Map<String, dynamic> && data['student'] != null) {
          final studentMap = data['student'] as Map<String, dynamic>;
          final streak = data['streak'] is int ? data['streak'] as int : 0;
          final progress = data['overallProgress'] is int ? data['overallProgress'] as int : 0;
          final motivation = data['motivation']?.toString();

          final model = StudentModel.fromJson(
            studentMap,
            streak: streak,
            overallProgress: progress,
            motivation: motivation,
          );
          await storage.saveStudent(model.toJson());
          return Success(model);
        }
        return Success(localStudent);
      },
      onFailure: (msg, code) {
        // Return cached student if offline
        if (localStudent != null) return Success(localStudent);
        return Failure(msg, code);
      },
    );
  }

  @override
  Future<void> logout() async {
    try {
      await apiClient.post(ApiEndpoints.studentLogout);
    } catch (_) {}
    await storage.clearAll();
  }
}
