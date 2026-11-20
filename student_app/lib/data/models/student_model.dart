import '../../domain/entities/student.dart';

class StudentModel extends Student {
  const StudentModel({
    required super.id,
    required super.name,
    required super.phone,
    required super.studentCode,
    super.stage,
    super.center,
    super.groupName,
    super.appointmentSlot,
    super.avatarUrl,
    super.isLanguageTrack,
    super.streak,
    super.overallProgress,
    super.motivation,
    super.enrolledCategories,
    super.enrolledCourseIds,
    super.schoolName,
    super.status,
  });

  factory StudentModel.fromJson(
    Map<String, dynamic> json, {
    int streak = 0,
    int overallProgress = 0,
    String? motivation,
  }) {
    final stageStr = (json['grade'] ?? json['stage'] ?? json['educationGrade'] ?? '').toString();
    final trackStr = (json['track'] ?? json['trackFilter'] ?? '').toString().toLowerCase();
    final isLang = json['isLanguageTrack'] == true ||
        trackStr == 'en' ||
        trackStr.contains('lang') ||
        stageStr.toLowerCase().contains('لغات') ||
        stageStr.toLowerCase().contains('languages') ||
        (json['schoolType']?.toString().toLowerCase().contains('language') ?? false);

    final rawStreak = json['streak'] ?? streak;
    final rawProgress = json['overallProgress'] ?? overallProgress;

    String? motivationText;
    if (json['motivation'] is Map) {
      motivationText = (json['motivation'] as Map)['message']?.toString();
    } else if (json['motivation'] is String) {
      motivationText = json['motivation'] as String;
    } else {
      motivationText = motivation;
    }

    final rawCats = json['enrolledCategories'];
    final List<String> cats = [];
    if (rawCats is List) {
      cats.addAll(rawCats.map((e) => e.toString()));
    }

    final rawCourseIds = json['enrolledCourseIds'];
    final List<int> courseIds = [];
    if (rawCourseIds is List) {
      for (final id in rawCourseIds) {
        if (id is int) {
          courseIds.add(id);
        } else if (id != null) {
          final parsed = int.tryParse(id.toString());
          if (parsed != null) courseIds.add(parsed);
        }
      }
    }

    final centerName = (json['centerName'] ?? json['center'] ?? json['center_name'])?.toString();
    final slot = (json['appointmentSlot'] ?? json['groupName'] ?? json['group'])?.toString();

    return StudentModel(
      id: json['id'] is int ? json['id'] as int : int.tryParse('${json['id']}') ?? 0,
      name: (json['name'] ?? json['studentName'] ?? 'طالب').toString(),
      phone: (json['phone'] ?? '').toString(),
      studentCode: (json['accessCode'] ?? json['studentCode'] ?? json['code'] ?? '').toString(),
      stage: stageStr.isNotEmpty ? stageStr : null,
      center: centerName,
      groupName: slot ?? centerName,
      appointmentSlot: slot,
      avatarUrl: json['avatarUrl']?.toString(),
      isLanguageTrack: isLang,
      streak: rawStreak is int ? rawStreak : int.tryParse('$rawStreak') ?? 0,
      overallProgress: rawProgress is int ? rawProgress : int.tryParse('$rawProgress') ?? 0,
      motivation: motivationText,
      enrolledCategories: cats,
      enrolledCourseIds: courseIds,
      schoolName: json['schoolName']?.toString(),
      status: json['status']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'phone': phone,
      'accessCode': studentCode,
      'studentCode': studentCode,
      'stage': stage,
      'grade': stage,
      'centerName': center,
      'center': center,
      'groupName': groupName,
      'appointmentSlot': appointmentSlot,
      'avatarUrl': avatarUrl,
      'isLanguageTrack': isLanguageTrack,
      'streak': streak,
      'overallProgress': overallProgress,
      'motivation': motivation,
      'enrolledCategories': enrolledCategories,
      'enrolledCourseIds': enrolledCourseIds,
      'schoolName': schoolName,
      'status': status,
    };
  }
}
