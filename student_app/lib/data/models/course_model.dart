import '../../core/constants/api_endpoints.dart';
import '../../domain/entities/course.dart';

class CourseModel extends Course {
  const CourseModel({
    required super.id,
    required super.title,
    required super.stage,
    super.stages,
    super.description,
    super.thumbnailUrl,
    super.lessons,
  });

  factory CourseModel.fromJson(Map<String, dynamic> json) {
    final rawLessons = json['lessons'] as List? ?? [];
    final lessons = rawLessons.map((l) {
      if (l is! Map<String, dynamic>) {
        return const Lesson(id: 0, title: '', unitName: '');
      }
      final rawVid = (l['youtubeUrl'] ?? l['videoUrl'])?.toString();
      String? resolvedVid;
      if (rawVid != null && rawVid.isNotEmpty) {
        if (rawVid.startsWith('/')) {
          resolvedVid = '${ApiEndpoints.baseUrl}$rawVid';
        } else {
          resolvedVid = rawVid;
        }
      }

      final rawImg = (l['thumbnailUrl'] ?? l['image'] ?? l['img'])?.toString();
      String? resolvedThumb;
      if (rawImg != null && rawImg.isNotEmpty) {
        if (rawImg.startsWith('/')) {
          resolvedThumb = '${ApiEndpoints.baseUrl}$rawImg';
        } else {
          resolvedThumb = rawImg;
        }
      }

      final title = (l['title'] ?? '').toString();
      final rawUnit = (l['unitName'] ?? l['unit'] ?? 'الوحدة الأولى').toString();
      final unit = canonicalUnit(rawUnit, title);

      return Lesson(
        id: l['id'] is int ? l['id'] : int.tryParse('${l['id']}') ?? 0,
        title: title,
        unitName: unit,
        videoUrl: resolvedVid,
        thumbnailUrl: resolvedThumb,
        durationMinutes: l['durationMinutes'],
        summaryUrl: l['summaryUrl']?.toString(),
        homeworkTitle: l['homeworkTitle']?.toString(),
        homeworkId: l['homeworkId'],
        isFree: l['isFree'] ?? false,
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

    final rawStages = json['stages'];
    final List<String> stagesList = [];
    if (rawStages is List) {
      stagesList.addAll(rawStages.map((e) => e.toString()));
    }

    final rawImg = (json['img'] ?? json['thumbnailUrl'] ?? json['image'])?.toString();
    String? thumb;
    if (rawImg != null && rawImg.isNotEmpty) {
      if (rawImg.startsWith('/')) {
        thumb = '${ApiEndpoints.baseUrl}$rawImg';
      } else {
        thumb = rawImg;
      }
    }

    final stage = (json['stage'] ?? json['grade'] ?? (stagesList.isNotEmpty ? stagesList.first : 'عام')).toString();

    final desc = (json['description'] ?? json['age'] ?? json['level'] ?? '').toString();

    return CourseModel(
      id: json['id'] is int ? json['id'] : int.tryParse('${json['id']}') ?? 0,
      title: (json['title'] ?? json['courseName'] ?? '').toString(),
      stage: stage,
      stages: stagesList,
      description: desc.isNotEmpty ? desc : null,
      thumbnailUrl: thumb,
      lessons: lessons,
    );
  }

  static String canonicalUnit(String rawUnit, String title) {
    final combined = '$rawUnit $title'.trim();
    if (combined.contains('الأولى') || combined.contains('الاولى') || combined.contains('Unit 1') || combined.contains('unit 1')) {
      return 'الوحدة الأولى: الذكاء الاصطناعي والمجتمع';
    }
    if (combined.contains('الثانية') || combined.contains('التانية') || combined.contains('Unit 2') || combined.contains('unit 2')) {
      return 'الوحدة الثانية: الأمن السيبراني والتشفير';
    }
    if (combined.contains('الثالثة') || combined.contains('التالتة') || combined.contains('Unit 3') || combined.contains('unit 3')) {
      return 'الوحدة الثالثة: تطبيقات الويب';
    }
    if (combined.contains('الرابعة') || combined.contains('الرابعه') || combined.contains('Unit 4') || combined.contains('unit 4')) {
      return 'الوحدة الرابعة: أنواع الوسائط وخصائصها';
    }
    if (combined.contains('الخامسة') || combined.contains('الخامسه') || combined.contains('Unit 5') || combined.contains('unit 5')) {
      return 'الوحدة الخامسة: الحوسبة السحابية';
    }
    if (combined.contains('السادسة') || combined.contains('السادسه') || combined.contains('Unit 6') || combined.contains('unit 6')) {
      return 'الوحدة السادسة: مفاهيم متقدمة';
    }
    return rawUnit.trim().isNotEmpty ? rawUnit.trim() : 'الوحدة الأولى: أساسيات المنهج';
  }
}
