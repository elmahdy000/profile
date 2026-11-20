import 'package:flutter/foundation.dart';
import '../../domain/entities/quiz.dart';
import '../../domain/repositories/i_quizzes_repository.dart';

class HomeworkViewModel extends ChangeNotifier {
  HomeworkViewModel({required this.quizzesRepository});

  final IQuizzesRepository quizzesRepository;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _error;
  String? get error => _error;

  List<Quiz> _homeworkList = [];
  List<Quiz> get homeworkList => _homeworkList;

  Future<void> loadHomework({String? stage}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await quizzesRepository.getHomework(stage: stage);
    result.when(
      onSuccess: (data) {
        _homeworkList = data;
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
