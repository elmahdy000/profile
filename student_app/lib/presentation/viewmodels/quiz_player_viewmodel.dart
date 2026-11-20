import 'dart:async';
import 'package:flutter/foundation.dart';
import '../../domain/entities/quiz.dart';
import '../../domain/repositories/i_quizzes_repository.dart';

class QuizPlayerViewModel extends ChangeNotifier {
  QuizPlayerViewModel({
    required this.quiz,
    required this.quizzesRepository,
  }) {
    _initQuiz();
  }

  final Quiz quiz;
  final IQuizzesRepository quizzesRepository;

  bool get isHomework => quiz.isHomework;

  int _currentIndex = 0;
  int get currentIndex => _currentIndex;

  final Map<int, int> _selectedOptions = {};
  Map<int, int> get selectedOptions => _selectedOptions;

  final Map<int, String> _essayAnswers = {};
  Map<int, String> get essayAnswers => _essayAnswers;

  int? _secondsRemaining;
  int? get secondsRemaining => _secondsRemaining;
  Timer? _timer;

  bool _isSubmitting = false;
  bool get isSubmitting => _isSubmitting;

  bool _isFinished = false;
  bool get isFinished => _isFinished;

  int? _score;
  int? get score => _score;

  String? _error;
  String? get error => _error;

  void _initQuiz() {
    if (!isHomework && quiz.durationMinutes != null && quiz.durationMinutes! > 0) {
      _secondsRemaining = quiz.durationMinutes! * 60;
      _timer = Timer.periodic(const Duration(seconds: 1), (t) {
        if (_secondsRemaining != null && _secondsRemaining! > 0) {
          _secondsRemaining = _secondsRemaining! - 1;
          notifyListeners();
        } else {
          t.cancel();
          submitQuiz();
        }
      });
    }
  }

  void selectOption(int questionIndex, int optionIndex) {
    if (_isFinished) return;
    _selectedOptions[questionIndex] = optionIndex;
    notifyListeners();
  }

  void updateEssayAnswer(int questionIndex, String text) {
    if (_isFinished || isHomework) return;
    _essayAnswers[questionIndex] = text;
    notifyListeners();
  }

  void goToQuestion(int index) {
    if (index >= 0 && index < quiz.questions.length) {
      _currentIndex = index;
      notifyListeners();
    }
  }

  void nextQuestion() {
    if (_currentIndex < quiz.questions.length - 1) {
      _currentIndex++;
      notifyListeners();
    }
  }

  void previousQuestion() {
    if (_currentIndex > 0) {
      _currentIndex--;
      notifyListeners();
    }
  }

  Future<void> submitQuiz() async {
    if (_isSubmitting || _isFinished) return;

    _timer?.cancel();
    _isSubmitting = true;
    _error = null;
    notifyListeners();

    final result = await quizzesRepository.submitQuiz(
      quizId: quiz.id,
      selectedOptions: _selectedOptions,
      essayAnswers: _essayAnswers,
    );

    result.when(
      onSuccess: (finalScore) {
        _score = finalScore;
        _isFinished = true;
        _isSubmitting = false;
      },
      onFailure: (msg, _) {
        _error = msg;
        _isSubmitting = false;
      },
    );
    notifyListeners();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}
