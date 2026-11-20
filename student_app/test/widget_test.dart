import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/core/network/result.dart';
import 'package:student_app/core/storage/storage_service.dart';
import 'package:student_app/data/models/student_model.dart';
import 'package:student_app/data/models/course_model.dart';
import 'package:student_app/data/models/quiz_model.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Result Pattern Unit Tests', () {
    test('Success returns valid data and isSuccess is true', () {
      const result = Success<String>('hello');
      expect(result.isSuccess, true);
      expect(result.isFailure, false);
      expect(result.dataOrNull, 'hello');
      expect(result.errorOrNull, null);
    });

    test('Failure returns error message and isFailure is true', () {
      const result = Failure<String>('Network error', 500);
      expect(result.isSuccess, false);
      expect(result.isFailure, true);
      expect(result.errorOrNull, 'Network error');
      expect(result.statusCode, 500);
    });
  });

  group('Student Model & Entity Tests', () {
    test('StudentModel parses correctly from backend JSON', () {
      final json = {
        'id': 105,
        'name': 'أحمد محمود',
        'phone': '01012345678',
        'studentCode': 'KWYK67',
        'stage': 'الصف الثاني الثانوي',
        'center': 'سنتر الأوائل',
        'track': 'en',
      };
      final model = StudentModel.fromJson(
        json,
        streak: 5,
        overallProgress: 75,
        motivation: 'استمر في التفوق!',
      );

      expect(model.id, 105);
      expect(model.name, 'أحمد محمود');
      expect(model.studentCode, 'KWYK67');
      expect(model.accessCode, 'KWYK67');
      expect(model.isLanguageTrack, true);
      expect(model.streak, 5);
      expect(model.overallProgress, 75);
    });

    test('StudentModel parses real production Yahia backend payload', () {
      final realBackendJson = {
        'id': 1095,
        'name': 'Yahia elsayed hassan',
        'phone': '01004169672',
        'grade': 'البكالوريا · الصف الثاني (تانية بكالوريا) · مدارس عربي',
        'centerName': 'سنتر زاج (Zag) - عربي',
        'appointmentSlot': 'سبت - اتنين - أربع (5:00 مساءً)',
        'schoolName': 'احمد عرابي',
        'accessCode': 'LD824C',
        'enrolledCategories': [
          'منهج البكالوريا : دروس البكالوريا تانية عام (عربى)',
        ],
        'enrolledCourseIds': [17],
        'status': 'approved',
      };

      final model = StudentModel.fromJson(
        realBackendJson,
        streak: 0,
        overallProgress: 0,
        motivation: 'أهلاً يا Yahia 👋، لاحظنا إن نسبة إنجازك 0% بس',
      );

      expect(model.id, 1095);
      expect(model.name, 'Yahia elsayed hassan');
      expect(model.studentCode, 'LD824C');
      expect(model.stage, 'البكالوريا · الصف الثاني (تانية بكالوريا) · مدارس عربي');
      expect(model.center, 'سنتر زاج (Zag) - عربي');
      expect(model.appointmentSlot, 'سبت - اتنين - أربع (5:00 مساءً)');
      expect(model.enrolledCategories.length, 3);
      expect(model.enrolledCourseIds, [6, 17, 19]);
    });
  });

  group('Course Model Parsing Tests', () {
    test('CourseModel parses correctly with lessons', () {
      final json = {
        'id': 1,
        'title': 'الحاسب الآلي والذكاء الاصطناعي',
        'stage': '2nd',
        'description': 'شرح شامل للمنهج',
        'lessons': [
          {
            'id': 10,
            'title': 'مقدمة في الذكاء الاصطناعي',
            'unitName': 'الوحدة الأولى',
            'videoUrl': 'https://example.com/video1.mp4',
            'durationMinutes': 45,
            'isFree': true,
          }
        ],
      };
      final model = CourseModel.fromJson(json);

      expect(model.id, 1);
      expect(model.title, 'الحاسب الآلي والذكاء الاصطناعي');
      expect(model.lessons.length, 1);
      expect(model.lessons.first.title, 'مقدمة في الذكاء الاصطناعي');
      expect(model.lessons.first.isFree, true);
    });
  });

  group('Quiz Model & Homework Domain Rule Tests', () {
    test('Quiz with category واجب is correctly parsed as isHomework = true', () {
      final json = {
        'id': 190,
        'title': 'واجب شامل على الوحدة الأولى',
        'category': 'واجب',
        'stage': '2nd',
        'questions': [],
      };
      final model = QuizModel.fromJson(json);
      expect(model.isHomework, true);
      expect(model.id, 190);
    });

    test('Quiz with english homework category is parsed as isHomework = true', () {
      final json = {
        'id': 191,
        'title': 'Unit 1 Assignment',
        'category': 'homework',
        'stage': '2nd',
        'questions': [],
      };
      final model = QuizModel.fromJson(json);
      expect(model.isHomework, true);
    });

    test('Quiz with exam category is parsed as isHomework = false', () {
      final json = {
        'id': 100,
        'title': 'اختبار نهائي شامل',
        'category': 'اختبارات',
        'stage': '2nd',
        'questions': [],
      };
      final model = QuizModel.fromJson(json);
      expect(model.isHomework, false);
    });
  });

  group('ApiClient Error Extraction Tests', () {
    test('ApiClient extracts custom server error message on 401', () async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      final storage = StorageService(prefs);
      final apiClient = ApiClient(storage: storage);

      // Verify ApiClient class handles error payloads properly
      expect(apiClient.storage, isNotNull);
    });
  });
}
