class Student {
  const Student({
    required this.id,
    required this.name,
    required this.phone,
    required this.studentCode,
    this.stage,
    this.center,
    this.groupName,
    this.appointmentSlot,
    this.avatarUrl,
    this.isLanguageTrack = false,
    this.streak = 0,
    this.overallProgress = 0,
    this.motivation,
    this.enrolledCategories = const [],
    this.enrolledCourseIds = const [],
    this.schoolName,
    this.status,
  });

  final int id;
  final String name;
  final String phone;
  final String studentCode;
  final String? stage;
  final String? center;
  final String? groupName;
  final String? appointmentSlot;
  final String? avatarUrl;
  final bool isLanguageTrack;
  final int streak;
  final int overallProgress;
  final String? motivation;
  final List<String> enrolledCategories;
  final List<int> enrolledCourseIds;
  final String? schoolName;
  final String? status;

  String get accessCode => studentCode;
  bool get isLanguages => isLanguageTrack;

  Student copyWith({
    int? id,
    String? name,
    String? phone,
    String? studentCode,
    String? stage,
    String? center,
    String? groupName,
    String? appointmentSlot,
    String? avatarUrl,
    bool? isLanguageTrack,
    int? streak,
    int? overallProgress,
    String? motivation,
    List<String>? enrolledCategories,
    List<int>? enrolledCourseIds,
    String? schoolName,
    String? status,
  }) {
    return Student(
      id: id ?? this.id,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      studentCode: studentCode ?? this.studentCode,
      stage: stage ?? this.stage,
      center: center ?? this.center,
      groupName: groupName ?? this.groupName,
      appointmentSlot: appointmentSlot ?? this.appointmentSlot,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      isLanguageTrack: isLanguageTrack ?? this.isLanguageTrack,
      streak: streak ?? this.streak,
      overallProgress: overallProgress ?? this.overallProgress,
      motivation: motivation ?? this.motivation,
      enrolledCategories: enrolledCategories ?? this.enrolledCategories,
      enrolledCourseIds: enrolledCourseIds ?? this.enrolledCourseIds,
      schoolName: schoolName ?? this.schoolName,
      status: status ?? this.status,
    );
  }
}
