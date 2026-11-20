import '../../core/network/result.dart';
import '../entities/course.dart';

abstract interface class ICoursesRepository {
  Future<Result<List<Course>>> getCourses({String? stage});
  Future<Result<Course>> getCourseById(int id);
}
