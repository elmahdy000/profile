import '../../core/constants/api_endpoints.dart';

class KholasaDefinition {
  const KholasaDefinition({
    required this.term,
    required this.meaning,
    this.translation,
    this.example,
  });

  final String term;
  final String meaning;
  final String? translation;
  final String? example;

  factory KholasaDefinition.fromJson(Map<String, dynamic> json) {
    return KholasaDefinition(
      term: (json['term'] ?? json['title'] ?? '').toString(),
      meaning: (json['meaning'] ?? json['definition'] ?? json['description'] ?? '').toString(),
      translation: json['translation']?.toString(),
      example: json['example']?.toString(),
    );
  }
}

class KholasaFlashcard {
  const KholasaFlashcard({
    required this.id,
    required this.front,
    required this.back,
    this.tag = 'مصطلح',
    this.translation,
  });

  final String id;
  final String front;
  final String back;
  final String tag;
  final String? translation;

  factory KholasaFlashcard.fromJson(Map<String, dynamic> json) {
    return KholasaFlashcard(
      id: (json['id'] ?? '').toString(),
      front: (json['front'] ?? json['term'] ?? '').toString(),
      back: (json['back'] ?? json['meaning'] ?? '').toString(),
      tag: (json['tag'] ?? 'مصطلح').toString(),
      translation: json['translation']?.toString(),
    );
  }
}

class KholasaQuestion {
  const KholasaQuestion({
    required this.id,
    required this.difficulty,
    required this.type,
    required this.prompt,
    this.options = const [],
    this.explanation,
    this.points = 1,
    this.correctIndex = 0,
    this.modelAnswer,
    this.imageUrl,
    this.unit,
    this.lesson,
    this.isOfficialAssessment = false,
    this.sourceType = 'PRACTICE',
    this.assessmentCitation,
    this.isImportEnabled = true,
  });

  final int id;
  final String difficulty; // easy, medium, hard
  final String type; // mcq, true_false, essay
  final String prompt;
  final List<String> options;
  final String? explanation;
  final int points;
  final int correctIndex;
  final String? modelAnswer;
  final String? imageUrl;
  final String? unit;
  final String? lesson;
  final bool isOfficialAssessment;
  final String sourceType;
  final String? assessmentCitation;
  final bool isImportEnabled;

  bool get isAssessment =>
      isOfficialAssessment ||
      sourceType == 'OFFICIAL_ASSESSMENT' ||
      sourceType == 'ASSESSMENT_ADAPTED';

  bool get isDirectAssessment =>
      isOfficialAssessment || sourceType == 'OFFICIAL_ASSESSMENT';

  factory KholasaQuestion.fromJson(Map<String, dynamic> json, String fallbackType) {
    final rawQ = json['question'];
    final qMap = rawQ is Map<String, dynamic> ? rawQ : json;

    final rawType = (qMap['questionType'] ?? json['type'] ?? fallbackType).toString();
    final type = rawType.contains('true') || rawType == 'true_false'
        ? 'true_false'
        : (rawType == 'essay' ? 'essay' : 'mcq');

    final rawOpts = qMap['options'];
    final List<String> opts = [];
    if (rawOpts is List) {
      opts.addAll(rawOpts.map((e) => e.toString()));
    }

    final cIndex = qMap['correctIndex'] is int
        ? qMap['correctIndex'] as int
        : (json['correctIndex'] is int
            ? json['correctIndex'] as int
            : int.tryParse('${qMap['correctIndex'] ?? json['correctIndex']}') ?? 0);

    final isOff = json['is_official_assessment'] == true ||
        qMap['is_official_assessment'] == true ||
        json['isOfficialAssessment'] == true ||
        qMap['isOfficialAssessment'] == true;

    final sType = (json['source_type'] ?? qMap['source_type'] ?? json['sourceType'] ?? 'PRACTICE').toString();

    final citation = (json['assessment_citation'] ??
            qMap['assessment_citation'] ??
            json['assessmentCitation'] ??
            qMap['assessmentCitation'])
        ?.toString();

    final isEnabled = json['is_import_enabled'] != false && qMap['is_import_enabled'] != false;

    return KholasaQuestion(
      id: json['id'] is int ? json['id'] as int : int.tryParse('${json['id']}') ?? 0,
      difficulty: (json['difficulty'] ?? 'medium').toString(),
      type: type,
      prompt: (qMap['prompt'] ?? json['prompt'] ?? '').toString(),
      options: opts,
      explanation: (qMap['explanation'] ?? json['explanation'])?.toString(),
      points: qMap['points'] is int ? qMap['points'] as int : (json['points'] is int ? json['points'] as int : 1),
      correctIndex: cIndex,
      modelAnswer: (qMap['modelAnswer'] ??
              json['modelAnswer'] ??
              qMap['model_answer'] ??
              json['model_answer'])
          ?.toString(),
      imageUrl: (qMap['imageUrl'] ?? json['imageUrl'])?.toString(),
      unit: (json['unit'] ?? qMap['unit'])?.toString(),
      lesson: (json['lesson'] ?? qMap['lesson'])?.toString(),
      isOfficialAssessment: isOff,
      sourceType: sType,
      assessmentCitation: citation,
      isImportEnabled: isEnabled,
    );
  }
}

class KholasaMaterial {
  const KholasaMaterial({
    required this.id,
    required this.videoId,
    required this.unit,
    required this.lesson,
    this.videoUrl,
    this.durationMinutes = 45,
    this.definitions = const [],
    this.flashcards = const [],
    this.questions = const [],
    this.mindmapImages = const [],
    this.zatonaBullets = const [],
    this.examRules = const [],
    this.objectives = const [],
    this.mcqCount = 0,
    this.trueFalseCount = 0,
    this.essayCount = 0,
    this.pdfUrl,
  });

  final int id;
  final int videoId;
  final String unit;
  final String lesson;
  final String? videoUrl;
  final int durationMinutes;
  final List<KholasaDefinition> definitions;
  final List<KholasaFlashcard> flashcards;
  final List<KholasaQuestion> questions;
  final List<String> mindmapImages;
  final List<String> zatonaBullets;
  final List<String> examRules;
  final List<String> objectives;
  final int mcqCount;
  final int trueFalseCount;
  final int essayCount;
  final String? pdfUrl;

  factory KholasaMaterial.fromJson(Map<String, dynamic> json) {
    final summaryData = json['summaryData'] is Map<String, dynamic> ? json['summaryData'] as Map<String, dynamic> : null;

    final List<KholasaDefinition> defs = [];
    final List<String> zatona = [];
    final List<String> rules = [];
    final List<String> objs = [];

    if (summaryData != null) {
      final rawDefs = summaryData['definitions'];
      if (rawDefs is List) {
        for (final item in rawDefs) {
          if (item is Map<String, dynamic>) {
            defs.add(KholasaDefinition.fromJson(item));
          }
        }
      }
      final rawConcepts = summaryData['keyConcepts'];
      if (rawConcepts is List) {
        for (final item in rawConcepts) {
          if (item is Map<String, dynamic>) {
            defs.add(KholasaDefinition(
              term: (item['title'] ?? '').toString(),
              meaning: (item['description'] ?? '').toString(),
              translation: item['translation']?.toString(),
            ));
          }
        }
      }
      final rawTips = summaryData['examTips'];
      if (rawTips is List) {
        zatona.addAll(rawTips.map((e) => e.toString()));
      }
      final rawRules = summaryData['formulas'];
      if (rawRules is List) {
        for (final r in rawRules) {
          if (r is Map) {
            rules.add('${r['title'] ?? ''}: ${r['formula'] ?? ''}');
          } else {
            rules.add(r.toString());
          }
        }
      }
    }

    final rawObjs = json['objectives'];
    if (rawObjs is List) {
      objs.addAll(rawObjs.map((e) => e.toString()));
    }

    final List<KholasaFlashcard> cards = [];
    final rawCards = json['flashcards'];
    if (rawCards is List) {
      for (final item in rawCards) {
        if (item is Map<String, dynamic>) {
          cards.add(KholasaFlashcard.fromJson(item));
        }
      }
    }

    final List<String> images = [];
    final rawImages = json['mindmapImages'] ?? json['mindmap_images'];
    if (rawImages is List) {
      for (final item in rawImages) {
        if (item != null) {
          String url = item.toString().trim();
          if (url.startsWith('/')) {
            url = '${ApiEndpoints.baseUrl}$url';
          }
          if (url.isNotEmpty && !images.contains(url)) {
            images.add(url);
          }
        }
      }
    }

    final List<KholasaQuestion> qsts = [];
    final rawQs = json['questions'];
    if (rawQs is List) {
      for (final item in rawQs) {
        if (item is Map<String, dynamic>) {
          qsts.add(KholasaQuestion.fromJson(item, 'mcq'));
        }
      }
    }

    final videoObj = json['video'] is Map<String, dynamic> ? json['video'] as Map<String, dynamic> : null;
    final parsedVidId = json['videoId'] is int
        ? json['videoId'] as int
        : int.tryParse('${json['videoId']}') ?? (videoObj?['id'] is int ? videoObj!['id'] as int : int.tryParse('${videoObj?['id']}') ?? 0);
    final rawVUrl = (json['videoUrl'] ?? videoObj?['videoUrl'] ?? json['youtubeUrl'] ?? videoObj?['youtubeUrl'])?.toString();
    final vUrl = (rawVUrl != null && rawVUrl.isNotEmpty)
        ? rawVUrl
        : (parsedVidId > 0 ? '${ApiEndpoints.baseUrl}/api/videos/$parsedVidId/stream' : null);

    return KholasaMaterial(
      id: json['id'] is int ? json['id'] as int : int.tryParse('${json['id']}') ?? 0,
      videoId: parsedVidId,
      unit: (json['unit'] ?? '').toString(),
      lesson: (json['lesson'] ?? '').toString(),
      videoUrl: vUrl,
      durationMinutes: json['durationMinutes'] is int ? json['durationMinutes'] as int : 45,
      definitions: defs,
      flashcards: cards,
      questions: qsts,
      mindmapImages: images,
      zatonaBullets: zatona,
      examRules: rules,
      objectives: objs,
      pdfUrl: json['pdfUrl']?.toString(),
    );
  }
}

class KholasaCheckResult {
  const KholasaCheckResult({
    required this.isCorrect,
    required this.correctOption,
    this.explanation,
  });

  final bool isCorrect;
  final int correctOption;
  final String? explanation;

  factory KholasaCheckResult.fromJson(Map<String, dynamic> json) {
    return KholasaCheckResult(
      isCorrect: json['isCorrect'] == true,
      correctOption: json['correctOption'] is int ? json['correctOption'] as int : int.tryParse('${json['correctOption']}') ?? 0,
      explanation: json['explanation']?.toString(),
    );
  }
}
