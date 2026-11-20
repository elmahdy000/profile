# تطبيق طلاب د. محمود المهدي (Dr. Mahmoud Elmahdy - Student App)

تطبيق فلاتر مخصص للطلاب، مبني وفق أحدث المعايير البرمجية وأنماط التصميم المعمارية (**Clean Architecture + MVVM + Repository Pattern + Result Pattern**).

---

## 🏗️ نمط التصميم والمعمارية (Architecture & Design Patterns)

تم تطبيق المعمارية الطبقية الصارمة (**Separation of Concerns**) وتوزيع المسؤوليات كما يلي:

```text
student_app/lib/
├── core/                           # النواة المشتركة
│   ├── constants/                  # الألوان (AppColors) وعناوين الـ API (ApiEndpoints)
│   ├── network/                    # عميل الشبكة (ApiClient) ونمط النتيجة (Result<T>)
│   ├── storage/                    # إدارة التخزين المحلي والجلسات (StorageService)
│   └── theme/                      # الثيمات الفاتحة والداكنة ودعم الخط العربي (AppTheme)
├── domain/                         # طبقة النطاق والقواعد البرمجية (Business Logic & Contracts)
│   ├── entities/                   # الكيانات النقية (Student, Course, Lesson, Quiz, Question)
│   └── repositories/               # واجهات المستودعات (IAuthRepository, ICoursesRepository, IQuizzesRepository)
├── data/                           # طبقة مصادر البيانات
│   ├── models/                     # نماذج التحويل DTO و JSON (StudentModel, QuizModel, CourseModel)
│   └── repositories/               # التطبيق الفعلي للمستودعات متصلاً بالخادم والتخزين
└── presentation/                   # طبقة واجهة المستخدم (MVVM Presentation)
    ├── viewmodels/                 # مدراء الحالة (AuthViewModel, HomeViewModel, CoursesViewModel, ...)
    ├── views/                      # الشاشات والصفحات (Splash, Login, Home, Courses, Quizzes, Homework, Profile)
    └── widgets/                    # المكونات القابلة لإعادة الاستخدام (AppCard, PrimaryButton, StatusBadge)
```

---

## 🌟 الميزات الجوهرية المنفذة

1. **الفصل الجذري بين "الاختبار الإلكتروني" و"الواجب المنزلي الورقي":**
   - **الواجبات (Homework):** تُعرض في تبويب مخصص وصفحة أسئلة ورقية مسطرة بدون مؤقت زمني وبدون حقول كتابة نصية أو أزرار تسليم إلكتروني، مع إرشادات واضحة للحل في كشكول الواجب اليدوي وتسليمه لمساعد المعلم في السنتر.
   - **الاختبارات (Electronic Exams):** مؤقت زمني دقيق، اختيار من متعدد (MCQ)، وحساب درجات فوري وتصحيح معتمد.
2. **تسجيل الدخول وإدارة الجلسة (Auth):**
   - تسجيل برقم الهاتف وكود الطالب مع حفظ الجلسة محلياً عبر `StorageService`.
3. **المحاضرات والشروحات (Courses & Lessons):**
   - استعراض الكورسات المقررة، الوحدات والدروس، وروابط المذكرات والملخصات A4.
4. **الملف الشخصي (Profile):**
   - بيانات الطالب، المسار التعليمي (عربي / لغات)، كود الطالب، والسنتر المسجل به مع زر تسجيل خروج آمن.
5. **دعم العربية والـ RTL وثيم دارك فخم:**
   - جاهز تماماً للاتجاه من اليمين لليسار (`rtl`) مع لوحة ألوان المنصة الرسمية الملكية (Royal Blue & Amber).

---

## 🚀 تشغيل التطبيق (Run & Build)

### تشغيل المشروع في وضع التطوير:
```bash
cd student_app
flutter run
```

### فحص الكود والتحليل الثابت:
```bash
flutter analyze
```

### تشغيل الاختبارات الأوتوماتيكية:
```bash
flutter test
```

### بناء نسخة أندرويد (APK):
```bash
flutter build apk --release
```
