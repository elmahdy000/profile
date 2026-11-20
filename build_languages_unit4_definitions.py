import json
import os

unit_4_en = {
    "unit_number": 4,
    "unit_title_en": "Unit 4: Web Design and Media",
    "unit_title_ar": "الوحدة الرابعة: تصميم الويب والوسائط",
    "total_definitions": 27,
    "lessons": [
        {
            "unit_number": 4,
            "unit_title_en": "Unit 4: Web Design and Media",
            "unit_title_ar": "الوحدة الرابعة: تصميم الويب والوسائط",
            "lesson_number": 11,
            "lesson_title_en": "Lesson 1: Media Types and Characteristics",
            "lesson_title_ar": "الدرس الأول: أنواع الوسائط وخصائصها",
            "total_definitions": 2,
            "definitions": [
                {
                    "id": "DEF-138",
                    "term_ar": "الاتصال أحادي الاتجاه",
                    "term_en": "One-Way Communication",
                    "definition_ar": "من المرسل إلى المستقبل فقط.",
                    "definition_en": "Information flows in a single direction from the sender to the receiver without interactive feedback or participation.",
                    "explanation_ar": "بث للمعلومات فقط دون استقبال رد من المستخدم مثل البث التلفزيوني أو الراديو.",
                    "explanation_en": "Information transmission where the user passively receives content without the ability to interact or respond."
                },
                {
                    "id": "DEF-139",
                    "term_ar": "الاتصال ثنائي الاتجاه",
                    "term_en": "Two-Way Communication",
                    "definition_ar": "يمكن للمستخدمين الاستجابة والمشاركة.",
                    "definition_en": "Interactive communication where users can actively respond, provide feedback, and participate in the exchange of information.",
                    "explanation_ar": "تواصل تفاعلي يتيح للمستخدم التفاعل والمشاركة كالمواقع التفاعلية وشبكات التواصل.",
                    "explanation_en": "Bidirectional data exchange enabling active user feedback, comments, and real-time interaction."
                }
            ]
        },
        {
            "unit_number": 4,
            "unit_title_en": "Unit 4: Web Design and Media",
            "unit_title_ar": "الوحدة الرابعة: تصميم الويب والوسائط",
            "lesson_number": 12,
            "lesson_title_en": "Lesson 2: Information Architecture and User Experience for Websites",
            "lesson_title_ar": "الدرس الثاني: تصميم المعلومات وتجربة المستخدم للمواقع الإلكترونية",
            "total_definitions": 9,
            "definitions": [
                {
                    "id": "DEF-140",
                    "term_ar": "شخصية المستخدم (Persona)",
                    "term_en": "User Persona",
                    "definition_ar": "تمثيل لنوع من المستخدمين، يُبنى قدر الإمكان على بحث أو بيانات عن أهدافهم واحتياجاتهم وسلوكهم وسياقهم وتحدياتهم.",
                    "definition_en": "A semi-fictional archetype representing a target user segment, constructed based on empirical research and user data regarding their goals, needs, behaviors, context, and pain points.",
                    "explanation_ar": "نموذج افتراضي مبني على بيانات حقيقية لفهم احتياجات المستخدم المستهدف وسلوكه.",
                    "explanation_en": "A research-based fictional representation of the ideal user to guide product decisions."
                },
                {
                    "id": "DEF-141",
                    "term_ar": "المخطط الهيكلي (Wireframe)",
                    "term_en": "Wireframe",
                    "definition_ar": "مخطط أولي يساعد على تحديد أماكن العناصر وأولوياتها، وغالبًا يستخدم تفاصيل بصرية قليلة حتى يركز الفريق على البنية قبل التصميم البصري النهائي.",
                    "definition_en": "A low-fidelity visual blueprint that defines page element positioning, information hierarchy, and layout structure before visual design and styling are applied.",
                    "explanation_ar": "رسم تخطيطي بسيط بالأبيض والأسود يوضح هيكل الصفحة قبل إضافة الألوان والصور.",
                    "explanation_en": "A skeletal layout of a webpage used to establish content hierarchy and functionality early."
                },
                {
                    "id": "DEF-142",
                    "term_ar": "مبادئ التصميم الأربعة (CRAP)",
                    "term_en": "CRAP Design Principles",
                    "definition_ar": "المبادئ البصرية الأربعة هي: التباين، والتكرار، والمحاذاة، والتقارب؛ وتساعد على تنظيم الشكل وجعل الصفحة أسهل للفهم، لكنها لا تحل محل معايير قابلية الاستخدام أو إمكانية الوصول.",
                    "definition_en": "The four fundamental visual design principles: Contrast, Repetition, Alignment, and Proximity, which organize visual structure and enhance readability without replacing usability and accessibility standards.",
                    "explanation_ar": "مبادئ التصميم الأساسية لتنظيم العناصر بصرياً وجعل الصفحة واضحة وسهلة القراءة.",
                    "explanation_en": "Four core guidelines to structure layout, improve scanability, and maintain visual order."
                },
                {
                    "id": "DEF-143",
                    "term_ar": "التباين (Contrast)",
                    "term_en": "Contrast",
                    "definition_ar": "جعل أولوية المعلومات واضحة وإبراز أهم العناصر فورًا.",
                    "definition_en": "The visual difference between elements that highlights focal points, clarifies hierarchy, and makes key information immediately prominent.",
                    "explanation_ar": "اختلاف درجات اللون أو الحجم لإبراز العناصر الهامة وجذب انتباه العين.",
                    "explanation_en": "Using stark differences in color, size, or weight to make essential elements stand out."
                },
                {
                    "id": "DEF-144",
                    "term_ar": "التكرار (Repetition)",
                    "term_en": "Repetition",
                    "definition_ar": "تكرار خصائص معينة لتحقيق الاتساق في التصميم ككل، مما يتيح للمستخدمين التنقل دون تشتت.",
                    "definition_en": "Reusing specific visual and functional elements throughout the design to establish unity, consistency, and intuitive navigation.",
                    "explanation_ar": "إعادة استخدام نفس الأنماط والألوان والخطوط لتوفير تجربة متجانسة وسلسة.",
                    "explanation_en": "Repeating design characteristics across screens to reinforce familiarity and coherence."
                },
                {
                    "id": "DEF-145",
                    "term_ar": "المحاذاة (Alignment)",
                    "term_en": "Alignment",
                    "definition_ar": "محاذاة موضع كل عنصر إلى خط أساس مشترك، مما يمنح الشاشة بأكملها نظامًا.",
                    "definition_en": "Arranging elements along common horizontal or vertical grid lines to create visual balance, structural order, and clean reading paths.",
                    "explanation_ar": "ترتيب العناصر على خطوط محددة لمنح الشاشة ترتيباً وتنظيماً مريحاً للعين.",
                    "explanation_en": "Positioning elements along shared axes to produce a structured, professional appearance."
                },
                {
                    "id": "DEF-146",
                    "term_ar": "التقارب (Proximity)",
                    "term_en": "Proximity",
                    "definition_ar": "وضع المعلومات المرتبطة قريبة من بعضها حتى تُدرك كمجموعة واحدة من أول نظرة.",
                    "definition_en": "Grouping related items physically close to one another so users perceive them as a coherent single unit at first glance.",
                    "explanation_ar": "تجميع العناصر ذات الصلة بجانب بعضها ليدرك المستخدم أنها وحدة واحدة.",
                    "explanation_en": "Placing related content close together to establish semantic grouping and reduce cognitive load."
                },
                {
                    "id": "DEF-147",
                    "term_ar": "التصميم المتمحور حول المستخدم (UCD)",
                    "term_en": "User-Centered Design (UCD)",
                    "definition_ar": "نهج يجعل فهم المستخدمين واحتياجاتهم وسياق استخدامهم أساسًا لقرارات التصميم.",
                    "definition_en": "An iterative design philosophy where user needs, context, limitations, and expectations drive every product and design decision.",
                    "explanation_ar": "منهجية تضع احتياجات المستخدم ورغباته في قلب كل مرحلة من مراحل التصميم.",
                    "explanation_en": "A framework that keeps end-users at the center of each phase of the design process."
                },
                {
                    "id": "DEF-148",
                    "term_ar": "قابلية الاستخدام (Usability)",
                    "term_en": "Usability",
                    "definition_ar": "سهولة وفاعلية إنجاز المهام.",
                    "definition_en": "The degree of ease, efficiency, and satisfaction with which users can achieve specified goals in a system.",
                    "explanation_ar": "مدى قدرة المستخدم على إنجاز مهامه بسهولة وسرعة ودون أخطاء.",
                    "explanation_en": "A quality attribute assessing how easy user interfaces are to use and navigate."
                }
            ]
        },
        {
            "unit_number": 4,
            "unit_title_en": "Unit 4: Web Design and Media",
            "unit_title_ar": "الوحدة الرابعة: تصميم الويب والوسائط",
            "lesson_number": 13,
            "lesson_title_en": "Lesson 3: Website Evaluation Methods",
            "lesson_title_ar": "الدرس الثالث: طرق تقييم المواقع الإلكترونية",
            "total_definitions": 12,
            "definitions": [
                {
                    "id": "DEF-149",
                    "term_ar": "التقييم النوعي",
                    "term_en": "Qualitative Evaluation",
                    "definition_ar": "فهم تجربة المستخدم وأسباب السلوك والمشكلات من خلال الملاحظة والمقابلات وغيرها.",
                    "definition_en": "Investigating user attitudes, underlying behaviors, and emotional reactions through observational studies, user interviews, and field research.",
                    "explanation_ar": "تقييم يركز على استكشاف أسباب سلوك المستخدم ومشاكله بصورة وصفية.",
                    "explanation_en": "Non-numerical analysis focused on why users behave or struggle in certain ways."
                },
                {
                    "id": "DEF-150",
                    "term_ar": "التقييم الكمي",
                    "term_en": "Quantitative Evaluation",
                    "definition_ar": "قياس السلوك والنتائج باستخدام بيانات عددية ومقاييس محددة بوضوح.",
                    "definition_en": "Measuring user interactions and system outcomes using statistically rigorous numerical metrics and clear quantitative benchmarks.",
                    "explanation_ar": "تقييم يعتمد على الأرقام والإحصائيات مثل معدل التحويل وسرعة الصفحة.",
                    "explanation_en": "Data-driven measurement producing quantifiable metrics like time on task and error rates."
                },
                {
                    "id": "DEF-151",
                    "term_ar": "اختبار قابلية الاستخدام",
                    "term_en": "Usability Testing",
                    "definition_ar": "مراقبة العمليات الفعلية لتحديد النقاط التي يصعب استخدامها.",
                    "definition_en": "Observing real users as they perform realistic tasks on the site to uncover usability flaws, bottlenecks, and navigation friction.",
                    "explanation_ar": "ملاحظة أداء المستخدمين الحقيقيين أثناء تنفيذ مهام واقعية لكشف نقاط التعثر.",
                    "explanation_en": "An empirical method to evaluate a interface by testing it directly on representative users."
                },
                {
                    "id": "DEF-152",
                    "term_ar": "المقابلات",
                    "term_en": "User Interviews",
                    "definition_ar": "الاستماع إلى آراء المستخدمين المباشرة لفهم احتياجاتهم واستيائهم.",
                    "definition_en": "Direct one-on-one structured dialogues with users to gather qualitative insights into their expectations, preferences, and frustrations.",
                    "explanation_ar": "جلسات حوارية فردية للاستماع إلى آراء المستخدمين وتجاربهم ومقترحاتهم.",
                    "explanation_en": "Guided conversations used to understand users' personal motivations and pain points."
                },
                {
                    "id": "DEF-153",
                    "term_ar": "تحليلات الويب",
                    "term_en": "Web Analytics",
                    "definition_ar": "جمع وقياس وتحليل بيانات استخدام الموقع لفهم الوصول والتفاعل والنتائج.",
                    "definition_en": "The systematic collection, measurement, and reporting of website traffic data to comprehend usage patterns, optimize performance, and achieve business goals.",
                    "explanation_ar": "تتبع وقياس زيارات وتفاعل المستخدمين مع صفحات الموقع لتحسين تجربة التصفح.",
                    "explanation_en": "Tracking and interpreting visitor behavior and session flow across web properties."
                },
                {
                    "id": "DEF-154",
                    "term_ar": "مشاهدات الصفحة (PV)",
                    "term_en": "Pageviews (PV)",
                    "definition_ar": "العدد الإجمالي لمرات مشاهدة الصفحة.",
                    "definition_en": "The cumulative total number of times an individual webpage has been loaded or reloaded by a browser.",
                    "explanation_ar": "إجمالي عدد المرات التي تم فتح الصفحة أو إعادة تحميلها من المستخدمين.",
                    "explanation_en": "A tally tracking every instance an HTML document is requested and rendered."
                },
                {
                    "id": "DEF-155",
                    "term_ar": "معدل الارتداد (Bounce Rate)",
                    "term_en": "Bounce Rate",
                    "definition_ar": "مؤشر للتفاعل تختلف طريقة حسابه بين أدوات التحليلات وإعداداتها؛ لذلك يجب تفسيره وفق تعريف الأداة المستخدمة.",
                    "definition_en": "An engagement metric representing single-page sessions without meaningful interaction, interpreted according to the specific analytics tool's criteria.",
                    "explanation_ar": "نسبة الزوار الذين يدخلون صفحة واحدة ثم يغادرون دون التفاعل أو الانتقال لصفحات أخرى.",
                    "explanation_en": "The percentage of visits where a user leaves after viewing only a single page."
                },
                {
                    "id": "DEF-156",
                    "term_ar": "معدل التحويل (CVR)",
                    "term_en": "Conversion Rate (CVR)",
                    "definition_ar": "نسبة المستخدمين أو الجلسات التي حققت إجراءً مستهدفًا، مع تحديد المقام وطريقة الحساب.",
                    "definition_en": "The percentage of site visitors or sessions that successfully complete a desired target action (such as registration, purchase, or download).",
                    "explanation_ar": "النسبة المئوية للزوار الذين يكملون هدفاً محدداً كالتسجيل أو الشراء.",
                    "explanation_en": "The ratio of successful conversions to total visitors or sessions."
                },
                {
                    "id": "DEF-157",
                    "term_ar": "التقييم الإرشادي (Heuristic Evaluation)",
                    "term_en": "Heuristic Evaluation",
                    "definition_ar": "مراجعة يجريها خبراء لواجهة المستخدم استنادًا إلى قواعد أو مبادئ إرشادية عملية، وهي شكل من أشكال التقييم النوعي.",
                    "definition_en": "An expert inspection method in which usability specialists examine an interface against recognized usability heuristics (e.g., Nielsen's heuristics).",
                    "explanation_ar": "فحص ومراجعة يقوم به خبراء واجهات المستخدم لمطابقة التصميم مع القواعد القياسية المعتمدة.",
                    "explanation_en": "Expert-driven inspection of UI elements judged against proven usability heuristics."
                },
                {
                    "id": "DEF-158",
                    "term_ar": "الاتساق",
                    "term_en": "Consistency",
                    "definition_ar": "ما إذا كان التصميم والعمليات موحدة عبر الموقع.",
                    "definition_en": "Ensuring visual elements, typography, interactive controls, and behavioral patterns operate uniformly across the entire website.",
                    "explanation_ar": "توحيد أشكال الأزرار والألوان والخطوط عبر كل صفحات الموقع لعدم إرباك المستخدم.",
                    "explanation_en": "Uniform styling and behavior that allows users to transfer knowledge across pages."
                },
                {
                    "id": "DEF-159",
                    "term_ar": "منع الأخطاء",
                    "term_en": "Error Prevention",
                    "definition_ar": "ما إذا كان التصميم يجعل من الصعب على المستخدمين ارتكاب الأخطاء.",
                    "definition_en": "Designing defensive interfaces with clear constraints, confirmation dialogs, and smart defaults that prevent errors before they occur.",
                    "explanation_ar": "تصميم ذكي يساعد المستخدم على تجنب الوقوع في الخطأ قبل حدوثه (مثل التأكيد قبل الحذف).",
                    "explanation_en": "Proactive design mechanisms that eliminate error-prone conditions or warn users beforehand."
                },
                {
                    "id": "DEF-160",
                    "term_ar": "وضوح حالة النظام",
                    "term_en": "Visibility of System Status",
                    "definition_ar": "ما إذا كانت حالة النظام موضحة بوضوح للمستخدمين، مثل مؤشرات المعالجة ورسائل أخطاء الإدخال.",
                    "definition_en": "Keeping users continuously informed about what is happening through timely, clear feedback within reasonable time (e.g., progress bars, status messages).",
                    "explanation_ar": "إعلام المستخدم بحالة الإجراءات الجارية فوراً (مثل شريط التحميل أو رسائل النجاح والخطأ).",
                    "explanation_en": "Providing continuous, transparent feedback so users know the current state of operations."
                }
            ]
        },
        {
            "unit_number": 4,
            "unit_title_en": "Unit 4: Web Design and Media",
            "unit_title_ar": "الوحدة الرابعة: تصميم الويب والوسائط",
            "lesson_number": 14,
            "lesson_title_en": "Lesson 4: Iterative Website Improvement Process",
            "lesson_title_ar": "الدرس الرابع: عملية التحسين التكراري للمواقع",
            "total_definitions": 4,
            "definitions": [
                {
                    "id": "DEF-161",
                    "term_ar": "دورة PDCA",
                    "term_en": "PDCA Cycle",
                    "definition_ar": "طريقة تدفع التحسين قدمًا باستمرار من خلال تكرار الخطوات الأربع: خطط، نفذ، تحقق، تصرف.",
                    "definition_en": "A four-stage iterative management method: Plan, Do, Check, Act, used for the continuous control and continual improvement of processes and products.",
                    "explanation_ar": "منهجية مستمرة لتحسين الجودة عبر أربع خطوات متكررة: خطط، نفذ، راجع، تصرف.",
                    "explanation_en": "A continuous loop framework (Plan-Do-Check-Act) to drive systemic, incremental product improvements."
                },
                {
                    "id": "DEF-162",
                    "term_ar": "التحسين المستمر",
                    "term_en": "Continuous Improvement",
                    "definition_ar": "التحسن قليلًا في كل مرة.",
                    "definition_en": "An ongoing incremental effort to enhance web products, services, or user experience over time through successive refinement cycles.",
                    "explanation_ar": "نهج تطويري مستمر يركز على التطوير التدريجي المنتظم دون توقف.",
                    "explanation_en": "Incremental, consistent enhancement of product features and usability over time."
                },
                {
                    "id": "DEF-163",
                    "term_ar": "التفكير التصميمي (Design Thinking)",
                    "term_en": "Design Thinking",
                    "definition_ar": "طريقة مرنة لفهم المشكلة من منظور المستخدم وتجربة حلول ثم تحسينها.",
                    "definition_en": "A human-centric, non-linear problem-solving methodology comprising Empathize, Define, Ideate, Prototype, and Test phases to address complex challenges.",
                    "explanation_ar": "منهجية إبداعية تبدأ بفهم مشاعر واحتياجات المستخدمين وتجربة نماذج عملية وتطويرها.",
                    "explanation_en": "A collaborative, empathy-based framework for solving complex problems via rapid prototyping and testing."
                },
                {
                    "id": "DEF-164",
                    "term_ar": "اختبار A/B",
                    "term_en": "A/B Testing",
                    "definition_ar": "تجربة تقارن نسختين A وB وفق مقياس محدد مسبقًا، ويُوزع المستخدمون أو الزيارات بينهما بطريقة عشوائية قدر الإمكان أو وفق تصميم تجربة مناسب.",
                    "definition_en": "A randomized controlled experiment in which two variants of a webpage (A and B) are compared against a predetermined target metric to determine the higher-performing version.",
                    "explanation_ar": "مقارنة نسختين مختلفتين من صفحة الويب لاختبار أيهما يحقق تفاعلاً وأداءً أعلى مع الزوار.",
                    "explanation_en": "A controlled split experiment measuring conversion differences between two variants of an interface."
                }
            ]
        }
    ]
}

# Write unit_4_definitions_en.json
out_dir = r"d:\profile\curriculum_definitions\languages_schools"
os.makedirs(out_dir, exist_ok=True)
unit4_path = os.path.join(out_dir, "unit_4_definitions_en.json")
with open(unit4_path, "w", encoding="utf-8") as f:
    json.dump(unit_4_en, f, ensure_ascii=False, indent=2)
print("Wrote unit_4_definitions_en.json successfully!")

# Write individual lesson files
by_lesson_dir = os.path.join(out_dir, "by_lesson")
os.makedirs(by_lesson_dir, exist_ok=True)
lesson_filenames = {
    11: "11_Lesson_1_Media_Types_and_Characteristics.json",
    12: "12_Lesson_2_Information_Architecture_and_UX.json",
    13: "13_Lesson_3_Website_Evaluation_Methods.json",
    14: "14_Lesson_4_Iterative_Website_Improvement_Process.json"
}

for lesson in unit_4_en["lessons"]:
    num = lesson["lesson_number"]
    fname = lesson_filenames.get(num, f"{num:02d}_lesson.json")
    lpath = os.path.join(by_lesson_dir, fname)
    with open(lpath, "w", encoding="utf-8") as f:
        json.dump(lesson, f, ensure_ascii=False, indent=2)
    print(f"Wrote {fname}")

# Now merge all 4 units into all_languages_definitions.json
u1_path = os.path.join(out_dir, "unit_1_definitions_en.json")
u2_path = os.path.join(out_dir, "unit_2_definitions_en.json")
u3_path = os.path.join(out_dir, "unit_3_definitions_en.json")

units = []
total_defs = 0

for p in [u1_path, u2_path, u3_path, unit4_path]:
    if os.path.exists(p):
        with open(p, "r", encoding="utf-8") as f:
            u_data = json.load(f)
            units.append(u_data)
            total_defs += u_data.get("total_definitions", 0)

all_en = {
    "metadata": {
        "title": "Comprehensive Curriculum Definitions - Languages Schools (English)",
        "source": "Egyptian Ministry of Education - Senior 2 Official Curriculum",
        "total_units": len(units),
        "total_definitions": total_defs,
        "language": "English (with Arabic Reference Terms & Explanations)"
    },
    "units": units
}

all_en_path = os.path.join(out_dir, "all_languages_definitions.json")
with open(all_en_path, "w", encoding="utf-8") as f:
    json.dump(all_en, f, ensure_ascii=False, indent=2)

print(f"Updated all_languages_definitions.json successfully with {total_defs} definitions across {len(units)} units!")
