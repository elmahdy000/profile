import '../../domain/entities/question.dart';
import '../../domain/entities/quiz.dart';

class QuizModel extends Quiz {
  const QuizModel({
    required super.id,
    required super.title,
    required super.category,
    required super.stage,
    super.durationMinutes,
    super.passingScore,
    super.questions,
    super.isCompleted,
    super.lastScore,
    super.isHomework,
  });

  factory QuizModel.fromJson(Map<String, dynamic> json) {
    final title = (json['title'] ?? '').toString();
    final category = (json['category'] ?? 'عام').toString();
    final scope = (json['scope'] ?? '').toString();

    // Homework detection rule:
    final isHw = category == 'واجب' ||
        category.toLowerCase() == 'homework' ||
        scope == 'homework' ||
        title.contains('واجب') ||
        title.toLowerCase().contains('homework');

    final rawQuestions = json['questions'] as List? ?? [];
    final parsedQuestions = rawQuestions.map((q) {
      if (q is! Map<String, dynamic>) {
        return const Question(
          id: '',
          statement: '',
          type: QuestionType.mcq,
        );
      }

      final typeStr = (q['questionType'] ?? q['type'] ?? 'MCQ').toString().toUpperCase();
      final qType = switch (typeStr) {
        'TRUE_FALSE' || 'TF' => QuestionType.trueFalse,
        'ESSAY' => QuestionType.essay,
        _ => QuestionType.mcq,
      };

      final rawOpts = q['options'];
      final List<String> opts = [];
      if (rawOpts is List) {
        for (final opt in rawOpts) {
          if (opt is String) {
            opts.add(opt);
          } else if (opt is Map && opt['text'] != null) {
            opts.add(opt['text'].toString());
          }
        }
      }

      return Question(
        id: (q['id'] ?? '').toString(),
        statement: (q['prompt'] ?? q['statement'] ?? q['question'] ?? '').toString(),
        type: qType,
        options: opts,
        correctIndex: q['correctOption'] ?? q['correctIndex'],
        correctAnswer: (q['correctAnswer'] ?? q['answer'] ?? q['modelAnswer'])?.toString(),
        explanation: q['explanation']?.toString(),
        imageUrl: q['imageUrl']?.toString(),
      );
    }).toList();

    return QuizModel(
      id: json['id'] is int ? json['id'] : int.tryParse('${json['id']}') ?? 0,
      title: title,
      category: category,
      stage: (json['stage'] ?? 'عام').toString(),
      durationMinutes: json['durationMinutes'] ?? json['duration'],
      passingScore: json['passingScore'] ?? 50,
      questions: parsedQuestions,
      isCompleted: json['attemptsUsed'] != null && (json['attemptsUsed'] as int) > 0,
      lastScore: json['lastScore'],
      isHomework: isHw,
    );
  }
}
