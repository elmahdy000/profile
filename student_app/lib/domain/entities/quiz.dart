import 'question.dart';

class Quiz {
  const Quiz({
    required this.id,
    required this.title,
    required this.category,
    required this.stage,
    this.durationMinutes,
    this.passingScore = 50,
    this.questions = const [],
    this.isCompleted = false,
    this.lastScore,
    this.isHomework = false,
  });

  final int id;
  final String title;
  final String category;
  final String stage;
  final int? durationMinutes;
  final int passingScore;
  final List<Question> questions;
  final bool isCompleted;
  final int? lastScore;
  final bool isHomework;

  int get totalQuestions => questions.length;
}
