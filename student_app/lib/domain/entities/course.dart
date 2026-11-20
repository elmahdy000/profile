class Lesson {
  const Lesson({
    required this.id,
    required this.title,
    required this.unitName,
    this.videoUrl,
    this.thumbnailUrl,
    this.durationMinutes,
    this.summaryUrl,
    this.homeworkTitle,
    this.homeworkId,
    this.isFree = false,
  });

  final int id;
  final String title;
  final String unitName;
  final String? videoUrl;
  final String? thumbnailUrl;
  final int? durationMinutes;
  final String? summaryUrl;
  final String? homeworkTitle;
  final int? homeworkId;
  final bool isFree;
}

class Course {
  const Course({
    required this.id,
    required this.title,
    required this.stage,
    this.stages = const [],
    this.description,
    this.thumbnailUrl,
    this.lessons = const [],
  });

  final int id;
  final String title;
  final String stage;
  final List<String> stages;
  final String? description;
  final String? thumbnailUrl;
  final List<Lesson> lessons;
}
