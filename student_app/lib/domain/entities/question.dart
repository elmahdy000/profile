enum QuestionType { mcq, trueFalse, essay }

class Question {
  const Question({
    required this.id,
    required this.statement,
    required this.type,
    this.options = const [],
    this.correctIndex,
    this.correctAnswer,
    this.explanation,
    this.imageUrl,
  });

  final String id;
  final String statement;
  final QuestionType type;
  final List<String> options;
  final int? correctIndex;
  final String? correctAnswer;
  final String? explanation;
  final String? imageUrl;
}
