import 'package:flutter/foundation.dart';
import '../../domain/entities/course.dart';
import '../../domain/repositories/i_courses_repository.dart';

class CoursesViewModel extends ChangeNotifier {
  CoursesViewModel({required this.coursesRepository});

  final ICoursesRepository coursesRepository;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _error;
  String? get error => _error;

  List<Course> _courses = [];
  List<Course> get courses => _courses;

  Course? _selectedCourse;
  Course? get selectedCourse => _selectedCourse;

  Future<void> loadCourses({String? stage}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await coursesRepository.getCourses(stage: stage);
    result.when(
      onSuccess: (data) {
        _courses = data;
        _isLoading = false;
      },
      onFailure: (msg, _) {
        _error = msg;
        _isLoading = false;
      },
    );
    notifyListeners();
  }

  Future<void> selectCourse(int id) async {
    _isLoading = true;
    notifyListeners();

    final result = await coursesRepository.getCourseById(id);
    result.when(
      onSuccess: (course) {
        _selectedCourse = course;
        _isLoading = false;
      },
      onFailure: (msg, _) {
        _error = msg;
        _isLoading = false;
      },
    );
    notifyListeners();
  }
}
