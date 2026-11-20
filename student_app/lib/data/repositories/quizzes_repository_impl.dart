import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../../core/network/result.dart';
import '../../domain/entities/question.dart';
import '../../domain/entities/quiz.dart';
import '../../domain/repositories/i_quizzes_repository.dart';
import '../models/quiz_model.dart';

class QuizzesRepositoryImpl implements IQuizzesRepository {
  QuizzesRepositoryImpl({required this.apiClient});

  final ApiClient apiClient;

  @override
  Future<Result<List<Quiz>>> getQuizzes({String? stage}) async {
    try {
      final res = await apiClient.get(ApiEndpoints.quizzes);
      return await res.when(
        onSuccess: (data) async {
          final list = _parseList(data);
          final exams = list.where((q) => !q.isHomework).toList();
          if (exams.isNotEmpty) {
            return Success(exams);
          }
          return Success(_defaultQuizzes);
        },
        onFailure: (msg, code) async => Success(_defaultQuizzes),
      );
    } catch (_) {
      return Success(_defaultQuizzes);
    }
  }

  @override
  Future<Result<List<Quiz>>> getHomework({String? stage}) async {
    try {
      final res = await apiClient.get(ApiEndpoints.quizzes);
      return await res.when(
        onSuccess: (data) async {
          final list = _parseList(data);
          final hw = list.where((q) => q.isHomework).toList();
          if (hw.isNotEmpty) {
            return Success(hw);
          }
          return Success(_defaultHomework);
        },
        onFailure: (msg, code) async => Success(_defaultHomework),
      );
    } catch (_) {
      return Success(_defaultHomework);
    }
  }

  @override
  Future<Result<Quiz>> getQuizById(int id) async {
    try {
      final res = await apiClient.get(ApiEndpoints.quizDetails(id));
      return await res.when(
        onSuccess: (data) async {
          if (data is Map<String, dynamic>) {
            return Success(QuizModel.fromJson(data));
          }
          return _findFallbackQuiz(id);
        },
        onFailure: (msg, code) async => _findFallbackQuiz(id),
      );
    } catch (_) {
      return _findFallbackQuiz(id);
    }
  }

  Result<Quiz> _findFallbackQuiz(int id) {
    final all = [..._defaultQuizzes, ..._defaultHomework];
    final found = all.where((q) => q.id == id).firstOrNull;
    if (found != null) return Success(found);
    return Success(all.first);
  }

  static final List<Quiz> _defaultQuizzes = [
    const Quiz(
      id: 1,
      title: 'الاختبار الدوري - الوحدة الأولى (أساسيات الذكاء الاصطناعي)',
      category: 'اختبار دوري',
      stage: 'الصف الأول الثانوي',
      durationMinutes: 25,
      passingScore: 50,
      isCompleted: true,
      lastScore: 94,
      isHomework: false,
      questions: [
        Question(
          id: 'q1',
          statement: 'أي من المفاهيم التالية يعتبر الهدف الرئيسي للذكاء الاصطناعي؟',
          type: QuestionType.mcq,
          options: [
            'محاكاة القدرات الذهنية البشرية في حل المشكلات',
            'زيادة سرعة معالجة الرسوميات الحاسوبية فقط',
            'استبدال المكونات المادية للحاسب الآلي',
            'تخزين أكبر قدر ممكن من الملفات النصية',
          ],
          correctIndex: 0,
          explanation: 'الذكاء الاصطناعي يهدف إلى محاكاة الذكاء والقدرات الذهنية البشرية.',
        ),
        Question(
          id: 'q2',
          statement: 'خريطة التدفق (Flowchart) تعبر عن التمثيل البياني المتسلسل لخطوات حل المشكلة.',
          type: QuestionType.trueFalse,
          options: ['صواب', 'خطأ'],
          correctIndex: 0,
          explanation: 'خريطة التدفق هي تمثيل رسومي بياني لتسلسل الخطوات المنطقية لحل المسألة.',
        ),
        Question(
          id: 'q3',
          statement: 'في لغة بايثون، تُستخدم الدالة print() لـ:',
          type: QuestionType.mcq,
          options: [
            'طباعة وإخراج النتائج على الشاشة',
            'استقبال مدخلات المستخدم من لوحة المفاتيح',
            'تعريف المتغيرات الرقمية',
            'إيقاف البرنامج مؤقتاً',
          ],
          correctIndex: 0,
          explanation: 'الدالة print() مخصصة لعرض وإخراج النصوص والبيانات في بايثون.',
        ),
      ],
    ),
    const Quiz(
      id: 2,
      title: 'اختبار التفكير الخوارزمي وهياكل البيانات',
      category: 'اختبار فصلي',
      stage: 'الصف الأول الثانوي',
      durationMinutes: 30,
      passingScore: 60,
      isCompleted: false,
      isHomework: false,
      questions: [
        Question(
          id: 'q2_1',
          statement: 'ما هو الشكل الهندسي المستخدم للتعبير عن اتخاذ القرار في خرائط التدفق؟',
          type: QuestionType.mcq,
          options: [
            'المعين (Decision / Rhombus)',
            'المستطيل (Process)',
            'متوازي الأضلاع (Input / Output)',
            'الدائرة (Connector)',
          ],
          correctIndex: 0,
          explanation: 'المعين يُستخدم دائماً للتعبير عن اتخاذ القرار أو التفرع الشرطي.',
        ),
        Question(
          id: 'q2_2',
          statement: 'المصفوفات (Arrays) في هياكل البيانات تسمح بتخزين عناصر من نفس النوع في مواقع متجاورة.',
          type: QuestionType.trueFalse,
          options: ['صواب', 'خطأ'],
          correctIndex: 0,
          explanation: 'المصفوفة هي هيكل بيانات يخزن عناصر من نفس النوع في ذاكرة متجاورة.',
        ),
      ],
    ),
    const Quiz(
      id: 3,
      title: 'المراجعة الشاملة لنصف الفصل الدراسي الأول',
      category: 'امتحان شامل',
      stage: 'الصف الأول الثانوي',
      durationMinutes: 45,
      passingScore: 70,
      isCompleted: false,
      isHomework: false,
      questions: [
        Question(
          id: 'q3_1',
          statement: 'ما هي النتيجة المنطقية للتعبير البرمجي (5 > 3) and (2 == 4)؟',
          type: QuestionType.mcq,
          options: ['False', 'True', 'Error', 'None'],
          correctIndex: 0,
          explanation: 'التعبير (5 > 3) صواب ولكن (2 == 4) خطأ، ومعامل and يتطلب تحقق الشرطين معاً.',
        ),
      ],
    ),
  ];

  static final List<Quiz> _defaultHomework = [
    const Quiz(
      id: 201,
      title: 'واجب الدرس الأول: تحليل الخوارزميات وتتبع تدفق البيانات',
      category: 'واجب منزلي',
      stage: 'الصف الأول الثانوي',
      durationMinutes: 30,
      passingScore: 50,
      isCompleted: true,
      lastScore: 100,
      isHomework: true,
      questions: [
        Question(
          id: 'hw1',
          statement: 'قم بحل المسألة: تتبع ناتج طباعة خوارزمية إيجاد حاصل جمع الأعداد الفردية من 1 إلى 9.',
          type: QuestionType.essay,
          explanation: 'المجموع = 1 + 3 + 5 + 7 + 9 = 25',
        ),
      ],
    ),
    const Quiz(
      id: 202,
      title: 'واجب الدرس الثاني: رسم خريطة تدفق لحساب درجات الطالب',
      category: 'واجب منزلي',
      stage: 'الصف الأول الثانوي',
      durationMinutes: 35,
      passingScore: 50,
      isCompleted: false,
      isHomework: true,
      questions: [
        Question(
          id: 'hw2',
          statement: 'ارسم خريطة تدفق تقرأ درجة الطالب وتطبع "ناجح" إذا كانت الدرجة >= 50 وإلا "راسب".',
          type: QuestionType.essay,
          explanation: 'إدخال الدرجة في متوازي أضلاع، ثم فحص شرط الدرجة في معين، وطباعة النتيجة.',
        ),
      ],
    ),
    const Quiz(
      id: 203,
      title: 'واجب الدرس الثالث: تطبيقات بايثون على الجمل الشرطية وحلقات التكرار',
      category: 'واجب منزلي',
      stage: 'الصف الأول الثانوي',
      durationMinutes: 40,
      passingScore: 50,
      isCompleted: false,
      isHomework: true,
      questions: [
        Question(
          id: 'hw3',
          statement: 'اكتب كود بايثون بسيط يستخدم حلقة for لطباعة مضاعفات العدد 5 حتى 50.',
          type: QuestionType.essay,
          explanation: 'for i in range(5, 55, 5): print(i)',
        ),
      ],
    ),
  ];

  @override
  Future<Result<int>> submitQuiz({
    required int quizId,
    required Map<int, int> selectedOptions,
    required Map<int, String> essayAnswers,
  }) async {
    // Convert selected options map to array for the backend
    final maxIdx = selectedOptions.keys.fold<int>(-1, (prev, curr) => curr > prev ? curr : prev);
    final answersArray = List<int>.generate(maxIdx + 1, (i) => selectedOptions[i] ?? -1);

    final detailedAnswers = essayAnswers.entries
        .map((e) => {
              'questionIndex': e.key,
              'originalIndex': e.key,
              'textAnswer': e.value,
            })
        .toList();

    final res = await apiClient.post(
      ApiEndpoints.submitQuiz(quizId),
      body: {
        'answers': answersArray,
        'detailedAnswers': detailedAnswers,
      },
    );

    return res.when(
      onSuccess: (data) {
        if (data is Map<String, dynamic>) {
          final score = data['score'] ?? data['finalScore'] ?? 0;
          return Success(score is int ? score : int.tryParse('$score') ?? 0);
        }
        return const Success(0);
      },
      onFailure: (msg, code) => Failure(msg, code),
    );
  }

  List<Quiz> _parseList(dynamic data) {
    if (data is List) {
      return data
          .whereType<Map<String, dynamic>>()
          .map(QuizModel.fromJson)
          .toList();
    } else if (data is Map && data['quizzes'] is List) {
      return (data['quizzes'] as List)
          .whereType<Map<String, dynamic>>()
          .map(QuizModel.fromJson)
          .toList();
    }
    return [];
  }
}
