import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:student_app/core/utils/app_toast.dart';

class FlashcardItem {
  const FlashcardItem({
    required this.id,
    required this.unitId,
    required this.unitTitle,
    required this.lessonId,
    required this.lessonTitle,
    required this.concept,
    required this.questionPrompt,
    required this.answer,
    required this.keyTakeaways,
  });

  final String id;
  final String unitId;
  final String unitTitle;
  final String lessonId;
  final String lessonTitle;
  final String concept;
  final String questionPrompt;
  final String answer;
  final List<String> keyTakeaways;
}

class UnitCategory {
  const UnitCategory({
    required this.id,
    required this.title,
    required this.shortTitle,
    required this.icon,
  });

  final String id;
  final String title;
  final String shortTitle;
  final IconData icon;
}

class LessonFilter {
  const LessonFilter({
    required this.id,
    required this.unitId,
    required this.title,
  });

  final String id;
  final String unitId;
  final String title;
}

class SelfAssessmentView extends StatefulWidget {
  const SelfAssessmentView({super.key});

  @override
  State<SelfAssessmentView> createState() => _SelfAssessmentViewState();
}

class _SelfAssessmentViewState extends State<SelfAssessmentView>
    with SingleTickerProviderStateMixin {
  late PageController _pageController;
  int _currentPage = 0;

  // Selected Unit and Lesson
  String _selectedUnitId = 'unit_1_ai';
  String _selectedLessonId = 'all';
  bool _onlyUnmastered = false;

  // Set of understood/mastered card IDs
  final Set<String> _understoodCards = {};
  final Map<String, bool> _flippedCards = {};
  List<int>? _shuffledIndices;

  static const List<UnitCategory> _units = [
    UnitCategory(
      id: 'unit_1_ai',
      title: 'الوحدة 1: تقنيات ناشئة وذكاء اصطناعي',
      shortTitle: 'تقنيات وAI',
      icon: Icons.auto_awesome_rounded,
    ),
    UnitCategory(
      id: 'unit_2_cyber',
      title: 'الوحدة 2: الأمن السيبراني والحوادث',
      shortTitle: 'الأمن السيبراني',
      icon: Icons.security_rounded,
    ),
    UnitCategory(
      id: 'unit_5_logic',
      title: 'الوحدة 3: التصميم المنطقي والبوابات',
      shortTitle: 'التصميم المنطقي',
      icon: Icons.memory_rounded,
    ),
  ];

  static const List<LessonFilter> _lessons = [
    // Unit 1
    LessonFilter(id: 'all', unitId: 'unit_1_ai', title: 'كل دروس الوحدة'),
    LessonFilter(id: 'les_1_1', unitId: 'unit_1_ai', title: 'الدرس 1-1: تقنيات ناشئة والقيادة الذاتية'),
    LessonFilter(id: 'les_1_2', unitId: 'unit_1_ai', title: 'الدرس 1-2: التعلم الآلي ونماذج AI'),
    LessonFilter(id: 'les_1_3', unitId: 'unit_1_ai', title: 'الدرس 1-3: أخلاقيات الذكاء الاصطناعي'),

    // Unit 2
    LessonFilter(id: 'all', unitId: 'unit_2_cyber', title: 'كل دروس الوحدة'),
    LessonFilter(id: 'les_2_1', unitId: 'unit_2_cyber', title: 'الدرس 2-1: الحوادث الأمنية والـ CIA'),
    LessonFilter(id: 'les_2_2', unitId: 'unit_2_cyber', title: 'الدرس 2-2: نموذج الاستجابة للحوادث'),

    // Unit 3 (Logic)
    LessonFilter(id: 'all', unitId: 'unit_5_logic', title: 'كل دروس الوحدة'),
    LessonFilter(id: 'les_5_1', unitId: 'unit_5_logic', title: 'الدرس 3-1: البوابات الأساسية AND و OR'),
    LessonFilter(id: 'les_5_2', unitId: 'unit_5_logic', title: 'الدرس 3-2: بوابة الاختيار الحصري XOR'),
  ];

  static const List<FlashcardItem> _allCards = [
    // ════════════════════════════════════════════════════════
    // الوحدة 1: تقنيات ناشئة بارزة والذكاء الاصطناعي
    // ════════════════════════════════════════════════════════
    FlashcardItem(
      id: 'ai_1',
      unitId: 'unit_1_ai',
      unitTitle: 'الوحدة 1: تقنيات ناشئة بارزة',
      lessonId: 'les_1_1',
      lessonTitle: 'الدرس 1-1: تقنيات ناشئة والقيادة الذاتية',
      concept: 'القيادة الذاتية (Self-Driving Cars)',
      questionPrompt: 'ما هي تقنية القيادة الذاتية؟ وما دور الذكاء الاصطناعي وأجهزة الاستشعار فيها؟',
      answer: 'القيادة الذاتية هي تقنية تستخدم الذكاء الاصطناعي لمساعدة أو تولي قيادة المركبة بالكامل؛ حيث تعتمد على كاميرات ورادارات ومستشعرات ليدار لإدراك المحيط، ثم معالجة البيانات واتخاذ قرارات فورية في التوجيه والفرملة لتفادي الحوادث.',
      keyTakeaways: [
        'تعتمد على أجهزة استشعار (كاميرات، رادار، ليدار) لرسم خريطة محيطية للمركبة',
        'تستعين بالحوسبة الطرفية (Edge Computing) لتقليل زمن الاستجابة إلى أجزاء من الثانية',
        'الهدف الأساسي: رفع مستوى السلامة وتقليل الحوادث الناتجة عن الأخطاء البشرية',
      ],
    ),
    FlashcardItem(
      id: 'ai_2',
      unitId: 'unit_1_ai',
      unitTitle: 'الوحدة 1: تقنيات ناشئة بارزة',
      lessonId: 'les_1_1',
      lessonTitle: 'الدرس 1-1: تقنيات ناشئة والقيادة الذاتية',
      concept: 'الحوسبة الطرفية (Edge Computing)',
      questionPrompt: 'ما هي الحوسبة الطرفية؟ ولماذا تفضل على السحابة في المركبات ذاتية القيادة؟',
      answer: 'الحوسبة الطرفية تعني معالجة البيانات محلياً على متن الجهاز أو قرب مصدرها مباشرة بدلاً من إرسالها إلى خوادم سحابية بعيدة؛ مما يقلل زمن الاستجابة (Latency) ويتيح اتخاذ قرارات مصيرية فورية لتفادي الاصطدام.',
      keyTakeaways: [
        'تقليل زمن التأخير (Low Latency) للقرارات اللحظية الحساسة',
        'استمرار العمل حتى في حال انقطاع الاتصال بشبكة الإنترنت الخارجية',
        'الحوسبة السحابية تبقى مخصصة للتخزين طويل الأجل والتدريب والتحليل الشامل',
      ],
    ),
    FlashcardItem(
      id: 'ai_3',
      unitId: 'unit_1_ai',
      unitTitle: 'الوحدة 1: تقنيات ناشئة بارزة',
      lessonId: 'les_1_2',
      lessonTitle: 'الدرس 1-2: التعلم الآلي ونماذج AI',
      concept: 'التعلم الآلي (Machine Learning) وبيانات التدريب',
      questionPrompt: 'ما الفرق بين الذكاء الاصطناعي والتعلم الآلي؟ وما هي بيانات التدريب؟',
      answer: 'الذكاء الاصطناعي هو المفهوم الشامل لأجهزة تحاكي العقل البشري، بينما التعلم الآلي هو فرع منه يُمكّن النظام من التعلم واكتشاف الأنماط من البيانات دون برمجة مباشرة. بيانات التدريب هي الأمثلة السابقة التي يبني النظام بناءً عليها خبرته.',
      keyTakeaways: [
        'كل تعلم آلي هو ذكاء اصطناعي، وليس كل ذكاء اصطناعي تعلماً آلياً',
        'بيانات التدريب: الأمثلة التاريخية التي يتعلم منها النموذج قبل نشره واستخدامه',
        'جودة مخرجات النموذج تعتمد كلياً على جودة وتنوع بيانات التدريب',
      ],
    ),
    FlashcardItem(
      id: 'ai_4',
      unitId: 'unit_1_ai',
      unitTitle: 'الوحدة 1: تقنيات ناشئة بارزة',
      lessonId: 'les_1_3',
      lessonTitle: 'الدرس 1-3: أخلاقيات الذكاء الاصطناعي',
      concept: 'التحيز الخوارزمي ومشكلة الصندوق الأسود (XAI)',
      questionPrompt: 'ما هو التحيز الخوارزمي؟ وما المقصود بالذكاء الاصطناعي القابل للتفسير (XAI)؟',
      answer: 'التحيز الخوارزمي هو نمط في مخرجات النظام يؤدي إلى قرارات غير عادلة أو تمييزية ضد فئة معينة نتيجة بيانات تدريب غير متوازنة. والذكاء الاصطناعي القابل للتفسير (XAI) هو تقنيات تُمكّن البشر من فهم ومراجعة الأسباب التي بنى عليها النموذج قراره.',
      keyTakeaways: [
        'التحيز الخوارزمي ينتج أساساً عن تدريب النموذج على بيانات غير متوازنة أو تحيز بشري مسبق',
        'الصندوق الأسود (Black Box): عدم وضوح خطوات تفكير النموذج المعقد للبشر',
        'مبادئ أخلاقيات الذكاء الاصطناعي: العدالة، الشفافية، المساءلة، وحماية الخصوصية',
      ],
    ),

    // ════════════════════════════════════════════════════════
    // الوحدة 2: الأمن السيبراني وإدارة الحوادث الرقمية
    // ════════════════════════════════════════════════════════
    FlashcardItem(
      id: 'sec_1',
      unitId: 'unit_2_cyber',
      unitTitle: 'الوحدة 2: الأمن السيبراني',
      lessonId: 'les_2_1',
      lessonTitle: 'الدرس 2-1: الحوادث الأمنية والـ CIA',
      concept: 'مثلث أمن المعلومات (CIA Triad)',
      questionPrompt: 'ما هو الحادث الأمني؟ وما هي أركان مثلث أمن المعلومات الثلاثة (CIA)؟',
      answer: 'الحادث الأمني هو حدث يؤثر سلباً في سرية المعلومات أو سلامتها أو توافرها، أو ينتهك سياسة أمنية. أركان مثلث CIA هي: 1. السرية (Confidentiality): حماية البيانات من الوصول غير المصرح. 2. السلامة (Integrity): منع التعديل والتلاعب. 3. التوافر (Availability): إتاحة الخدمة للمستخدمين المصرح لهم.',
      keyTakeaways: [
        'السرية: عدم تسرب كلمات المرور أو ملفات العملاء',
        'السلامة: الحفاظ على البيانات من التغيير أو الحذف دون تصريح',
        'التوافر: حماية الخوادم من هجمات حجب الخدمة (DoS) لمنع توقف الموقع',
      ],
    ),
    FlashcardItem(
      id: 'sec_2',
      unitId: 'unit_2_cyber',
      unitTitle: 'الوحدة 2: الأمن السيبراني',
      lessonId: 'les_2_2',
      lessonTitle: 'الدرس 2-2: نموذج الاستجابة للحوادث',
      concept: 'مراحل الاستجابة للحوادث السيبرانية',
      questionPrompt: 'ما هي المراحل الست لنموذج الاستجابة للحوادث السيبرانية بالترتيب؟',
      answer: 'المراحل الست بالترتيب هي: 1. التحضير (وضع الخطط وتجهيز الأدوات) 2. الاكتشاف والتحليل (تأكيد وقوع الحادث وتحديد خطورته) 3. الاحتواء (عزل الأنظمة المصابة للحد من انتشار الضرر) 4. الاستئصال (إزالة البرمجية الخبيثة جذرياً) 5. الاستعادة (إرجاع الأنظمة للعمل الطبيعي الآمن) 6. الدروس المستفادة والتحسين.',
      keyTakeaways: [
        'أول مرحلة: التحضير (Preparation) قبل وقوع أي حادث',
        'الاحتواء (Containment): عزل الجهاز أو الشبكة فوراً لمنع انتشار العدوى',
        'آخر مرحلة: الدروس المستفادة والتحسين (Lessons Learned) لمنع تكرار الثغرة',
      ],
    ),

    // ════════════════════════════════════════════════════════
    // الوحدة 3: التصميم المنطقي والبوابات الرقمية
    // ════════════════════════════════════════════════════════
    FlashcardItem(
      id: 'logic_1',
      unitId: 'unit_5_logic',
      unitTitle: 'الوحدة 3: التصميم المنطقي',
      lessonId: 'les_5_1',
      lessonTitle: 'الدرس 3-1: البوابات الأساسية AND و OR',
      concept: 'البوابات المنطقية الأساسية (AND و OR و NOT)',
      questionPrompt: 'ما الفرق بين بوابتي AND و OR؟ وما هو جدول الحقيقة (Truth Table) لكل منهما؟',
      answer: 'بوابة AND تمثل الضرب المنطقي، مخرجها 1 فقط إذا كان كل المدخلين 1، ومخرجها 0 في أي حالة أخرى. أما بوابة OR فتمثل الجمع المنطقي، مخرجها 1 إذا كان أي من المدخلين 1، ومخرجها 0 فقط عندما يكون كلا المدخلين 0.',
      keyTakeaways: [
        'بوابة AND: تُخرج 1 عند (1 و 1) فقط',
        'بوابة OR: تُخرج 1 إذا كان أحدهما أو كلاهما 1',
        'بوابة NOT: عاكس منطقي يعكس المدخل (0 يصبح 1، و 1 يصبح 0)',
      ],
    ),
    FlashcardItem(
      id: 'logic_2',
      unitId: 'unit_5_logic',
      unitTitle: 'الوحدة 5: التصميم المنطقي',
      lessonId: 'les_5_2',
      lessonTitle: 'الدرس 5-2: بوابة الاختيار الحصري XOR',
      concept: 'بوابة الاختيار الحصري (XOR Gate)',
      questionPrompt: 'متى تُخرج بوابة XOR القيمة 1؟ وما الفرق بينها وبين بوابة OR العادية؟',
      answer: 'بوابة XOR (Exclusive OR) تُخرج 1 فقط عند اختلاف المدخلين (0 و 1 أو 1 و 0)، وتُخرج 0 عند تطابق المدخلين (0 و 0 أو 1 و 1). الفرق بينها وبين OR هو أنها لا تُخرج 1 إذا كان كلا المدخلين 1.',
      keyTakeaways: [
        'XOR: مخرجها 1 عند اختلاف المدخلات، و 0 عند تطابقها',
        'تستخدم بشكل أساسي في دوائر الجمع النصفي (Half Adder) والتشفير',
        'رمزها الرياضي هو دائرة بداخلها علامة زائد (⊕)',
      ],
    ),
  ];

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  List<FlashcardItem> get _filteredCards {
    var list = _allCards.where((c) {
      if (c.unitId != _selectedUnitId) return false;
      if (_selectedLessonId != 'all' && c.lessonId != _selectedLessonId) return false;
      if (_onlyUnmastered && _understoodCards.contains(c.id)) return false;
      return true;
    }).toList();

    if (_shuffledIndices != null && _shuffledIndices!.length == list.length) {
      list = _shuffledIndices!.map((i) => list[i]).toList();
    }

    return list;
  }

  int get _totalCardsInUnit {
    return _allCards.where((c) {
      if (c.unitId != _selectedUnitId) return false;
      if (_selectedLessonId != 'all' && c.lessonId != _selectedLessonId) return false;
      return true;
    }).length;
  }

  int get _understoodInUnit {
    return _allCards.where((c) {
      if (c.unitId != _selectedUnitId) return false;
      if (_selectedLessonId != 'all' && c.lessonId != _selectedLessonId) return false;
      return _understoodCards.contains(c.id);
    }).length;
  }

  void _onUnitChanged(String newUnitId) {
    setState(() {
      _selectedUnitId = newUnitId;
      _selectedLessonId = 'all';
      _currentPage = 0;
      _shuffledIndices = null;
    });
    if (_pageController.hasClients) {
      _pageController.jumpToPage(0);
    }
  }

  void _onLessonChanged(String newLessonId) {
    setState(() {
      _selectedLessonId = newLessonId;
      _currentPage = 0;
      _shuffledIndices = null;
    });
    if (_pageController.hasClients) {
      _pageController.jumpToPage(0);
    }
  }

  void _toggleFlip(String cardId) {
    HapticFeedback.selectionClick();
    setState(() {
      _flippedCards[cardId] = !(_flippedCards[cardId] ?? false);
    });
  }

  void _markAsUnderstood(String cardId) {
    HapticFeedback.mediumImpact();
    setState(() {
      _understoodCards.add(cardId);
    });

    AppToast.showSuccess(context, 'فهمتها تمام وعرفت فكرتها 👍');

    // Auto advance to next card after a brief moment
    Future.delayed(const Duration(milliseconds: 320), () {
      if (!mounted) return;
      if (_currentPage < _filteredCards.length - 1) {
        _pageController.nextPage(
          duration: const Duration(milliseconds: 350),
          curve: Curves.easeInOut,
        );
      }
    });
  }

  void _shuffleCards() {
    final list = _filteredCards;
    if (list.isEmpty) return;
    HapticFeedback.lightImpact();
    final indices = List.generate(list.length, (i) => i);
    indices.shuffle(Random());
    setState(() {
      _shuffledIndices = indices;
      _currentPage = 0;
    });
    if (_pageController.hasClients) {
      _pageController.jumpToPage(0);
    }
    AppToast.showInfo(context, 'تم خلط وترتيب الكروت عشوائياً 🔀');
  }

  void _resetProgress() {
    setState(() {
      _understoodCards.clear();
      _shuffledIndices = null;
      _currentPage = 0;
    });
    if (_pageController.hasClients) {
      _pageController.jumpToPage(0);
    }
    AppToast.showInfo(context, 'تمت إعادة تعيين التسميع من البداية 🔄');
  }

  @override
  Widget build(BuildContext context) {
    final cards = _filteredCards;
    final total = _totalCardsInUnit;
    final understood = _understoodInUnit;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: Column(
          children: [
            // ── Top Header Bar ──
            _buildHeader(),

            // ── Unit Selector (Horizontal Scrolling) ──
            _buildUnitSelector(),

            // ── Sub-Lesson Selector ──
            _buildLessonSelector(),

            // ── Progress & Action Bar ──
            _buildProgressSection(total, understood, cards.length),

            // ── Card Swiper Deck ──
            Expanded(
              child: cards.isEmpty
                  ? _buildEmptyState()
                  : PageView.builder(
                      controller: _pageController,
                      physics: const BouncingScrollPhysics(),
                      onPageChanged: (idx) {
                        setState(() => _currentPage = idx);
                      },
                      itemCount: cards.length,
                      itemBuilder: (context, idx) {
                        return _buildCardItem(cards[idx], idx, cards.length);
                      },
                    ),
            ),

            // ── Bottom Navigation Controls ──
            if (cards.isNotEmpty) _buildBottomControls(cards.length),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 10),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0), width: 1)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              InkWell(
                onTap: () => Navigator.of(context).maybePop(),
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Center(
                    child: Icon(Icons.arrow_back_rounded, size: 20, color: Color(0xFF334155)),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text(
                    'التسميع الذكي والمفاهيم',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  SizedBox(height: 2),
                  Text(
                    'كروت مراجعة وتسميع حسب وحدات ودروس المنهج',
                    style: TextStyle(fontSize: 10.5, color: Color(0xFF64748B)),
                  ),
                ],
              ),
            ],
          ),

          // Reset button
          IconButton(
            tooltip: 'إعادة التسميع',
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFF64748B), size: 22),
            onPressed: _resetProgress,
          ),
        ],
      ),
    );
  }

  Widget _buildUnitSelector() {
    return Container(
      height: 48,
      margin: const EdgeInsets.only(top: 8),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 14),
        itemCount: _units.length,
        itemBuilder: (context, idx) {
          final u = _units[idx];
          final isSelected = u.id == _selectedUnitId;
          return Padding(
            padding: const EdgeInsets.only(left: 8),
            child: InkWell(
              onTap: () => _onUnitChanged(u.id),
              borderRadius: BorderRadius.circular(12),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 8),
                decoration: BoxDecoration(
                  color: isSelected ? const Color(0xFF0284C7) : Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isSelected ? const Color(0xFF0284C7) : const Color(0xFFE2E8F0),
                    width: 1.2,
                  ),
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: const Color(0xFF0284C7).withValues(alpha: 0.22),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ]
                      : null,
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      u.icon,
                      size: 15,
                      color: isSelected ? Colors.white : const Color(0xFF64748B),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      u.shortTitle,
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: isSelected ? FontWeight.w900 : FontWeight.w700,
                        color: isSelected ? Colors.white : const Color(0xFF334155),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildLessonSelector() {
    final availableLessons = _lessons.where((l) => l.unitId == _selectedUnitId).toList();

    return Container(
      height: 40,
      margin: const EdgeInsets.symmetric(vertical: 6),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 14),
        itemCount: availableLessons.length,
        itemBuilder: (context, idx) {
          final l = availableLessons[idx];
          final isSelected = l.id == _selectedLessonId;
          return Padding(
            padding: const EdgeInsets.only(left: 6),
            child: InkWell(
              onTap: () => _onLessonChanged(l.id),
              borderRadius: BorderRadius.circular(9),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
                decoration: BoxDecoration(
                  color: isSelected ? const Color(0xFFE0F2FE) : Colors.transparent,
                  borderRadius: BorderRadius.circular(9),
                  border: Border.all(
                    color: isSelected ? const Color(0xFF38BDF8) : const Color(0xFFE2E8F0),
                    width: 1,
                  ),
                ),
                child: Center(
                  child: Text(
                    l.title,
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: isSelected ? FontWeight.w900 : FontWeight.w600,
                      color: isSelected ? const Color(0xFF0369A1) : const Color(0xFF64748B),
                    ),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildProgressSection(int total, int understood, int currentFilteredCount) {
    final progress = total > 0 ? (understood / total).clamp(0.0, 1.0) : 0.0;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFECFDF5),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: const Color(0xFFA7F3D0)),
                    ),
                    child: Text(
                      'عرفت $understood من $total كارت ✅',
                      style: const TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF065F46),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'كارت ${_currentPage + 1} من $currentFilteredCount',
                    style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF64748B)),
                  ),
                ],
              ),

              // Filter actions
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  InkWell(
                    onTap: () {
                      setState(() {
                        _onlyUnmastered = !_onlyUnmastered;
                        _currentPage = 0;
                      });
                      if (_pageController.hasClients) _pageController.jumpToPage(0);
                    },
                    borderRadius: BorderRadius.circular(6),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(
                        color: _onlyUnmastered ? const Color(0xFFFEF3C7) : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: _onlyUnmastered ? const Color(0xFFFDE68A) : Colors.transparent,
                        ),
                      ),
                      child: Text(
                        _onlyUnmastered ? 'المتبقية فقط 🎯' : 'كل الكروت',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: _onlyUnmastered ? const Color(0xFF92400E) : const Color(0xFF64748B),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  InkWell(
                    onTap: _shuffleCards,
                    borderRadius: BorderRadius.circular(6),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.shuffle_rounded, size: 12, color: Color(0xFF64748B)),
                          SizedBox(width: 3),
                          Text(
                            'خلط',
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF64748B)),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 8),

          // Linear Progress Bar
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 5,
              backgroundColor: const Color(0xFFF1F5F9),
              valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF10B981)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCardItem(FlashcardItem card, int index, int totalCount) {
    final isFlipped = _flippedCards[card.id] ?? false;
    final isUnderstood = _understoodCards.contains(card.id);

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520, maxHeight: 420),
          child: GestureDetector(
            onTap: () => _toggleFlip(card.id),
            child: TweenAnimationBuilder<double>(
              tween: Tween<double>(begin: 0, end: isFlipped ? 180 : 0),
              duration: const Duration(milliseconds: 320),
              curve: Curves.easeOutCubic,
              builder: (context, val, child) {
                final isBack = val >= 90;
                return Transform(
                  alignment: Alignment.center,
                  transform: Matrix4.identity()
                    ..setEntry(3, 2, 0.001)
                    ..rotateY((val * pi) / 180),
                  child: Container(
                    width: double.infinity,
                    height: double.infinity,
                    padding: const EdgeInsets.all(22),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(22),
                      border: Border.all(
                        color: isUnderstood
                            ? const Color(0xFF10B981)
                            : (isBack ? const Color(0xFF38BDF8) : const Color(0xFFE2E8F0)),
                        width: isUnderstood ? 1.8 : 1.2,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF0F172A).withValues(alpha: 0.06),
                          blurRadius: 18,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: isBack
                        ? Transform(
                            alignment: Alignment.center,
                            transform: Matrix4.identity()..rotateY(pi),
                            child: _buildCardBack(card, isUnderstood),
                          )
                        : _buildCardFront(card, index, totalCount, isUnderstood),
                  ),
                );
              },
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCardFront(FlashcardItem card, int index, int totalCount, bool isUnderstood) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        // Top Badges
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFF0F9FF),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFBAE6FD)),
              ),
              child: Text(
                card.lessonTitle,
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0284C7),
                ),
              ),
            ),
            if (isUnderstood)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.check_circle_rounded, size: 12, color: Color(0xFF10B981)),
                    SizedBox(width: 4),
                    Text(
                      'عرفتها ✅',
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF065F46)),
                    ),
                  ],
                ),
              )
            else
              Text(
                '${index + 1} / $totalCount',
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF94A3B8)),
              ),
          ],
        ),

        // Center Question
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  card.concept,
                  style: const TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF475569),
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
              Text(
                card.questionPrompt,
                style: const TextStyle(
                  fontSize: 16.5,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF0F172A),
                  height: 1.55,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),

        // Bottom Tap Indicator
        Container(
          padding: const EdgeInsets.symmetric(vertical: 9),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: const Color(0xFFF1F5F9)),
          ),
          child: const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.touch_app_rounded, size: 15, color: Color(0xFF0284C7)),
              SizedBox(width: 6),
              Text(
                'اضغط على الكارت لكشف الإجابة 🔄',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0284C7),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildCardBack(FlashcardItem card, bool isUnderstood) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        // Top Status
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
              decoration: BoxDecoration(
                color: const Color(0xFFECFDF5),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: const Color(0xFFA7F3D0)),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.lightbulb_rounded, size: 13, color: Color(0xFF059669)),
                  SizedBox(width: 4),
                  Text(
                    'الإجابة النموذجية',
                    style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF065F46)),
                  ),
                ],
              ),
            ),
            const Text(
              'اضغط للرجوع للسؤال ↩',
              style: TextStyle(fontSize: 10, color: Color(0xFF94A3B8), fontWeight: FontWeight.w600),
            ),
          ],
        ),

        // Answer & Key Takeaways
        Expanded(
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.symmetric(vertical: 10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  card.answer,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1E293B),
                    height: 1.6,
                  ),
                ),
                const SizedBox(height: 10),
                const Text(
                  '💡 الخلاصة للامتحان:',
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0284C7),
                  ),
                ),
                const SizedBox(height: 4),
                ...card.keyTakeaways.map(
                  (pt) => Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('• ', style: TextStyle(color: Color(0xFF0284C7), fontWeight: FontWeight.bold)),
                        Expanded(
                          child: Text(
                            pt,
                            style: const TextStyle(
                              fontSize: 11,
                              color: Color(0xFF475569),
                              height: 1.45,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),

        // Action Button: "فهمتها تمام 👍"
        ElevatedButton.icon(
          onPressed: () => _markAsUnderstood(card.id),
          icon: Icon(
            isUnderstood ? Icons.check_circle_rounded : Icons.thumb_up_alt_rounded,
            size: 16,
          ),
          label: Text(
            isUnderstood ? 'تمام ومفهومة خلاص ✅' : 'فهمتها تمام 👍',
            style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900),
          ),
          style: ElevatedButton.styleFrom(
            backgroundColor: isUnderstood ? const Color(0xFF10B981) : const Color(0xFF0284C7),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 11),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            elevation: 0,
          ),
        ),
      ],
    );
  }

  Widget _buildBottomControls(int total) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFE2E8F0), width: 1)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Previous button (Points Right -> in Arabic RTL)
          ElevatedButton(
            onPressed: _currentPage > 0
                ? () {
                    _pageController.previousPage(
                      duration: const Duration(milliseconds: 280),
                      curve: Curves.easeInOut,
                    );
                  }
                : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFF1F5F9),
              foregroundColor: const Color(0xFF334155),
              elevation: 0,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: const [
                Icon(Icons.arrow_back_rounded, size: 16),
                SizedBox(width: 4),
                Text('السابق', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold)),
              ],
            ),
          ),

          // Indicator Dots
          Row(
            mainAxisSize: MainAxisSize.min,
            children: List.generate(min(total, 6), (idx) {
              final active = idx == (_currentPage % 6);
              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 2.5),
                width: active ? 16 : 6,
                height: 6,
                decoration: BoxDecoration(
                  color: active ? const Color(0xFF0284C7) : const Color(0xFFCBD5E1),
                  borderRadius: BorderRadius.circular(3),
                ),
              );
            }),
          ),

          // Next button (Points Left <- in Arabic RTL)
          ElevatedButton(
            onPressed: _currentPage < total - 1
                ? () {
                    _pageController.nextPage(
                      duration: const Duration(milliseconds: 280),
                      curve: Curves.easeInOut,
                    );
                  }
                : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0284C7),
              foregroundColor: Colors.white,
              elevation: 0,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: const [
                Text('التالي', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold)),
                SizedBox(width: 4),
                Icon(Icons.arrow_forward_rounded, size: 16),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                shape: BoxShape.circle,
              ),
              child: const Center(
                child: Icon(Icons.check_circle_outline_rounded, size: 30, color: Color(0xFF10B981)),
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'عاش يا بطل! خلّصت كل كروت التسميع في هذا القسم 🎉',
              style: TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w900,
                color: Color(0xFF0F172A),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),
            const Text(
              'تقدر تعرض كل الكروت للمراجعة أو تختار وحدة ودرس تاني.',
              style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 14),
            ElevatedButton(
              onPressed: () {
                setState(() {
                  _onlyUnmastered = false;
                  _currentPage = 0;
                });
                if (_pageController.hasClients) _pageController.jumpToPage(0);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0284C7),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('عرض كل كروت الوحدة', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}
