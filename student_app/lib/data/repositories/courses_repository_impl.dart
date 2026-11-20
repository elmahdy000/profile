import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../../core/network/result.dart';
import '../../domain/entities/course.dart';
import '../../domain/repositories/i_courses_repository.dart';
import '../models/course_model.dart';

class CoursesRepositoryImpl implements ICoursesRepository {
  CoursesRepositoryImpl({required this.apiClient});

  final ApiClient apiClient;

  @override
  Future<Result<List<Course>>> getCourses({String? stage}) async {
    try {
      final res = await apiClient.get(ApiEndpoints.courses);
      return await res.when(
        onSuccess: (data) async {
          List<Course> courses = [];
          if (data is List) {
            courses = data
                .whereType<Map<String, dynamic>>()
                .map(CourseModel.fromJson)
                .toList();
          } else if (data is Map && data['courses'] is List) {
            courses = (data['courses'] as List)
                .whereType<Map<String, dynamic>>()
                .map(CourseModel.fromJson)
                .toList();
          }

          // If courses don't have nested lessons yet, enrich from /api/videos
          if (courses.isNotEmpty && courses.every((c) => c.lessons.isEmpty)) {
            final vidRes = await apiClient.get(ApiEndpoints.videos);
            final videos = vidRes.dataOrNull;
            if (videos is List) {
              courses = courses.map((course) {
                final matching = videos.where((v) {
                  if (v is! Map<String, dynamic>) return false;
                  final courseId = v['courseId'];
                  final cat = (v['category'] ?? '').toString().toLowerCase();
                  return courseId == course.id || cat == course.title.toLowerCase();
                }).map((v) {
                  final rawVid = (v['youtubeUrl'] ?? v['videoUrl'])?.toString();
                  String? resolvedVid;
                  if (rawVid != null && rawVid.isNotEmpty) {
                    if (rawVid.startsWith('/')) {
                      resolvedVid = '${ApiEndpoints.baseUrl}$rawVid';
                    } else {
                      resolvedVid = rawVid;
                    }
                  }

                  final rawThumb = (v['thumbnailUrl'] ?? v['image'] ?? v['img'])?.toString();
                  String? resolvedThumb;
                  if (rawThumb != null && rawThumb.isNotEmpty) {
                    resolvedThumb = rawThumb.startsWith('/') ? '${ApiEndpoints.baseUrl}$rawThumb' : rawThumb;
                  } else if (resolvedVid != null && resolvedVid.contains('youtube.com/watch?v=')) {
                    final ytId = RegExp(r'v=([a-zA-Z0-9_-]+)').firstMatch(resolvedVid)?.group(1);
                    if (ytId != null) {
                      resolvedThumb = 'https://img.youtube.com/vi/$ytId/hqdefault.jpg';
                    }
                  }

                  final title = (v['title'] ?? '').toString();
                  var rawUnit = (v['unitName'] ?? v['unit'])?.toString().trim();
                  if (rawUnit == null || rawUnit.isEmpty) {
                    final regex = RegExp(r'(الوحدة\s+(?:الأولى|الاولى|الثانية|التانية|الثالثة|التالتة|الرابعة|الخامسة|\d+)[^:\-–|]*)');
                    final match = regex.firstMatch(title);
                    if (match != null) {
                      rawUnit = match.group(1)!.trim();
                    } else {
                      rawUnit = 'الوحدة الأولى: أساسيات المنهج';
                    }
                  }

                  // Canonical unit consolidation so all lessons are gathered together
                  final unit = _getCanonicalUnit(rawUnit, title);

                  return Lesson(
                    id: v['id'] is int ? v['id'] as int : int.tryParse('${v['id']}') ?? 0,
                    title: title,
                    unitName: unit,
                    videoUrl: resolvedVid,
                    thumbnailUrl: resolvedThumb,
                    durationMinutes: v['durationMinutes'],
                    summaryUrl: v['summaryUrl']?.toString(),
                    homeworkTitle: v['homeworkTitle']?.toString(),
                    homeworkId: v['homeworkId'],
                    isFree: v['isFree'] ?? false,
                  );
                }).where((l) {
                  final t = '${l.title} ${l.unitName}'.toLowerCase();
                  return !t.contains('c++') &&
                      !t.contains('سي بلس بلس') &&
                      !t.contains('javascript') &&
                      !t.contains('java script') &&
                      !t.contains('جافا سكريبت') &&
                      !t.contains('جافاسكريبت') &&
                      !t.contains('جافا');
                }).toList();

                return Course(
                  id: course.id,
                  title: course.title,
                  stage: course.stage,
                  stages: course.stages,
                  description: course.description,
                  thumbnailUrl: course.thumbnailUrl,
                  lessons: matching,
                );
              }).toList();
            }
          }

          if (courses.isNotEmpty) {
            return Success(_filterByStage(courses, stage));
          }
          return Success(_filterByStage(_defaultCourses, stage));
        },
        onFailure: (msg, code) => Success(_filterByStage(_defaultCourses, stage)),
      );
    } catch (_) {
      return Success(_filterByStage(_defaultCourses, stage));
    }
  }

  static bool _isCppOrJsCourse(Course c) {
    final text = '${c.title} ${c.description ?? ''} ${c.stages.join(' ')} ${c.stage}'.toLowerCase();
    return text.contains('c++') ||
        text.contains('سي بلس بلس') ||
        text.contains('سي ++') ||
        text.contains('cpp') ||
        text.contains('javascript') ||
        text.contains('java script') ||
        text.contains('جافا سكريبت') ||
        text.contains('جافاسكريبت') ||
        text.contains('جافا');
  }

  static List<Course> _filterByStage(List<Course> list, String? stage) {
    // Hide any C++ or JavaScript courses completely
    list = list.where((c) => !_isCppOrJsCourse(c)).toList();

    if (stage == null || stage.trim().isEmpty) return list;
    final normalized = stage.toLowerCase();

    final matched = list.where((c) {
      // 1. Direct match with course stages
      if (c.stages.any((st) => st.toLowerCase().contains(normalized) || normalized.contains(st.toLowerCase()))) {
        return true;
      }
      final s = c.stage.toLowerCase();
      if (s.contains(normalized) || normalized.contains(s)) {
        return true;
      }

      // 2. Second secondary / ثانية ثانوي / بكالوريا ثانية
      final isSecond = normalized.contains('ثاني') ||
          normalized.contains('تانية') ||
          normalized.contains('2') ||
          normalized.contains('second');
      if (isSecond) {
        final matches = s.contains('ثاني') ||
            s.contains('تانية') ||
            s.contains('2') ||
            c.stages.any((st) => st.contains('ثاني') || st.contains('تانية') || st.contains('2'));
        if (matches) return true;
      }

      // 3. First secondary / أولى ثانوي
      final isFirst = normalized.contains('أول') ||
          normalized.contains('اول') ||
          normalized.contains('1') ||
          normalized.contains('first');
      if (isFirst) {
        final matches = s.contains('أول') ||
            s.contains('اول') ||
            s.contains('1') ||
            c.stages.any((st) => st.contains('أول') || st.contains('اول') || st.contains('1'));
        if (matches) return true;
      }

      // 4. Third secondary / تالتة ثانوي
      final isThird = normalized.contains('ثالث') ||
          normalized.contains('تالت') ||
          normalized.contains('3') ||
          normalized.contains('third');
      if (isThird) {
        final matches = s.contains('ثالث') ||
            s.contains('تالت') ||
            s.contains('3') ||
            c.stages.any((st) => st.contains('ثالث') || st.contains('تالت') || st.contains('3'));
        if (matches) return true;
      }

      // General courses available for all
      if (s == 'عام' || c.stages.any((st) => st.contains('عام') || st.contains('الكل'))) {
        return true;
      }

      return false;
    }).toList();

    return matched.isNotEmpty ? matched : list;
  }

  static final List<Course> _defaultCourses = [
    Course(
      id: 1,
      title: 'الحاسب الآلي والذكاء الاصطناعي - الصف الأول الثانوي',
      stage: 'الصف الأول الثانوي',
      description: 'المنهج المتكامل المعتمد للحاسب الآلي والذكاء الاصطناعي والتفكير الخوارزمي مع د. محمود المهدي.',
      thumbnailUrl: null,
      lessons: const [
        Lesson(
          id: 101,
          title: 'الدرس 1-1: تقنيات ناشئة بارزة (القيادة الذاتية والحوسبة الطرفية)',
          unitName: 'الوحدة الأولى: تقنيات ناشئة بارزة',
          videoUrl: 'https://www.youtube.com/watch?v=yEpvL_8h4h8',
          thumbnailUrl: 'https://drelmahdy.com/uploads/1788289353021-928131730.png',
          durationMinutes: 45,
          summaryUrl: 'https://drelmahdy.com/memos/sec1_lesson1.pdf',
          homeworkTitle: 'واجب تقنيات القيادة الذاتية وإنترنت الأشياء',
          homeworkId: 201,
          isFree: true,
        ),
        Lesson(
          id: 102,
          title: 'الدرس 1-2: التعلم الآلي ونماذج الذكاء الاصطناعي',
          unitName: 'الوحدة الأولى: تقنيات ناشئة بارزة',
          videoUrl: 'https://www.youtube.com/watch?v=yEpvL_8h4h8',
          thumbnailUrl: 'https://drelmahdy.com/uploads/1791665329587-147804572.png',
          durationMinutes: 52,
          summaryUrl: 'https://drelmahdy.com/memos/sec1_lesson2.pdf',
          homeworkTitle: 'واجب نماذج التعلم الآلي والبيانات',
          homeworkId: 202,
          isFree: false,
        ),
        Lesson(
          id: 103,
          title: 'الدرس 1-3: أخلاقيات الذكاء الاصطناعي والتحيز الخوارزمي',
          unitName: 'الوحدة الأولى: تقنيات ناشئة بارزة',
          videoUrl: 'https://www.youtube.com/watch?v=yEpvL_8h4h8',
          thumbnailUrl: 'https://drelmahdy.com/uploads/1784745887496-716596349.png',
          durationMinutes: 48,
          summaryUrl: 'https://drelmahdy.com/memos/sec1_lesson3.pdf',
          homeworkTitle: 'واجب مبادئ أخلاقيات الذكاء الاصطناعي XAI',
          homeworkId: 203,
          isFree: false,
        ),
        Lesson(
          id: 104,
          title: 'الدرس 2-1: الحوادث الأمنية ونموذج الاستجابة السيبرانية',
          unitName: 'الوحدة الثانية: الأمن السيبراني',
          videoUrl: 'https://www.youtube.com/watch?v=yEpvL_8h4h8',
          thumbnailUrl: 'https://drelmahdy.com/uploads/1788289353021-928131730.png',
          durationMinutes: 64,
          summaryUrl: 'https://drelmahdy.com/memos/sec1_lesson4.pdf',
          homeworkTitle: 'واجب مراحل الاستجابة للحوادث الأمنية',
          homeworkId: 204,
          isFree: false,
        ),
      ],
    ),
    Course(
      id: 2,
      title: 'تراكيب البيانات وتصميم قواعد البيانات - الصف الثاني الثانوي',
      stage: 'الصف الثاني الثانوي',
      description: 'كورس احترافي لتصميم وإدارة قواعد البيانات العلائقية وشبكات الحاسب ونظم أمن المعلومات.',
      thumbnailUrl: null,
      lessons: const [
        Lesson(
          id: 201,
          title: 'الدرس الأول: نمذجة قواعد البيانات العلائقية ومخططات ERD',
          unitName: 'الوحدة الأولى: قواعد البيانات',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationMinutes: 50,
          summaryUrl: 'https://drelmahdy.com/memos/sec2_lesson1.pdf',
          homeworkTitle: 'واجب تصميم نموذج الكيانات والعلاقات',
          homeworkId: 301,
          isFree: true,
        ),
        Lesson(
          id: 202,
          title: 'الدرس الثاني: لغة الاستعلام البنيوية SQL والاستعلامات المتقدمة',
          unitName: 'الوحدة الأولى: قواعد البيانات',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationMinutes: 60,
          summaryUrl: 'https://drelmahdy.com/memos/sec2_lesson2.pdf',
          homeworkTitle: 'واجب أوامر SELECT و JOIN في SQL',
          homeworkId: 302,
          isFree: false,
        ),
        Lesson(
          id: 203,
          title: 'الدرس الثالث: بروتوكولات الإنترنت وطبقات شبكات الحاسب',
          unitName: 'الوحدة الثانية: شبكات الحاسب',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationMinutes: 48,
          summaryUrl: 'https://drelmahdy.com/memos/sec2_lesson3.pdf',
          homeworkTitle: 'واجب نماذج OSI و TCP/IP',
          homeworkId: 303,
          isFree: false,
        ),
      ],
    ),
    Course(
      id: 3,
      title: 'المراجعة النهائية ونماذج الامتحانات - الصف الثالث الثانوي',
      stage: 'الصف الثالث الثانوي',
      description: 'المراجعة الشاملة لجميع وحدات المنهج مع حل نماذج امتحانات الثانوية العامة المعتمدة.',
      thumbnailUrl: null,
      lessons: const [
        Lesson(
          id: 301,
          title: 'الدرس الأول: مراجعة ليلة الامتحان الشاملة - الجزء الأول',
          unitName: 'المراجعة المركزة',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationMinutes: 90,
          summaryUrl: 'https://drelmahdy.com/memos/sec3_exam1.pdf',
          homeworkTitle: 'امتحان تجريبي شامل (1)',
          homeworkId: 401,
          isFree: true,
        ),
        Lesson(
          id: 302,
          title: 'الدرس الثاني: حل 200 سؤال متوقع في امتحانات الثانوية',
          unitName: 'المراجعة المركزة',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          durationMinutes: 115,
          summaryUrl: 'https://drelmahdy.com/memos/sec3_exam2.pdf',
          homeworkTitle: 'امتحان تجريبي شامل (2)',
          homeworkId: 402,
          isFree: false,
        ),
      ],
    ),
  ];

  @override
  Future<Result<Course>> getCourseById(int id) async {
    final coursesRes = await getCourses();
    return coursesRes.when(
      onSuccess: (list) {
        final found = list.where((c) => c.id == id).firstOrNull;
        if (found != null) return Success(found);
        return const Failure('الكورس غير موجود');
      },
      onFailure: (msg, code) => Failure(msg, code),
    );
  }

  static String _getCanonicalUnit(String rawUnit, String title) {
    final combined = '$rawUnit $title'.trim();
    if (combined.contains('الأولى') || combined.contains('الاولى') || combined.contains('Unit 1') || combined.contains('unit 1')) {
      return 'الوحدة الأولى: أساسيات الذكاء الاصطناعي والمجتمع';
    }
    if (combined.contains('الثانية') || combined.contains('التانية') || combined.contains('Unit 2') || combined.contains('unit 2')) {
      return 'الوحدة الثانية: التعامل مع البيانات والأمن السيبراني';
    }
    if (combined.contains('الثالثة') || combined.contains('التالتة') || combined.contains('Unit 3') || combined.contains('unit 3')) {
      return 'الوحدة الثالثة: تصميم وتطوير مواقع الويب ومفاهيم البرمجة';
    }
    if (combined.contains('الرابعة') || combined.contains('الرابعه') || combined.contains('Unit 4') || combined.contains('unit 4')) {
      return 'الوحدة الرابعة: تصميم الويب والوسائط';
    }
    if (combined.contains('الخامسة') || combined.contains('الخامسه') || combined.contains('Unit 5') || combined.contains('unit 5')) {
      return 'الوحدة الخامسة: الحوسبة السحابية';
    }
    if (combined.contains('السادسة') || combined.contains('السادسه') || combined.contains('Unit 6') || combined.contains('unit 6')) {
      return 'الوحدة السادسة: مفاهيم متقدمة';
    }
    return rawUnit.trim().isNotEmpty ? rawUnit.trim() : 'الوحدة الأولى: أساسيات الذكاء الاصطناعي والمجتمع';
  }
}
