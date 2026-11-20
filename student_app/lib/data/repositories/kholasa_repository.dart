import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../../core/network/result.dart';
import '../../domain/entities/kholasa.dart';

class KholasaRepository {
  KholasaRepository({required this.apiClient});

  final ApiClient apiClient;

  static bool isCppOrJsText(String text) {
    final lower = text.toLowerCase();
    return lower.contains('c++') ||
        lower.contains('سي بلس بلس') ||
        lower.contains('سي ++');
  }

  static bool isCppOrJsMaterial(KholasaMaterial m) {
    if (isCppOrJsText(m.unit) || isCppOrJsText(m.lesson)) return true;
    for (final def in m.definitions) {
      if (isCppOrJsText(def.term) || isCppOrJsText(def.meaning)) return true;
    }
    return false;
  }

  static bool isCppOrJsQuestion(KholasaQuestion q) {
    if (isCppOrJsText(q.prompt)) return true;
    for (final opt in q.options) {
      if (isCppOrJsText(opt)) return true;
    }
    if (q.explanation != null && isCppOrJsText(q.explanation!)) return true;
    if (q.modelAnswer != null && isCppOrJsText(q.modelAnswer!)) return true;
    return false;
  }

  /// Returns synchronous initial materials immediately (0ms) so UI renders with zero spinners
  List<KholasaMaterial> getInitialCurriculumMaterials() => _getAllCurriculumMaterials();

  /// Fetch all Kholasa Materials grouped by stage, unit, and lesson
  Future<Result<List<KholasaMaterial>>> getAllMaterials() async {
    try {
      final res = await apiClient.get('${ApiEndpoints.baseUrl}/api/learning/kholasa/materials');
      return await res.when(
        onSuccess: (data) async {
          if (data is Map<String, dynamic> && data['materials'] is List) {
            final list = (data['materials'] as List)
                .whereType<Map<String, dynamic>>()
                .map((j) => KholasaMaterial.fromJson(j))
                .where((m) => !isCppOrJsMaterial(m))
                .toList();
            if (list.isNotEmpty) return Success(list);
          }
          return Success(_getAllCurriculumMaterials());
        },
        onFailure: (msg, code) async => Success(_getAllCurriculumMaterials()),
      );
    } catch (_) {
      return Success(_getAllCurriculumMaterials());
    }
  }

  /// Fetch Kholasa Material (Definitions & Flashcards) for a given video ID
  Future<Result<KholasaMaterial>> getKholasaMaterial(int videoId) async {
    try {
      final res = await apiClient.get(ApiEndpoints.kholasaVideo(videoId));
      return await res.when(
        onSuccess: (data) async {
          if (data is Map<String, dynamic> && data['material'] is Map<String, dynamic>) {
            final material = KholasaMaterial.fromJson(data['material'] as Map<String, dynamic>);
            return Success(material);
          }
          return Success(_getFallbackMaterial(videoId));
        },
        onFailure: (msg, code) async => Success(_getFallbackMaterial(videoId)),
      );
    } catch (_) {
      return Success(_getFallbackMaterial(videoId));
    }
  }

  /// Fetch Questions for a Kholasa Material with type, difficulty, page
  Future<Result<List<KholasaQuestion>>> getQuestions({
    required int materialId,
    required String type, // 'mcq', 'true_false', 'essay'
    String difficulty = 'all',
    int page = 1,
    int limit = 15,
  }) async {
    try {
      final url = ApiEndpoints.kholasaQuestions(
        materialId,
        type,
        difficulty: difficulty,
        page: page,
        limit: limit,
      );
      final res = await apiClient.get(url);
      return await res.when(
        onSuccess: (data) async {
          if (data is Map<String, dynamic> && data['items'] is List) {
            final items = (data['items'] as List)
                .whereType<Map<String, dynamic>>()
                .map((json) => KholasaQuestion.fromJson(json, type))
                .where((q) => !isCppOrJsQuestion(q))
                .toList();
            return Success(items);
          }
          return Success(_getFallbackQuestions(type));
        },
        onFailure: (msg, code) async => Success(_getFallbackQuestions(type)),
      );
    } catch (_) {
      return Success(_getFallbackQuestions(type));
    }
  }

  /// Check answer for MCQ or True/False question
  Future<Result<KholasaCheckResult>> checkAnswer({
    required int materialId,
    required int questionBankId,
    required int selectedOption,
  }) async {
    try {
      final url = ApiEndpoints.kholasaCheckAnswer(materialId);
      final res = await apiClient.post(
        url,
        body: {
          'questionBankId': questionBankId,
          'selectedOption': selectedOption,
        },
      );
      return await res.when(
        onSuccess: (data) async {
          if (data is Map<String, dynamic>) {
            return Success(KholasaCheckResult.fromJson(data));
          }
          return const Success(KholasaCheckResult(isCorrect: true, correctOption: 0));
        },
        onFailure: (msg, code) async => const Success(KholasaCheckResult(isCorrect: true, correctOption: 0)),
      );
    } catch (_) {
      return const Success(KholasaCheckResult(isCorrect: true, correctOption: 0));
    }
  }

  KholasaMaterial _getFallbackMaterial(int videoId) {
    final all = _getAllCurriculumMaterials();
    return all.firstWhere((m) => m.videoId == videoId || m.id == videoId, orElse: () => all.first);
  }

  List<KholasaQuestion> _getFallbackQuestions(String type) {
    if (type == 'true_false') {
      return const [
        KholasaQuestion(
          id: 1001,
          difficulty: 'easy',
          type: 'true_false',
          prompt: 'تعتمد الحوسبة الطرفية على معالجة البيانات محلياً قرب مصدرها بدلاً من إرسالها للسحابة.',
          options: ['صواب', 'خطأ'],
          explanation: 'صواب، الحوسبة الطرفية تعالج البيانات محلياً لتقليل زمن الاستجابة (Latency) في القرارات الفورية.',
        ),
        KholasaQuestion(
          id: 1002,
          difficulty: 'easy',
          type: 'true_false',
          prompt: 'التشفير المتماثل يستخدم مفتاحاً واحداً سرياً لعمليتي التشفير وفك التشفير.',
          options: ['صواب', 'خطأ'],
          explanation: 'صواب، التشفير المتماثل يعتمد على نفس المفتاح السري المشترك للتشفير وفك التشفير.',
        ),
        KholasaQuestion(
          id: 1003,
          difficulty: 'medium',
          type: 'true_false',
          prompt: 'مرحلة الاحتواء في الاستجابة للحوادث تهدف إلى إزالة البرمجيات الخبيثة نهائياً.',
          options: ['صواب', 'خطأ'],
          explanation: 'خطأ، مرحلة الاحتواء تهدف لحصر التهديد وعزله، بينما مرحلة الاستئصال هي المسؤولة عن إزالته نهائياً.',
        ),
      ];
    } else if (type == 'essay') {
      return const [
        KholasaQuestion(
          id: 2001,
          difficulty: 'medium',
          type: 'essay',
          prompt: 'اشرح باختصار لماذا تُفضّل الحوسبة الطرفية (Edge Computing) في السيارات ذاتية القيادة.',
          modelAnswer: '1. تقليل زمن التأخير (Low Latency) لاتخاذ قرارات فورية في أجزاء من الثانية لتفادي الحوادث.\n2. استمرار عمل المركبة حتى في حال انقطاع الاتصال بشبكة الإنترنت الخارجية.\n3. تقليل حجم البيانات المرسلة للشبكة وحماية خصوصية بيانات الركاب.',
          points: 5,
        ),
        KholasaQuestion(
          id: 2002,
          difficulty: 'medium',
          type: 'essay',
          prompt: 'ما الفرق بين مرحلتي الاحتواء (Containment) والاستئصال (Eradication) في نموذج الاستجابة للحوادث السيبرانية؟',
          modelAnswer: 'مرحلة الاحتواء هدفها حصر الضرر وعزل الأنظمة والأجهزة المصابة لمنع انتشار التهديد في الشبكة.\nأما مرحلة الاستئصال فهدفها إزالة البرمجيات الخبيثة ومسببات الثغرة جذرياً من الأجهزة المعزولة.',
          points: 5,
        ),
      ];
    }

    return const [
      KholasaQuestion(
        id: 3001,
        difficulty: 'medium',
        type: 'mcq',
        prompt: 'ما هي التقنية التي تمكّن السيارات ذاتية القيادة من معالجة البيانات الفورية في أجزاء من الثانية؟',
        options: [
          'الحوسبة الطرفية (Edge Computing)',
          'الحوسبة الكمومية البعيدة',
          'النسخ الاحتياطي اليدوي',
          'البث الإذاعي التناظري',
        ],
        explanation: 'الحوسبة الطرفية تعالج البيانات على متن المركبة مباشرة لتقليل زمن الاستجابة إلى أقصى حد.',
      ),
      KholasaQuestion(
        id: 3002,
        difficulty: 'medium',
        type: 'mcq',
        prompt: 'ما العنصر المفقود في مثلث أمن المعلومات (CIA): السرية، والسلامة، و...؟',
        options: ['التوافر (Availability)', 'السرعة (Speed)', 'البرمجة (Coding)', 'التكلفة (Cost)'],
        explanation: 'مثلث CIA يتكون من: Confidentiality (السرية)، Integrity (السلامة)، و Availability (التوافر).',
      ),
      KholasaQuestion(
        id: 3003,
        difficulty: 'medium',
        type: 'mcq',
        prompt: 'أي بوابة منطقية تُخرج القيمة 1 فقط عندما تختلف مدخلاتها (0 و 1 أو 1 و 0)؟',
        options: ['بوابة XOR', 'بوابة AND', 'بوابة OR', 'بوابة NOT'],
        explanation: 'بوابة الاختيار الحصري XOR تُخرج 1 عند اختلاف المدخلات، وتُخرج 0 عند تطابقها.',
      ),
    ];
  }

  List<KholasaMaterial> _getAllCurriculumMaterials() {
    return const [
      // ════════════════════════════════════════════════════════
      // الوحدة 1: تقنيات ناشئة بارزة والذكاء الاصطناعي
      // ════════════════════════════════════════════════════════
      KholasaMaterial(
        id: 101,
        videoId: 101,
        unit: 'الوحدة الأولى: تقنيات ناشئة بارزة',
        lesson: 'الدرس 1-1: تقنيات ناشئة بارزة (القيادة الذاتية والحوسبة الطرفية)',
        videoUrl: 'https://www.youtube.com/watch?v=yEpvL_8h4h8',
        durationMinutes: 45,
        mindmapImages: [
          'https://drelmahdy.com/uploads/1788289353021-928131730.png',
        ],
        zatonaBullets: [
          'القيادة الذاتية تعتمد على الذكاء الاصطناعي وأجهزة الاستشعار (كاميرات، رادار، ليدار) للتحكم الدقيق في حركة المركبة.',
          'الحوسبة الطرفية (Edge Computing) تعالج البيانات محلياً على متن السيارة لتقليل زمن التأخير (Latency) لتفادي الحوادث.',
          'إنترنت الأشياء (IoT) يربط المركبة بإشارات المرور والسيارات المجاورة (V2X).',
        ],
        objectives: [
          'التعرف على أجهزة الاستشعار المستخدمة في السيارات ذاتية القيادة.',
          'فهم الفارق الجوهري بين الحوسبة السحابية والحوسبة الطرفية.',
          'استيعاب دور الذكاء الاصطناعي في خفض الحوادث البشرية.',
        ],
        definitions: [
          KholasaDefinition(
            term: 'القيادة الذاتية (Self-Driving)',
            meaning: 'تقنية تستخدم الذكاء الاصطناعي وأجهزة الاستشعار لمساعدة السائق أو قيادة المركبة بالكامل دون تدخل بشري.',
          ),
          KholasaDefinition(
            term: 'الحوسبة الطرفية (Edge Computing)',
            meaning: 'معالجة البيانات محلياً قرب مصدرها مباشرة على متن المركبة لتقليل زمن الاستجابة (Latency) واتخاذ قرارات فورية.',
          ),
          KholasaDefinition(
            term: 'إنترنت الأشياء (IoT)',
            meaning: 'شبكة من الأجهزة والأشياء المادية المزودة بمستشعرات وبرمجيات تتيح لها تبادل البيانات عبر الإنترنت.',
          ),
          KholasaDefinition(
            term: 'الليدار (LiDAR)',
            meaning: 'مستشعر يعتمد على نبضات الليزر لرسم خريطة ثلاثية الأبعاد دقيقة جداً لمحيط المركبة وتحديد المسافات بدقة.',
          ),
        ],
        flashcards: [
          KholasaFlashcard(
            id: 'fc-1-1-1',
            front: 'ما هي الحوسبة الطرفية ولماذا تُفضّل في المركبات ذاتية القيادة؟',
            back: 'معالجة البيانات محلياً على متن المركبة لتقليل زمن التأخير (Latency) إلى أجزاء من الثانية واتخاذ قرارات فورية لتفادي الاصطدام.',
            tag: 'تقنيات ناشئة',
          ),
          KholasaFlashcard(
            id: 'fc-1-1-2',
            front: 'ما دور أجهزة الاستشعار (الرادار والليدار والكاميرات) في السيارة الذكية؟',
            back: 'إدراك المحيط ورسم خريطة بيئية ثلاثية الأبعاد وكشف العقبات والمشاة وإشارات المرور في جميع الظروف الجوية.',
            tag: 'القيادة الذاتية',
          ),
        ],
        questions: [
          KholasaQuestion(
            id: 1101,
            difficulty: 'easy',
            type: 'mcq',
            prompt: 'ما الميزة الأساسية لمعالجة بيانات السيارة ذاتية القيادة عبر الحوسبة الطرفية؟',
            options: [
              'تقليل زمن الاستجابة والتعامل اللحظي مع الطوارئ',
              'الاعتماد الكامل على خوادم الإنترنت السحابية',
              'إلغاء الحاجة لمستشعرات الليدار والكاميرات',
              'زيادة تكلفة استهلاك البيانات السحابية',
            ],
            explanation: 'الحوسبة الطرفية تعالج البيانات محلياً في أجزاء من الثانية لضمان سلامة الركاب والمشاة.',
          ),
          KholasaQuestion(
            id: 1102,
            difficulty: 'easy',
            type: 'true_false',
            prompt: 'تعتمد تقنية إنترنت الأشياء (IoT) في المدن الذكية على ربط المركبات بالبنية التحتية للمرور.',
            options: ['صواب', 'خطأ'],
            explanation: 'صواب، تتيح شبكات IoT و V2X التواصل بين السيارات وإشارات المرور لتنظيم السير وتجنب الازدحام.',
          ),
          KholasaQuestion(
            id: 1103,
            difficulty: 'medium',
            type: 'essay',
            prompt: 'قارن بين الحوسبة السحابية والحوسبة الطرفية في معالجة بيانات أنظمة القيادة الذاتية.',
            modelAnswer: 'الحوسبة السحابية: تستخدم للتخزين الضخم وتحليل البيانات التاريخية والتدريب الشامل لنماذج الذكاء الاصطناعي، لكنها تعاني من بطء نسبي في الاستجابة.\nالحوسبة الطرفية: تعالج البيانات لحظياً على متن السيارة لاتخاذ قرارات فورية لتفادي الحوادث دون انتظار رد الخادم البعيد.',
            points: 5,
          ),
        ],
      ),

      KholasaMaterial(
        id: 102,
        videoId: 102,
        unit: 'الوحدة الأولى: تقنيات ناشئة بارزة',
        lesson: 'الدرس 1-2: التعلم الآلي ونماذج الذكاء الاصطناعي (Machine Learning)',
        videoUrl: 'https://www.youtube.com/watch?v=yEpvL_8h4h8',
        durationMinutes: 52,
        mindmapImages: [
          'https://drelmahdy.com/uploads/1791665329587-147804572.png',
        ],
        zatonaBullets: [
          'التعلم الآلي هو فرع من الذكاء الاصطناعي يُمكّن النظام من التعلم واكتشاف الأنماط من البيانات.',
          'بيانات التدريب (Training Data) هي الأمثلة السابقة التي يبني عليها النموذج خبرته.',
          'النموذج الذكي (AI Model) هو المخرج النهائي لعملية التدريب القادر على التنبؤ بحالات جديدة.',
        ],
        definitions: [
          KholasaDefinition(
            term: 'التعلم الآلي (Machine Learning)',
            meaning: 'فرع من الذكاء الاصطناعي يركز على تطوير خوارزميات تتعلم من البيانات وتتحسن تلقائياً بالخبرة دون برمجة صريحة.',
          ),
          KholasaDefinition(
            term: 'بيانات التدريب (Training Data)',
            meaning: 'مجموعة البيانات والأمثلة التي يُغذى بها نظام التعلم الآلي لاستخراج الأنماط والقواعد.',
          ),
          KholasaDefinition(
            term: 'النموذج (Model)',
            meaning: 'التمثيل الرياضي والبرمجي الذي ينتج بعد تدريب الخوارزمية، ويُستخدم للتنبؤ واتخاذ القرارات.',
          ),
        ],
        flashcards: [
          KholasaFlashcard(
            id: 'fc-1-2-1',
            front: 'ما الفرق بين الذكاء الاصطناعي والتعلم الآلي؟',
            back: 'الذكاء الاصطناعي هو المظلة الشاملة لمحاكاة الذكاء البشري، بينما التعلم الآلي هو فرع منه يكتشف الأنماط من البيانات دون برمجة صريحة لكل خطوة.',
            tag: 'التعلم الآلي',
          ),
        ],
        questions: [
          KholasaQuestion(
            id: 1201,
            difficulty: 'easy',
            type: 'mcq',
            prompt: 'ما هي البيانات التي يعتمد عليها نظام التعلم الآلي لاكتشاف الأنماط والقواعد؟',
            options: ['بيانات التدريب (Training Data)', 'بيانات الشاشة', 'بيانات الطابعة', 'بيانات لوحة المفاتيح'],
            explanation: 'بيانات التدريب هي الأساس الذي يُبنى عليه النموذج الذكي قبل استخدامه في العالم الواقعي.',
          ),
        ],
      ),

      KholasaMaterial(
        id: 103,
        videoId: 103,
        unit: 'الوحدة الأولى: تقنيات ناشئة بارزة',
        lesson: 'الدرس 1-3: أخلاقيات الذكاء الاصطناعي والتحيز الخوارزمي',
        videoUrl: 'https://www.youtube.com/watch?v=yEpvL_8h4h8',
        durationMinutes: 48,
        mindmapImages: [
          'https://drelmahdy.com/uploads/1784745887496-716596349.png',
        ],
        zatonaBullets: [
          'التحيز الخوارزمي يحدث عند تدريب النموذج على بيانات غير عادلة أو غير متوازنة.',
          'الصندوق الأسود (Black Box) يعني صعوبة فهم البشر لخطوات القرار في النماذج المعقدة.',
          'الذكاء الاصطناعي القابل للتفسير (XAI) يُمكّن الإنسان من معرفة أسباب قرارات النظام.',
        ],
        definitions: [
          KholasaDefinition(
            term: 'التحيز الخوارزمي (Algorithmic Bias)',
            meaning: 'نمط في مخرجات الذكاء الاصطناعي يؤدي إلى نتائج غير عادلة أو تمييزية ناتجة عن بيانات تدريب متحيزة.',
          ),
          KholasaDefinition(
            term: 'الذكاء الاصطناعي القابل للتفسير (XAI)',
            meaning: 'أساليب وتقنيات تساعد البشر على فهم وتفسير العوامل والمدخلات التي أدت إلى قرار النموذج.',
          ),
          KholasaDefinition(
            term: 'حماية الخصوصية (Privacy Protection)',
            meaning: 'مبدأ يضمن سرية وعدم استغلال البيانات الشخصية للأفراد أثناء تدريب واستخدام أنظمة الذكاء الاصطناعي.',
          ),
        ],
        flashcards: [
          KholasaFlashcard(
            id: 'fc-1-3-1',
            front: 'ما هي مبادئ أخلاقيات الذكاء الاصطناعي الأربعة الأساسية؟',
            back: '1. العدالة (عدم التمييز) 2. الشفافية (وضوح القرار) 3. المساءلة 4. حماية الخصوصية للبيانات.',
            tag: 'أخلاقيات AI',
          ),
        ],
        questions: [
          KholasaQuestion(
            id: 1301,
            difficulty: 'easy',
            type: 'mcq',
            prompt: 'ما هو المبدأ الأخلاقي الذي يمنع التمييز غير العادل ضد أي شخص أو فئة في قرارات الذكاء الاصطناعي؟',
            options: ['العدالة (Fairness)', 'السرعة (Speed)', 'الربحية (Profit)', 'التخزين (Storage)'],
            explanation: 'العدالة تعني المساواة وعدم الانحياز ضد أي فئة بسبب العرق أو الجنس أو البيانات التاريخية.',
          ),
        ],
      ),

      // ════════════════════════════════════════════════════════
      // الوحدة 2: الأمن السيبراني وإدارة الحوادث الرقمية
      // ════════════════════════════════════════════════════════
      KholasaMaterial(
        id: 201,
        videoId: 201,
        unit: 'الوحدة الثانية: الأمن السيبراني',
        lesson: 'الدرس 2-1: الحوادث الأمنية ومثلث أمن المعلومات (CIA Triad)',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        durationMinutes: 50,
        zatonaBullets: [
          'الحادث الأمني هو أي حدث يؤثر سلباً على سرية أو سلامة أو توافر البيانات.',
          'السرية (Confidentiality) تحمي البيانات من الوصول غير المصرح.',
          'السلامة (Integrity) تمنع تعديل أو تزوير البيانات.',
          'التوافر (Availability) يضمن استمرارية الخدمة وعدم توقفها بهجمات حجب الخدمة (DoS).',
        ],
        definitions: [
          KholasaDefinition(
            term: 'الحادث الأمني (Security Incident)',
            meaning: 'حدث يؤثر سلباً في سرية المعلومات أو سلامتها أو توافرها، أو ينتهك السياسات الأمنية للمؤسسة.',
          ),
          KholasaDefinition(
            term: 'السرية (Confidentiality)',
            meaning: 'ضمان أن المعلومات لا يتم الوصول إليها أو قراءتها إلا من قبل الأشخاص المصرح لهم فقط.',
          ),
          KholasaDefinition(
            term: 'السلامة والنزاهة (Integrity)',
            meaning: 'حماية البيانات من التعديل أو الحذف أو التلاعب غير المصرح به وضمان صحتها.',
          ),
          KholasaDefinition(
            term: 'التوافر (Availability)',
            meaning: 'إتاحة الوصول إلى المعلومات والخدمات للجهات والمستخدمين المصرح لهم عند الحاجة دون انقطاع.',
          ),
        ],
        flashcards: [
          KholasaFlashcard(
            id: 'fc-2-1-1',
            front: 'ما هي أركان مثلث أمن المعلومات الثلاثة (CIA Triad)؟',
            back: 'السرية (Confidentiality) لمنع التسرب، السلامة (Integrity) لمنع التلاعب، والتوافر (Availability) لاستمرار الخدمة.',
            tag: 'الأمن السيبراني',
          ),
        ],
        questions: [
          KholasaQuestion(
            id: 2101,
            difficulty: 'easy',
            type: 'mcq',
            prompt: 'أي عنصر من مثلث أمن المعلومات يتعرض للانتهاك عند تسرب كلمات مرور المستخدمين؟',
            options: ['السرية (Confidentiality)', 'التوافر (Availability)', 'السرعة', 'سعة التخزين'],
            explanation: 'تسرب البيانات وكلمات المرور هو انتهاك صريح لعنصر السرية.',
          ),
        ],
      ),

      KholasaMaterial(
        id: 202,
        videoId: 202,
        unit: 'الوحدة الثانية: الأمن السيبراني',
        lesson: 'الدرس 2-2: نموذج الاستجابة للحوادث السيبرانية (Incident Response)',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        durationMinutes: 60,
        zatonaBullets: [
          'النموذج يضم 6 مراحل: التحضير، الاكتشاف، الاحتواء، الاستئصال، الاستعادة، الدروس المستفادة.',
          'مرحلة التحضير تسبق وقوع الحادث وتضع الخطط وتدرب الفريق.',
          'الاحتواء يعزل الأجهزة المصابة لمنع انتشار العدوى في الشبكة.',
          'الاستئصال يزيل البرمجية الخبيثة ومسببات الثغرة جذرياً.',
        ],
        definitions: [
          KholasaDefinition(
            term: 'التحضير (Preparation)',
            meaning: 'أول مرحلة في نموذج الاستجابة؛ تشمل وضع خطط الطوارئ وتجهيز الأدوات وتدريب فريق الاستجابة قبل وقوع الحادث.',
          ),
          KholasaDefinition(
            term: 'الاحتواء (Containment)',
            meaning: 'عزل الأنظمة والأجهزة المصابة سريعاً للحد من انتشار الضرر في باقي الشبكة.',
          ),
          KholasaDefinition(
            term: 'الاستئصال (Eradication)',
            meaning: 'إزالة البرمجيات الخبيثة ومسببات التهديد جذرياً من الأجهزة المعزولة وسد الثغرات.',
          ),
        ],
        flashcards: [
          KholasaFlashcard(
            id: 'fc-2-2-1',
            front: 'ما هي مراحل الاستجابة للحوادث الأمنية الست بالترتيب؟',
            back: '1. التحضير 2. الاكتشاف والتحليل 3. الاحتواء 4. الاستئصال 5. الاستعادة 6. الدروس المستفادة والتحسين.',
            tag: 'الاستجابة للحوادث',
          ),
        ],
        questions: [
          KholasaQuestion(
            id: 2201,
            difficulty: 'medium',
            type: 'mcq',
            prompt: 'ما الغرض الأساسي من مرحلة الاحتواء (Containment) في الاستجابة للحوادث؟',
            options: [
              'الحد من انتشار الضرر وعزل الجزء المصاب',
              'إعادة تشغيل الخادم فوراً للعملاء',
              'حذف سجلات الحادث الأمني',
              'إنهاء عقود الموظفين',
            ],
            explanation: 'الاحتواء يهدف إلى حصر التهديد ومنعه من الوصول إلى أجهزة وسيرفرات أخرى.',
          ),
        ],
      ),

      // ════════════════════════════════════════════════════════
      // الوحدة 3: التصميم المنطقي والبوابات الرقمية
      // ════════════════════════════════════════════════════════
      KholasaMaterial(
        id: 501,
        videoId: 501,
        unit: 'الوحدة الخامسة: التصميم المنطقي',
        lesson: 'الدرس 5-1: البوابات الأساسية وجدول الحقيقة (AND و OR و NOT)',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        durationMinutes: 45,
        zatonaBullets: [
          'بوابة AND تخرج 1 فقط إذا كان كل المدخلين 1 (ضرب منطقي).',
          'بوابة OR تخرج 1 إذا كان أي من المدخلين 1 (جمع منطقي).',
          'بوابة XOR تخرج 1 عند اختلاف المدخلين فقط.',
        ],
        definitions: [
          KholasaDefinition(
            term: 'بوابة AND',
            meaning: 'بوابة منطقية رقمية مخرجها 1 فقط إذا كانت جميع المداخل 1، ومخرجها 0 إذا كان أي مدخل 0.',
          ),
          KholasaDefinition(
            term: 'بوابة XOR (Exclusive OR)',
            meaning: 'بوابة الاختيار الحصري؛ مخرجها 1 عند اختلاف المدخلين (0 و 1 أو 1 و 0)، ومخرجها 0 عند تطابقهما.',
          ),
        ],
        flashcards: [
          KholasaFlashcard(
            id: 'fc-5-1-1',
            front: 'متى تُخرج بوابة الاختيار الحصري XOR القيمة 1؟',
            back: 'تُخرج 1 فقط عند اختلاف المداخل (0 و 1 أو 1 و 0)، وتُخرج 0 عند تطابقها (0 و 0 أو 1 و 1).',
            tag: 'بوابات منطقية',
          ),
        ],
        questions: [
          KholasaQuestion(
            id: 5101,
            difficulty: 'easy',
            type: 'mcq',
            prompt: 'أي بوابة منطقية تعطي مخرجاً 1 عند إدخال (1 و 0) ولكن تعطي 0 عند إدخال (1 و 1)؟',
            options: ['بوابة XOR', 'بوابة AND', 'بوابة OR', 'بوابة XNOR'],
            explanation: 'بوابة XOR تخرج 1 حصرياً عند اختلاف المدخلين، وعند تطابقهما تخرج 0.',
          ),
        ],
      ),
    ];
  }
}
