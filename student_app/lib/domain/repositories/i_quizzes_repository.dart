import '../../core/network/result.dart';
import '../entities/quiz.dart';

abstract interface class IQuizzesRepository {
  Future<Result<List<Quiz>>> getQuizzes({String? stage});
  Future<Result<List<Quiz>>> getHomework({String? stage});
  Future<Result<Quiz>> getQuizById(int id);
  Future<Result<int>> submitQuiz({
    required int quizId,
    required Map<int, int> selectedOptions,
    required Map<int, String> essayAnswers,
  });
}
