import 'package:flutter/foundation.dart';
import '../../domain/entities/student.dart';
import '../../domain/repositories/i_auth_repository.dart';

enum AuthStatus { initial, loading, authenticated, unauthenticated, error }

class AuthViewModel extends ChangeNotifier {
  AuthViewModel({required this.authRepository});

  final IAuthRepository authRepository;

  AuthStatus _status = AuthStatus.initial;
  AuthStatus get status => _status;

  Student? _currentStudent;
  Student? get currentStudent => _currentStudent;

  String? _errorMessage;
  String? get errorMessage => _errorMessage;

  bool get isAuthenticated => _status == AuthStatus.authenticated && _currentStudent != null;

  Future<void> checkAuthStatus() async {
    _status = AuthStatus.loading;
    notifyListeners();

    final result = await authRepository.getCurrentStudent();
    result.when(
      onSuccess: (student) {
        if (student != null) {
          _currentStudent = student;
          _status = AuthStatus.authenticated;
        } else {
          _status = AuthStatus.unauthenticated;
        }
      },
      onFailure: (msg, _) {
        _status = AuthStatus.unauthenticated;
      },
    );
    notifyListeners();
  }

  Future<bool> login({
    required String phone,
    required String studentCode,
  }) async {
    _status = AuthStatus.loading;
    _errorMessage = null;
    notifyListeners();

    final result = await authRepository.login(
      phone: phone,
      studentCode: studentCode,
    );

    return result.when(
      onSuccess: (student) {
        _currentStudent = student;
        _status = AuthStatus.authenticated;
        notifyListeners();
        return true;
      },
      onFailure: (msg, _) {
        _errorMessage = msg;
        _status = AuthStatus.error;
        notifyListeners();
        return false;
      },
    );
  }

  Future<void> loginAsGuest() async {
    _status = AuthStatus.loading;
    notifyListeners();

    _currentStudent = const Student(
      id: 0,
      name: 'طالب زائر (معاينة تجريبية)',
      studentCode: 'GUEST',
      phone: '01000000000',
      stage: 'المرحلة الثانوية • عام ولغات',
      center: 'المنصة أونلاين',
      groupName: 'معاينة تجريبية',
      streak: 1,
      overallProgress: 10,
      motivation: 'مرحباً بك كزائر! يمكنك استكشاف خدمات المنصة والدروس المتاحة.',
    );
    _status = AuthStatus.authenticated;
    notifyListeners();
  }

  Future<void> logout() async {
    await authRepository.logout();
    _currentStudent = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }
}
