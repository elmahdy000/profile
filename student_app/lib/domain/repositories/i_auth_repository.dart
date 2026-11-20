import '../../core/network/result.dart';
import '../entities/student.dart';

abstract interface class IAuthRepository {
  Future<Result<Student>> login({
    required String phone,
    required String studentCode,
  });

  Future<Result<Student?>> getCurrentStudent();

  Future<void> logout();

  bool get isAuthenticated;
}
