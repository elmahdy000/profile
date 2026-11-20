import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import '../../domain/entities/kholasa.dart';

class CurriculumBankData {
  static List<KholasaQuestion> allQuestions = [];
  static Map<String, List<KholasaQuestion>> questionsByLesson = {};
  static Map<String, List<KholasaQuestion>> questionsByUnit = {};
  static List<String> units = [];

  // Model Definitions from Egyptian Ministry Curriculum (Arabic Schools)
  static List<KholasaDefinition> allDefinitions = [];
  static Map<String, List<KholasaDefinition>> definitionsByLesson = {};
  static Map<String, List<KholasaDefinition>> definitionsByUnit = {};

  // Languages Schools Model Definitions (English)
  static List<KholasaDefinition> allLanguagesDefinitions = [];
  static Map<String, List<KholasaDefinition>> languagesDefinitionsByLesson = {};
  static Map<String, List<KholasaDefinition>> languagesDefinitionsByUnit = {};

  static bool isLoaded = false;

  static bool isExcluded(Map<String, dynamic> item) {
    final text = [
      item['prompt']?.toString() ?? '',
      item['unit']?.toString() ?? '',
      item['lesson']?.toString() ?? '',
      if (item['options'] is List) ...(item['options'] as List).map((e) => e.toString()),
      item['model_answer']?.toString() ?? '',
      item['explanation']?.toString() ?? '',
    ].join(' ').toLowerCase();

    // Only filter legacy out-of-curriculum C++ if present.
    // Preserves all modern web technologies (HTML, CSS, JavaScript, React, Next.js) in Unit 3 Lesson 3.
    return text.contains('c++') ||
        text.contains('سي بلس بلس') ||
        text.contains('سي ++');
  }

  /// Loads the full curriculum questions from local JSON asset in milliseconds
  static Future<void> load() async {
    if (isLoaded && allQuestions.isNotEmpty) return;
    try {
      final jsonString = await rootBundle.loadString('assets/data/curriculum_bank.json');
      final list = jsonDecode(jsonString);
      if (list is List) {
        final all = <KholasaQuestion>[];
        final byLesson = <String, List<KholasaQuestion>>{};
        final byUnit = <String, List<KholasaQuestion>>{};

        for (final item in list) {
          if (item is Map<String, dynamic>) {
            if (isExcluded(item)) continue;
            if (item['is_import_enabled'] == false) continue;
            final lesson = (item['lesson'] ?? '').toString().trim();
            final unit = (item['unit'] ?? '').toString().trim();
            final q = KholasaQuestion.fromJson(item, 'mcq');
            all.add(q);

            if (lesson.isNotEmpty) {
              byLesson.putIfAbsent(lesson, () => []).add(q);
            }
            if (unit.isNotEmpty) {
              byUnit.putIfAbsent(unit, () => []).add(q);
            }
          }
        }
        allQuestions = all;
        questionsByLesson = byLesson;
        questionsByUnit = byUnit;
        units = byUnit.keys.toList();
        isLoaded = true;
        debugPrint('CurriculumBankData: Loaded ${all.length} questions across ${byUnit.length} units and ${byLesson.length} lessons.');
      }

      // Load 162 Model Definitions from Egyptian Ministry Curriculum
      try {
        final defsString = await rootBundle.loadString('assets/data/all_arabic_definitions.json');
        final defsJson = jsonDecode(defsString);
        if (defsJson is Map<String, dynamic> && defsJson['units'] is List) {
          final allDefList = <KholasaDefinition>[];
          final byLessonMap = <String, List<KholasaDefinition>>{};
          final byUnitMap = <String, List<KholasaDefinition>>{};

          for (final u in defsJson['units']) {
            if (u is! Map<String, dynamic>) continue;
            final unitTitle = (u['unit_title'] ?? '').toString();
            final lessons = u['lessons'] as List? ?? [];
            for (final l in lessons) {
              if (l is! Map<String, dynamic>) continue;
              final lessonTitle = (l['lesson_title'] ?? '').toString();
              final rawDefs = l['definitions'] as List? ?? [];
              final lessonDefs = <KholasaDefinition>[];
              for (final d in rawDefs) {
                if (d is! Map<String, dynamic>) continue;
                final term = (d['term'] ?? '').toString().trim();
                final meaning = (d['current_definition'] ?? d['updated_definition'] ?? '').toString().trim();
                if (term.isNotEmpty && meaning.isNotEmpty) {
                  final kDef = KholasaDefinition(term: term, meaning: meaning);
                  lessonDefs.add(kDef);
                  allDefList.add(kDef);
                }
              }
              if (lessonDefs.isNotEmpty) {
                byLessonMap[lessonTitle] = lessonDefs;
                byUnitMap.putIfAbsent(unitTitle, () => []).addAll(lessonDefs);
              }
            }
          }
          allDefinitions = allDefList;
          definitionsByLesson = byLessonMap;
          definitionsByUnit = byUnitMap;
          debugPrint('CurriculumBankData: Loaded ${allDefList.length} approved Arabic model definitions.');
        }
      } catch (de) {
        debugPrint('CurriculumBankData definitions load warning: $de');
      }

      // Load 123 Languages Schools Model Definitions (English)
      try {
        final langDefsString = await rootBundle.loadString('assets/data/all_languages_definitions.json');
        final langDefsJson = jsonDecode(langDefsString);
        if (langDefsJson is Map<String, dynamic> && langDefsJson['units'] is List) {
          final allLangDefList = <KholasaDefinition>[];
          final byLessonMap = <String, List<KholasaDefinition>>{};
          final byUnitMap = <String, List<KholasaDefinition>>{};

          for (final u in langDefsJson['units']) {
            if (u is! Map<String, dynamic>) continue;
            final unitTitleEn = (u['unit_title_en'] ?? '').toString();
            final unitTitleAr = (u['unit_title_ar'] ?? '').toString();
            final lessons = u['lessons'] as List? ?? [];
            for (final l in lessons) {
              if (l is! Map<String, dynamic>) continue;
              final lessonTitleEn = (l['lesson_title_en'] ?? '').toString();
              final lessonTitleAr = (l['lesson_title_ar'] ?? '').toString();
              final rawDefs = l['definitions'] as List? ?? [];
              final lessonDefs = <KholasaDefinition>[];
              for (final d in rawDefs) {
                if (d is! Map<String, dynamic>) continue;
                final term = (d['term_en'] ?? d['official_term_en'] ?? d['term'] ?? '').toString().trim();
                final meaning = (d['updated_definition_en'] ?? d['current_definition_en'] ?? d['definition_en'] ?? '').toString().trim();
                if (term.isNotEmpty && meaning.isNotEmpty) {
                  final kDef = KholasaDefinition(term: term, meaning: meaning);
                  lessonDefs.add(kDef);
                  allLangDefList.add(kDef);
                }
              }
              if (lessonDefs.isNotEmpty) {
                if (lessonTitleEn.isNotEmpty) byLessonMap[lessonTitleEn] = lessonDefs;
                if (lessonTitleAr.isNotEmpty) byLessonMap[lessonTitleAr] = lessonDefs;
                if (unitTitleEn.isNotEmpty) byUnitMap.putIfAbsent(unitTitleEn, () => []).addAll(lessonDefs);
                if (unitTitleAr.isNotEmpty) byUnitMap.putIfAbsent(unitTitleAr, () => []).addAll(lessonDefs);
              }
            }
          }
          allLanguagesDefinitions = allLangDefList;
          languagesDefinitionsByLesson = byLessonMap;
          languagesDefinitionsByUnit = byUnitMap;
          debugPrint('CurriculumBankData: Loaded ${allLangDefList.length} approved Languages model definitions.');
        }
      } catch (le) {
        debugPrint('CurriculumBankData languages definitions load warning: $le');
      }
    } catch (e) {
      debugPrint('CurriculumBankData load error: $e');
    }
  }

  /// Returns unique lessons for a given unit
  static List<String> getLessonsForUnit(String unit) {
    final list = questionsByUnit[unit] ?? [];
    final set = <String>{};
    for (final q in list) {
      if (q.lesson != null && q.lesson!.isNotEmpty) {
        set.add(q.lesson!);
      }
    }
    return set.toList();
  }

  /// Filter questions by unit, lesson, and type
  static List<KholasaQuestion> filterQuestions({
    String? unit,
    String? lesson,
    String? type,
  }) {
    List<KholasaQuestion> list;
    if (lesson != null && lesson.isNotEmpty && lesson != 'الكل') {
      list = questionsByLesson[lesson] ?? [];
    } else if (unit != null && unit.isNotEmpty && unit != 'الكل') {
      list = questionsByUnit[unit] ?? [];
    } else {
      list = allQuestions;
    }

    if (type != null && type.isNotEmpty && type != 'all') {
      return list.where((q) => q.type == type).toList();
    }
    return list;
  }

  /// Get questions for a lesson with smart fallback
  static List<KholasaQuestion> getQuestionsForLesson(String lessonTitle) {
    final direct = questionsByLesson[lessonTitle];
    if (direct != null && direct.isNotEmpty) return direct;

    // Fuzzy matching by keywords
    for (final entry in questionsByLesson.entries) {
      if (lessonTitle.contains('الأول') && entry.key.contains('الأول') && !entry.key.contains('الوحدة')) {
        if (entry.key.contains('تطور') && lessonTitle.contains('تطور')) return entry.value;
        if (entry.key.contains('التشفير') && lessonTitle.contains('التشفير')) return entry.value;
        if (entry.key.contains('البنية') && lessonTitle.contains('البنية')) return entry.value;
      }
      if (lessonTitle.contains('الثاني') && entry.key.contains('الثاني')) {
        if (entry.key.contains('الذكاء') && lessonTitle.contains('الذكاء')) return entry.value;
        if (entry.key.contains('البيانات') && lessonTitle.contains('البيانات')) return entry.value;
        if (entry.key.contains('الاتصال') && lessonTitle.contains('الاتصال')) return entry.value;
      }
      if (lessonTitle.contains('الثالث') && entry.key.contains('الثالث')) {
        if (entry.key.contains('حياتنا') && lessonTitle.contains('حياتنا')) return entry.value;
        if (entry.key.contains('الحوادث') && lessonTitle.contains('الحوادث')) return entry.value;
        if (entry.key.contains('الواجهة') && lessonTitle.contains('الواجهة')) return entry.value;
      }
      if (lessonTitle.contains('الرابع') && entry.key.contains('الرابع')) {
        if (entry.key.contains('الأخلاقية') && lessonTitle.contains('الأخلاقية')) return entry.value;
      }
      if (entry.key.contains(lessonTitle) || lessonTitle.contains(entry.key)) {
        return entry.value;
      }
    }
    return const [];
  }

  /// Get model definitions for a lesson with robust keyword matching
  static List<KholasaDefinition> getDefinitionsForLesson(String lessonTitle, {bool isLanguages = false}) {
    final targetMap = isLanguages && languagesDefinitionsByLesson.isNotEmpty
        ? languagesDefinitionsByLesson
        : definitionsByLesson;

    final direct = targetMap[lessonTitle];
    if (direct != null && direct.isNotEmpty) return direct;

    for (final entry in targetMap.entries) {
      if (entry.key == lessonTitle || entry.key.contains(lessonTitle) || lessonTitle.contains(entry.key)) {
        return entry.value;
      }
      if (lessonTitle.contains('تطور') && entry.key.contains('تطور')) return entry.value;
      if (lessonTitle.contains('الاصطناعي') || lessonTitle.contains('الاصطناعي')) {
        if (lessonTitle.contains('يعمل') && entry.key.contains('يعمل')) return entry.value;
        if (lessonTitle.contains('اليومية') && entry.key.contains('اليومية')) return entry.value;
        if (lessonTitle.contains('الأخلاقية') && entry.key.contains('الأخلاقية')) return entry.value;
      }
      if (lessonTitle.contains('التشفير') && entry.key.contains('التشفير')) return entry.value;
      if (lessonTitle.contains('أمن الشبكات') && entry.key.contains('أمن الشبكات')) return entry.value;
      if (lessonTitle.contains('الحوادث') && entry.key.contains('الحوادث')) return entry.value;
      if (lessonTitle.contains('البنية') && entry.key.contains('البنية')) return entry.value;
      if (lessonTitle.contains('الاتصال') && entry.key.contains('الاتصال')) return entry.value;
      if (lessonTitle.contains('الواجهة') && entry.key.contains('الواجهة')) return entry.value;
      if (lessonTitle.contains('الوسائط') && entry.key.contains('الوسائط')) return entry.value;
      if (lessonTitle.contains('المستخدم') && entry.key.contains('المستخدم')) return entry.value;
      if (lessonTitle.contains('تقييم') && entry.key.contains('تقييم')) return entry.value;
      if (lessonTitle.contains('التحسين') && entry.key.contains('التحسين')) return entry.value;
    }
    return const [];
  }
}
