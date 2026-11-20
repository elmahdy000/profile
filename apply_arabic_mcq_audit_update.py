import json
import os

audit_path = r'D:\profile\curriculum_essay_questions\arabic_mcq_final_all_questions_audit_2348.json'
bank_path = r'D:\profile\student_app\assets\data\curriculum_bank.json'
mcq_export_dir = r'D:\profile\curriculum_mcq_questions'
mcq_lesson_dir = os.path.join(mcq_export_dir, 'by_lesson')

with open(audit_path, 'r', encoding='utf-8') as f:
    audit_data = json.load(f)

with open(bank_path, 'r', encoding='utf-8') as f:
    bank_questions = json.load(f)

audit_map = {q['question_id']: q for q in audit_data['questions']}

# Defined replacements for the 12 questions with improved prompts and options
improved_12 = {
    538: {
        'prompt': 'أي ظاهرتين تُعدان من التحديات التي تواجه استمرار تصغير مكونات الدوائر؟',
        'options': [
            'تيارات التسرب والتأثيرات الكمومية',
            'انتشار الإنترنت وتخزين البيانات السحابية',
            'زيادة عدد المستخدمين وتطبيقات الهواتف',
            'استهلاك بطاريات السيارات الكهربائية'
        ],
        'correctIndex': 0,
        'explanation': 'مع استمرار تصغير مكونات الدوائر والاقتراب من الحدود الفيزيائية للترانزستور، تظهر تحديات هندسية وفيزيائية أبرزها تيارات التسرب (Leakage Currents) وتأثيرات ميكانيكا الكم مثل النفق الكمومي.'
    },
    592: {
        'prompt': 'ما أحد الأساليب المذكورة لتحسين أداء الحواسيب مع تزايد صعوبة تصغير مكونات الدوائر؟',
        'options': [
            'استخدام تعدد الأنوية والمعالجة المتوازية',
            'إلغاء استهلاك الطاقة الكهربائية بالكامل',
            'تحويل الحواسيب بالكامل إلى واقع افتراضي',
            'الاعتماد على الترانزستورات الميكانيكية القديمة'
        ],
        'correctIndex': 0,
        'explanation': 'للتغلب على حدود تصغير الترانزستور الفردي، اتجهت صناعة الحواسيب نحو تعدد الأنوية (Multi-core) والمعالجة المتوازية والتصميمات المتخصصة.'
    },
    657: {
        'prompt': 'ما الوظيفة الأساسية للذكاء الاصطناعي التوليدي؟',
        'options': [
            'إنشاء محتوى جديد مثل النصوص والصور والصوت',
            'تخزين الطاقة الكهربائية للحواسيب',
            'تصنيع أجهزة الاستشعار وعدسات الكاميرات',
            'إصلاح أعطال السيارات ميكانيكياً'
        ],
        'correctIndex': 0,
        'explanation': 'الذكاء الاصطناعي التوليدي (Generative AI) يتميز بقدرته على توليد وإنشاء محتوى جديد وغير مسبوق يشمل النصوص والصور والموسيقى والصوت.'
    },
    669: {
        'prompt': 'أي نوع من المحتوى يمكن أن يُنشئه الذكاء الاصطناعي التوليدي؟',
        'options': [
            'نصوص وصور ومقاطع صوتية جديدة',
            'قطع غيار وأسلاك مادية',
            'كهرباء وطاقة شمسية',
            'أجهزة حاسوبية عتادية'
        ],
        'correctIndex': 0,
        'explanation': 'ينتج الذكاء الاصطناعي التوليدي وسائط رقمية جديدة تشمل النصوص، والصور، والمقاطع الصوتية، والفيديو.'
    },
    687: {
        'prompt': 'ما الإجراء المناسب بعد الحصول على إجابة من نظام ذكاء اصطناعي توليدي؟',
        'options': [
            'التحقق من المعلومات ومصادرها قبل استخدامها',
            'قبول الإجابة كحقيقة مطلقة دون فحص',
            'حذف السؤال وإغلاق النظام فوراً',
            'عدم مراجعة الإجابة مع أي مصدر خارجي'
        ],
        'correctIndex': 0,
        'explanation': 'يجب دائماً مراجعة والتحقق من صحة ومصادر المعلومات الصادرة عن نماذج الذكاء الاصطناعي التوليدي لتفادي الوقوع في الأخطاء أو الهلوسة.'
    },
    691: {
        'prompt': 'ما الخطر عند الاعتماد على إجابة مولَّدة دون فحصها؟',
        'options': [
            'قد تبدو المعلومة مقنعة مع أنها خاطئة أو غير مدعومة',
            'فقدان الاتصال بالإنترنت بشكل دائم',
            'حذف نظام التشغيل من جهاز الحاسوب',
            'توقف بطارية الجهاز عن العمل فوراً'
        ],
        'correctIndex': 0,
        'explanation': 'ظاهرة هلوسة الذكاء الاصطناعي تجعل النموذج يقدم معلومات غير صحيحة بأسلوب واثق ومقنع للغاية.'
    },
    694: {
        'prompt': 'أي خطوة تساعد على تقليل خطر الهلوسة؟',
        'options': [
            'التحقق من الإجابة ومقارنتها بمصادر موثوقة',
            'تجاهل المصادر وقبول أول اقتراح',
            'طرح أسئلة مبهمة وغامضة عمداً',
            'الاعتماد على إجابات بدون سياق'
        ],
        'correctIndex': 0,
        'explanation': 'مقارنة المعلومات بمصادر موثوقة وطرح أسئلة واضحة ومحددة يقلل من احتمالية الاعتماد على معلومات مضللة.'
    },
    753: {
        'prompt': 'أي مهمة صناعية تعتمد على تحليل البيانات للتنبؤ بالمشكلات قبل وقوعها؟',
        'options': [
            'الصيانة التنبؤية للآلات',
            'تحديد المسؤولية القانونية في المحاكم',
            'إصدار أحكام أخلاقية مجتمعية',
            'تجاهل قراءات الحساسات وأجهزة الاستشعار'
        ],
        'correctIndex': 0,
        'explanation': 'الصيانة التنبؤية (Predictive Maintenance) تستخدم خوارزميات الذكاء الاصطناعي لتحليل بيانات الحساسات والتنبؤ بأعطال الآلات قبل حدوثها.'
    },
    948: {
        'prompt': 'أي خطوة تساعد على تجنب الاعتماد على معلومات غير صحيحة يولدها الذكاء الاصطناعي؟',
        'options': [
            'التحقق من المخرجات ومصادرها قبل الاعتماد عليها',
            'استخدام سؤال غامض ثم الاعتماد على أول إجابة',
            'اختيار الإجابة الأطول لأنها أكثر دقة دائماً',
            'عدم مقارنة الإجابة بأي مصدر خارجي موثوق'
        ],
        'correctIndex': 0,
        'explanation': 'التحقق من مصادر المعلومات ومقارنة المخرجات يضمن دقة الاعتماد على أدوات الذكاء الاصطناعي.'
    },
    2307: {
        'prompt': 'أي مثال يحقق المصادقة الثنائية (2FA) باستخدام فئتين مختلفتين من العوامل؟',
        'options': [
            'كلمة مرور وبصمة إصبع',
            'كلمة مرور وسؤال أمان (كلاهما معرفة)',
            'بصمة إصبع وبصمة وجه (كلاهما سمة حيوية)',
            'رمز PIN وكلمة مرور (كلاهما معرفة)'
        ],
        'correctIndex': 0,
        'explanation': 'المصادقة الثنائية تتطلب استخدام عاملين من فئتين مختلفتين، مثل: شيء تعرفه (كلمة المرور) وشيء فيك (بصمة الإصبع).'
    },
    2443: {
        'prompt': 'أي مقارنة صحيحة بين دور VPN ودور المنطقة المعزولة (DMZ) في تصميم أمان الشبكات؟',
        'options': [
            'VPN تحمي الاتصال عبر شبكة عامة، بينما DMZ تعزل الخوادم المتاحة خارجيًا عن الشبكة الداخلية',
            'VPN تعزل الخوادم الداخلية، بينما DMZ تشفر اتصالات الأجهزة المحمولة',
            'كلاهما يؤدي نفس الوظيفة بدون أي فارق في أمان الشبكة',
            'DMZ تستخدم للنسخ الاحتياطي فقط، وVPN للبريد الإلكتروني فقط'
        ],
        'correctIndex': 0,
        'explanation': 'الـ VPN توفر نفقاً مشفراً للاتصال الآمن عبر شبكات غير موثوقة، بينما المنطقة المعزولة (DMZ) تضع خوادم الويب العامة في شبكة فرعية مفصولة لحماية الشبكة الداخلية.'
    },
    2451: {
        'prompt': 'لماذا توضع خوادم الويب المتاحة للجمهور في منطقة معزولة (DMZ)؟',
        'options': [
            'لعزلها عن الشبكة الداخلية والحد من أثر الهجمات الخارجية',
            'لتسريع سرعة الإنترنت لجميع الأجهزة بالمنزل',
            'لإلغاء الحاجة إلى استخدام جدران الحماية (Firewall)',
            'لأنها لا تحتاج إلى أي إجراءات أمنية'
        ],
        'correctIndex': 0,
        'explanation': 'توضع الخوادم العامة في الـ DMZ حتى إذا تعرضت للاختراق، تظل الشبكة الداخلية للمؤسسة وقواعد البيانات الحساسة محمية ومعزولة.'
    }
}

# The 7 new questions for Unit 3 Lesson 3
new_7_questions = [
    {
        'id': 3604,
        'unit': 'الوحدة الثالثة: تطبيقات الويب',
        'lesson': 'الدرس الثالث: أساسيات تكنولوجيا الواجهة الأمامية',
        'difficulty': 'medium',
        'category': 'عام',
        'points': 1,
        'type': 'mcq',
        'prompt': 'في صفحة ويب، أي تقنية تُضيف استجابة عند الضغط على زر وتتيح تحديث جزء من الشاشة؟',
        'options': [
            'JavaScript لإضافة السلوك والتفاعل',
            'HTML لبناء الهيكل الثابت فقط',
            'CSS لتنسيق الألوان والخطوط',
            'بروتوكول DNS لتحديد اسم النطاق'
        ],
        'correctIndex': 0,
        'explanation': 'تُستخدم JavaScript لإضافة السلوك التفاعلي والاستجابة لأحداث المستخدم مثل النقر وتحديث أجزاء من الصفحة ديناميكياً.'
    },
    {
        'id': 3605,
        'unit': 'الوحدة الثالثة: تطبيقات الويب',
        'lesson': 'الدرس الثالث: أساسيات تكنولوجيا الواجهة الأمامية',
        'difficulty': 'easy',
        'category': 'عام',
        'points': 1,
        'type': 'mcq',
        'prompt': 'أي توزيع يوضح دور HTML وCSS وJavaScript في إنشاء صفحة ويب؟',
        'options': [
            'HTML للبنية، وCSS للمظهر، وJavaScript للسلوك والتفاعل',
            'HTML للمظهر، وCSS للتفاعل، وJavaScript للبنية',
            'HTML للتفاعل، وCSS للبنية، وJavaScript للمظهر',
            'HTML لقواعد البيانات، وCSS للتشفير، وJavaScript للشبكات'
        ],
        'correctIndex': 0,
        'explanation': 'HTML تحدد هيكل وبنية المحتوى، وCSS تحدد التنسيق والمظهر الجمالي، وJavaScript تحدد السلوك والتفاعل الديناميكي.'
    },
    {
        'id': 3606,
        'unit': 'الوحدة الثالثة: تطبيقات الويب',
        'lesson': 'الدرس الثالث: أساسيات تكنولوجيا الواجهة الأمامية',
        'difficulty': 'medium',
        'category': 'عام',
        'points': 1,
        'type': 'mcq',
        'prompt': 'يحتاج نموذج في صفحة ويب إلى فحص صحة ما يكتبه المستخدم قبل متابعة الإجراء. ما التقنية المرتبطة بهذا السلوك؟',
        'options': [
            'JavaScript لأنها تضيف التفاعل والتحقق من المدخلات',
            'CSS لأنها تحدد حجم حقل الإدخال ولونه',
            'HTML لأنها ترسل البيانات إلى السيرفر السحابي',
            'بروتوكول HTTP لأنه يعالج الصور تلقائياً'
        ],
        'correctIndex': 0,
        'explanation': 'تُستخدم JavaScript في الواجهة الأمامية للتحقق من صحة مدخلات النماذج (Form Validation) قبل إرسالها إلى الخادم.'
    },
    {
        'id': 3607,
        'unit': 'الوحدة الثالثة: تطبيقات الويب',
        'lesson': 'الدرس الثالث: أساسيات تكنولوجيا الواجهة الأمامية',
        'difficulty': 'easy',
        'category': 'عام',
        'points': 1,
        'type': 'mcq',
        'prompt': 'هل يجب أن تستخدم كل صفحة ويب HTML وCSS وJavaScript معًا دائمًا؟',
        'options': [
            'لا؛ يمكن استخدام HTML وحدها أو مع CSS وJavaScript وفق الوظائف المطلوبة',
            'نعم؛ لا يمكن لأي متصفح فتح أي صفحة دون وجود الثلاث لغات معاً',
            'نعم؛ لأن كود HTML لا يمكن عرضه إطلاقاً بدون كود JavaScript',
            'لا؛ يجب استبدال HTML دائماً بلغات قواعد البيانات'
        ],
        'correctIndex': 0,
        'explanation': 'يمكن إنشاء صفحة ويب بسيطة باستخدام HTML وحدها، وتُضاف CSS لتنسيق المظهر وJavaScript عند الحاجة للتفاعل.'
    },
    {
        'id': 3608,
        'unit': 'الوحدة الثالثة: تطبيقات الويب',
        'lesson': 'الدرس الثالث: أساسيات تكنولوجيا الواجهة الأمامية',
        'difficulty': 'medium',
        'category': 'عام',
        'points': 1,
        'type': 'mcq',
        'prompt': 'في صفحة نادٍ طلابي تعرض قائمة فعاليات وعدادًا يتغير عند الضغط على زر التسجيل، أي مهمة تتولاها JavaScript؟',
        'options': [
            'جعل عداد التسجيل يستجيب للضغط ويُحدِّث العدد',
            'تحديد نوع خط وعنوان الصفحة الرئيسي',
            'إنشاء الجداول والقوائم الأساسية للهيكل',
            'تخزين الصفحة كملف PDF على الخادم'
        ],
        'correctIndex': 0,
        'explanation': 'تعديل العداد وتحديث القيمة على الشاشة فور الضغط على الزر هو سلوك تفاعلي تتولاه JavaScript.'
    },
    {
        'id': 3609,
        'unit': 'الوحدة الثالثة: تطبيقات الويب',
        'lesson': 'الدرس الثالث: أساسيات تكنولوجيا الواجهة الأمامية',
        'difficulty': 'medium',
        'category': 'عام',
        'points': 1,
        'type': 'mcq',
        'prompt': 'ما الفرق الأدق بين وظيفة JavaScript وفكرة التصميم المتجاوب؟',
        'options': [
            'JavaScript تضيف السلوك والتفاعل، والتصميم المتجاوب يضبط التخطيط لأحجام الشاشات',
            'JavaScript تضبط أحجام الشاشات، والتصميم المتجاوب يكتب الكود البرمجي',
            'كلاهما وظيفة واحدة تنفذها لغة CSS فقط دون أي فرق',
            'JavaScript تستخدم في السيرفر فقط، والتصميم المتجاوب في المتصفح فقط'
        ],
        'correctIndex': 0,
        'explanation': 'JavaScript مسؤولة عن برمجة تفاعل المستخدم وسلوك الصفحة، بينما التصميم المتجاوب (Responsive Design) يعتمد أساساً على CSS لجعل الصفحة تتكيف مع الشاشات المختلفة.'
    },
    {
        'id': 3610,
        'unit': 'الوحدة الثالثة: تطبيقات الويب',
        'lesson': 'الدرس الثالث: أساسيات تكنولوجيا الواجهة الأمامية',
        'difficulty': 'medium',
        'category': 'عام',
        'points': 1,
        'type': 'mcq',
        'prompt': 'أي مما يلي ليس من عناصر HTML الدلالية؟',
        'options': [
            '<E-mail>',
            '<header>',
            '<nav>',
            '<article>'
        ],
        'correctIndex': 0,
        'explanation': 'العناصر الدلالية في HTML تصف بوضوح معناها ودورها للمتصفح مثل <header> و<nav> و<article>، بينما لا يوجد عنصر دلالي معتمد باسم <E-mail>.'
    }
]

# Helper to format assessment citation in Arabic
def format_citation(source_type, sources):
    if not sources:
        if source_type == 'OFFICIAL_ASSESSMENT':
            return 'تقييمات الوزارة الرسمية المعتمدة'
        elif source_type == 'ASSESSMENT_ADAPTED':
            return 'من أفكار تقييمات الوزارة'
        return None
    
    pages = []
    for s in sources:
        p = s.get('pdf_page')
        if p and p not in pages:
            pages.append(p)
    
    page_str = f" ص {', '.join(str(p) for p in pages)}" if pages else ''
    if source_type == 'OFFICIAL_ASSESSMENT':
        return f"تقييمات الوزارة الرسمية -{page_str}"
    elif source_type == 'ASSESSMENT_ADAPTED':
        return f"فكرة تقييمات معتمدة -{page_str}"
    return None

# Merge audit metadata into bank questions
updated_bank = []
seen_ids = set()

for q in bank_questions:
    qid = q.get('id')
    seen_ids.add(qid)
    
    # Check if this question is in audit
    aq = audit_map.get(qid)
    if aq:
        # Check if question is one of the 12 improved questions
        if qid in improved_12:
            q.update(improved_12[qid])
        
        # Merge audit metadata
        is_official = aq.get('is_official_assessment_question', False)
        source_type = aq.get('source_type', 'PRACTICE')
        sources = aq.get('assessment_sources', [])
        citation = format_citation(source_type, sources)
        is_enabled = aq.get('is_import_enabled', True)
        
        q['is_official_assessment'] = is_official
        q['source_type'] = source_type
        q['assessment_sources'] = sources
        q['assessment_citation'] = citation
        q['is_import_enabled'] = is_enabled
    else:
        q['is_official_assessment'] = False
        q['source_type'] = 'PRACTICE'
        q['assessment_sources'] = []
        q['assessment_citation'] = None
        q['is_import_enabled'] = True
        
    updated_bank.append(q)

# Append the 7 new questions
for nq in new_7_questions:
    qid = nq['id']
    if qid not in seen_ids:
        aq = audit_map.get(qid, {})
        is_official = aq.get('is_official_assessment_question', False)
        source_type = aq.get('source_type', 'PRACTICE')
        sources = aq.get('assessment_sources', [])
        citation = format_citation(source_type, sources)
        
        nq['is_official_assessment'] = is_official
        nq['source_type'] = source_type
        nq['assessment_sources'] = sources
        nq['assessment_citation'] = citation
        nq['is_import_enabled'] = True
        
        updated_bank.append(nq)
        seen_ids.add(qid)

# Save updated curriculum_bank.json
with open(bank_path, 'w', encoding='utf-8') as f:
    json.dump(updated_bank, f, ensure_ascii=False, indent=2)

print(f'Successfully updated {bank_path}!')
print(f'Total questions in bank: {len(updated_bank)}')

# Re-export curriculum_mcq_questions
os.system('python d:\\profile\\export_mcq_questions.py')
