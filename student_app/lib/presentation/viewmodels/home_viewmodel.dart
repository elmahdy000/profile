import 'package:flutter/foundation.dart';
import '../../domain/entities/course.dart';
import '../../domain/entities/quiz.dart';
import '../../domain/repositories/i_courses_repository.dart';
import '../../domain/repositories/i_quizzes_repository.dart';

class HomeViewModel extends ChangeNotifier {
  HomeViewModel({
    required this.coursesRepository,
    required this.quizzesRepository,
  });

  final ICoursesRepository coursesRepository;
  final IQuizzesRepository quizzesRepository;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _error;
  String? get error => _error;

  List<Course> _recentCourses = [];
  List<Course> get recentCourses => _recentCourses;
  List<Course> get featuredCourses => _recentCourses;

  List<Quiz> _upcomingExams = [];
  List<Quiz> get upcomingExams => _upcomingExams;

  List<Quiz> _pendingHomework = [];
  List<Quiz> get pendingHomework => _pendingHomework;

  Future<void> loadDashboardData({String? stage}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final coursesRes = await coursesRepository.getCourses(stage: stage);
      final examsRes = await quizzesRepository.getQuizzes(stage: stage);
      final hwRes = await quizzesRepository.getHomework(stage: stage);

      _recentCourses = coursesRes.dataOrNull ?? [];
      _upcomingExams = examsRes.dataOrNull ?? [];
      _pendingHomework = hwRes.dataOrNull ?? [];
    } catch (e) {
      _error = 'حدث خطأ أثناء تحميل البيانات: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
