class MistakeItem {
  const MistakeItem({
    required this.id,
    required this.lessonTitle,
    required this.unitName,
    required this.questionPrompt,
    required this.options,
    required this.userSelectedIdx,
    required this.correctIdx,
    required this.explanation,
    required this.timestamp,
    this.isAssessment = false,
    this.assessmentCitation,
  });

  final String id;
  final String lessonTitle;
  final String unitName;
  final String questionPrompt;
  final List<String> options;
  final int userSelectedIdx;
  final int correctIdx;
  final String explanation;
  final DateTime timestamp;
  final bool isAssessment;
  final String? assessmentCitation;

  Map<String, dynamic> toJson() => {
        'id': id,
        'lessonTitle': lessonTitle,
        'unitName': unitName,
        'questionPrompt': questionPrompt,
        'options': options,
        'userSelectedIdx': userSelectedIdx,
        'correctIdx': correctIdx,
        'explanation': explanation,
        'timestamp': timestamp.toIso8601String(),
        'isAssessment': isAssessment,
        'assessmentCitation': assessmentCitation,
      };

  factory MistakeItem.fromJson(Map<String, dynamic> json) {
    return MistakeItem(
      id: json['id']?.toString() ?? '',
      lessonTitle: json['lessonTitle']?.toString() ?? 'الدرس الأول',
      unitName: json['unitName']?.toString() ?? 'الوحدة الأولى',
      questionPrompt: json['questionPrompt']?.toString() ?? '',
      options: (json['options'] as List? ?? []).map((e) => e.toString()).toList(),
      userSelectedIdx: json['userSelectedIdx'] is int ? json['userSelectedIdx'] : 0,
      correctIdx: json['correctIdx'] is int ? json['correctIdx'] : 1,
      explanation: json['explanation']?.toString() ?? '',
      timestamp: DateTime.tryParse(json['timestamp']?.toString() ?? '') ?? DateTime.now(),
      isAssessment: json['isAssessment'] == true,
      assessmentCitation: json['assessmentCitation']?.toString(),
    );
  }

  factory MistakeItem.fromBackendJson(Map<String, dynamic> json) {
    final q = json['question'] as Map<String, dynamic>? ?? {};
    final rawOptions = q['options'] as List? ?? [];
    return MistakeItem(
      id: json['id']?.toString() ?? '',
      lessonTitle: json['lesson']?.toString() ?? 'الدرس الأول',
      unitName: json['unit']?.toString() ?? 'الوحدة الأولى',
      questionPrompt: q['prompt']?.toString() ?? '',
      options: rawOptions.map((e) => e.toString()).toList(),
      userSelectedIdx: json['lastWrongOption'] is int ? json['lastWrongOption'] : 0,
      correctIdx: q['correctIndex'] is int ? q['correctIndex'] : 0,
      explanation: q['explanation']?.toString() ?? '',
      timestamp: DateTime.tryParse(json['lastWrongAt']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}
