import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  MessageCircle,
  ArrowRight,
  BookOpen,
  GraduationCap,
  Laptop,
  Code,
  Calculator,
  Brain,
  Database,
  Cpu,
  Binary,
  Layers,
  Sparkles,
  Award,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubjectItem {
  name: string;
  code: string;
  icon: any;
  description: string;
  tags: string[];
  color: string;
}

const firstYearSubjects: SubjectItem[] = [
  {
    name: "رياضة 1 (Math 1)",
    code: "MATH 101",
    icon: Calculator,
    description: "التفاضل والتكامل، الدوال، النهايات، والتطبيقات الرياضية لطلاب الحاسبات.",
    tags: ["Calculus", "Limits", "Integration"],
    color: "from-blue-500/20 to-cyan-500/20 text-blue-500 border-blue-500/30",
  },
  {
    name: "برمجة 1 (Programming 1)",
    code: "CS 101",
    icon: Code,
    description: "أساسيات البرمجة بلغة C++، المتغيرات، الشروط، الحلقات التكرارية، والدوال.",
    tags: ["C++ Fundamentals", "Logic", "Loops"],
    color: "from-emerald-500/20 to-teal-500/20 text-emerald-500 border-emerald-500/30",
  },
  {
    name: "التفكير الحسابي (Computational Thinking)",
    code: "CS 102",
    icon: Brain,
    description: "تفكيك المشكلات، التفكير المنطقي، وصياغة خوارزميات العمليات البرمجية.",
    tags: ["Problem Solving", "Pseudocode", "Logic"],
    color: "from-purple-500/20 to-pink-500/20 text-purple-500 border-purple-500/30",
  },
  {
    name: "الإحصاء والاحتمالات (Statistics & Probability)",
    code: "STAT 101",
    icon: Binary,
    description: "الاحتمالات، التوزيعات الإحصائية، وتحليل البيانات الأساسية لعلوم الحاسب.",
    tags: ["Probability", "Distributions", "Data"],
    color: "from-amber-500/20 to-orange-500/20 text-amber-500 border-amber-500/30",
  },
  {
    name: "المنطق الرقمي (Logic Design)",
    code: "CS 103",
    icon: Cpu,
    description: "البوابات المنطقية، الجبر البولياني، تصميم الدوائر المنطقية والـ Flip-Flops.",
    tags: ["Logic Gates", "Boolean Algebra", "Circuits"],
    color: "from-indigo-500/20 to-violet-500/20 text-indigo-500 border-indigo-500/30",
  },
  {
    name: "برمجة 2 (Programming 2)",
    code: "CS 104",
    icon: Code,
    description: "المفاهيم المتقدمة في C++، المؤشرات Pointers، إدارة الذاكرة والتطبيقات المتقدمة.",
    tags: ["Pointers", "Memory Management", "Advanced C++"],
    color: "from-emerald-600/20 to-green-500/20 text-emerald-600 border-emerald-600/30",
  },
  {
    name: "بحوث العمليات (OR - Operations Research)",
    code: "OR 101",
    icon: Layers,
    description: "البرمجة الخطية، خوارزمية Simplex، ونماذج تحسين اتخاذ القرار الهندسية.",
    tags: ["Linear Programming", "Simplex", "Optimization"],
    color: "from-rose-500/20 to-red-500/20 text-rose-500 border-rose-500/30",
  },
  {
    name: "البرمجة الشيئية (OOP)",
    code: "CS 105",
    icon: Laptop,
    description: "Classes, Objects, Inheritance, Polymorphism, Encapsulation, & Abstraction.",
    tags: ["Inheritance", "Polymorphism", "Encapsulation"],
    color: "from-[#0866D9]/20 to-blue-600/20 text-[#0866D9] border-[#0866D9]/30",
  },
  {
    name: "الرياضيات المنفصلة (Discrete Math)",
    code: "MATH 102",
    icon: Calculator,
    description: "نظرية المجموعات، العلاقات، الـ Graph Theory، الـ Combinatorics، والإثباتات المنطقية.",
    tags: ["Set Theory", "Graph Theory", "Logic Proofs"],
    color: "from-sky-500/20 to-blue-500/20 text-sky-500 border-sky-500/30",
  },
];

const secondYearSubjects: SubjectItem[] = [
  {
    name: "هياكل البيانات (Data Structures)",
    code: "CS 201",
    icon: Layers,
    description: "Arrays, Linked Lists, Stacks, Queues, Trees, Graphs, & Hash Tables وتطبيقاتها.",
    tags: ["Trees & Graphs", "Hash Tables", "Pointers"],
    color: "from-cyan-500/20 to-blue-500/20 text-cyan-500 border-cyan-500/30",
  },
  {
    name: "الخوارزميات (Algorithms)",
    code: "CS 202",
    icon: Cpu,
    description: "تحليل التعقيد الزمني Asymptotic Analysis, Divide & Conquer, Dynamic Programming, Sorting.",
    tags: ["Big-O", "Dynamic Programming", "Sorting"],
    color: "from-[#0866D9]/20 to-indigo-500/20 text-[#0866D9] border-[#0866D9]/30",
  },
  {
    name: "الذكاء الاصطناعي (AI - Artificial Intelligence)",
    code: "CS 203",
    icon: Brain,
    description: "خوارزميات البحث Search Algorithms, Machine Learning Basics, Neural Networks, Knowledge Representation.",
    tags: ["Machine Learning", "Search Algorithms", "Neural Nets"],
    color: "from-purple-500/20 to-violet-500/20 text-purple-500 border-purple-500/30",
  },
  {
    name: "قواعد البيانات (Database Systems)",
    code: "CS 204",
    icon: Database,
    description: "ER Diagrams, Relational Algebra, SQL Queries, Normalization, Transactions & Indexing.",
    tags: ["SQL", "ERD", "Normalization"],
    color: "from-amber-500/20 to-yellow-500/20 text-amber-500 border-amber-500/30",
  },
];

const faqs = [
  {
    q: "هل الشرح مخصص لجامعة معينة في مصر؟",
    a: "الشرح أونلاين ومخصص لكافة طلاب كليات الحاسبات والمعلومات والهندسة في مصر (القاهرة، عين شمس، الإسكندرية، حلوان، المنصورة، الزقازيق وكل الجامعات الحكومية والخاصة والأهلية).",
  },
  {
    q: "ازاي الشرح بيساعدني في امتحانات الفاينل والميدتيرم؟",
    a: "بنتدرب على حل امتحانات سابقة واقعية للجامعات، مع كتابة الكود وإصلاح الأخطاء وتطبيق النظري عملياً على أجهزة الطلاب.",
  },
  {
    q: "هل ممكن حصص فردية Private لتعويض جزء فايتني؟",
    a: "نعم متوفر حصص فردية وحصص مجموعات صغيرة لتغطية أي مادة أو شبتر محدد قبل الامتحان.",
  },
  {
    q: "لو المادة بتاعتي مش موجودة في القائمة؟",
    a: "تواصل معنا مباشرة عبر الواتساب وسننسق معك مراجعة خاصة للمادة المطلوبة.",
  },
];

export default function UniversityPage() {
  const [activeYear, setActiveYear] = useState<"all" | "year1" | "year2">("all");

  useEffect(() => {
    document.title = "مواد حاسبات ومعلومات وكليات الهندسة | د. محمود المهدي";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "شرح متخصص ومبسط لمواد الفرقة الأولى والثانية بكلية الحاسبات والمعلومات والهندسة مع د. محمود المهدي."
      );
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans" dir="rtl">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="container mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img
              src="/logo.webp"
              alt="د. محمود المهدي"
              className="w-10 h-10 rounded-full border border-blue-500/40 object-cover"
            />
            <div className="flex flex-col">
              <span className="font-black text-base text-white">د. محمود المهدي</span>
              <span className="text-[11px] text-blue-400 font-medium">مواد حاسبات ومعلومات</span>
            </div>
          </a>
          <Button
            asChild
            className="bg-[#0866D9] hover:bg-[#0755b7] text-white font-bold rounded-xl px-5 h-9 text-xs shadow-md shadow-blue-600/20"
          >
            <a href="https://wa.me/201044348610" target="_blank" rel="noreferrer">
              <MessageCircle className="w-4 h-4 me-2" />
              تواصل عبر الواتساب
            </a>
          </Button>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="py-16 lg:py-24 relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800/80">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-blue-600/10 rounded-full blur-[140px]" />
          </div>

          <div className="container mx-auto px-4 lg:px-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-4xl mx-auto text-center space-y-6"
            >
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                <a href="/" className="hover:text-blue-400 transition-colors">
                  الرئيسية
                </a>
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                <span className="text-blue-400 font-bold">مواد كليات الحاسبات والهندسة</span>
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold rounded-full">
                <GraduationCap className="w-4 h-4" />
                <span>دعم وتأسيس طلاب الفرقة الأولى والثانية</span>
              </div>

              <h1 className="text-3xl md:text-5xl font-black text-white leading-tight">
                شرح وتبسيط{" "}
                <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  مواد حاسبات ومعلومات
                </span>
              </h1>

              <p className="text-slate-300 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
                تغطية شاملة وتدريب عملي على امتحانات الفرقة الأولى والثانية — من الأساسيات حتى احتراف البرمجة وهياكل البيانات والذكاء الاصطناعي.
              </p>

              {/* Filter buttons */}
              <div className="flex flex-wrap justify-center gap-3 pt-4">
                <button
                  onClick={() => setActiveYear("all")}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeYear === "all"
                      ? "bg-[#0866D9] text-white shadow-lg shadow-blue-500/25"
                      : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  جميع المواد (13 مادة)
                </button>
                <button
                  onClick={() => setActiveYear("year1")}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeYear === "year1"
                      ? "bg-[#0866D9] text-white shadow-lg shadow-blue-500/25"
                      : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  مواد الفرقة الأولى (9 مواد)
                </button>
                <button
                  onClick={() => setActiveYear("year2")}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeYear === "year2"
                      ? "bg-[#0866D9] text-white shadow-lg shadow-blue-500/25"
                      : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  مواد الفرقة الثانية (4 مواد رئيسية)
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Section 1: Year 1 Subjects */}
        {(activeYear === "all" || activeYear === "year1") && (
          <section className="py-16 border-b border-slate-800/80">
            <div className="container mx-auto px-4 lg:px-8 max-w-6xl space-y-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
                <div>
                  <div className="flex items-center gap-2 text-[#0866D9] font-bold text-xs mb-1">
                    <Sparkles className="w-4 h-4" />
                    <span>تأسيس المنهج الأكاديمي</span>
                  </div>
                  <h2 className="text-2xl font-black text-white">مواد الفرقة الأولى (First Year)</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    تغطية كاملة للمواد الأساسية والتمهيدية لحاسبات ومعلومات
                  </p>
                </div>

                <div className="hidden lg:block w-48 h-20 rounded-2xl overflow-hidden border border-slate-800">
                  <img src="/cs_first_year.png" alt="الفرقة الأولى" className="w-full h-full object-cover" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {firstYearSubjects.map((sub, idx) => {
                  const IconComp = sub.icon;
                  return (
                    <motion.div
                      key={sub.code}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-blue-500/40 transition-all duration-300 flex flex-col justify-between space-y-4 group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className={`p-2.5 rounded-xl border ${sub.color}`}>
                            <IconComp className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-mono font-bold bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md">
                            {sub.code}
                          </span>
                        </div>

                        <h3 className="font-bold text-base text-white group-hover:text-blue-400 transition-colors">
                          {sub.name}
                        </h3>

                        <p className="text-xs text-slate-400 leading-relaxed">{sub.description}</p>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/60">
                        {sub.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] bg-slate-950 text-slate-300 px-2 py-0.5 rounded-md border border-slate-800 font-mono"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Section 2: Year 2 Subjects */}
        {(activeYear === "all" || activeYear === "year2") && (
          <section className="py-16 bg-slate-950/60 border-b border-slate-800/80">
            <div className="container mx-auto px-4 lg:px-8 max-w-6xl space-y-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
                <div>
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs mb-1">
                    <Brain className="w-4 h-4" />
                    <span>التخصص والمفاهيم المتقدمة</span>
                  </div>
                  <h2 className="text-2xl font-black text-white">مواد الفرقة الثانية (Second Year)</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    المواد التخصصية الأكثر أهمية في مقابلات العمل وسوق البرمجيات
                  </p>
                </div>

                <div className="hidden lg:block w-48 h-20 rounded-2xl overflow-hidden border border-slate-800">
                  <img src="/cs_second_year.png" alt="الفرقة الثانية" className="w-full h-full object-cover" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {secondYearSubjects.map((sub, idx) => {
                  const IconComp = sub.icon;
                  return (
                    <motion.div
                      key={sub.code}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.08 }}
                      className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition-all duration-300 space-y-4 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className={`p-3 rounded-xl border ${sub.color}`}>
                          <IconComp className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-mono font-bold bg-slate-800 text-cyan-400 px-2.5 py-1 rounded-lg">
                          {sub.code}
                        </span>
                      </div>

                      <h3 className="font-bold text-lg text-white group-hover:text-cyan-400 transition-colors">
                        {sub.name}
                      </h3>

                      <p className="text-xs md:text-sm text-slate-300 leading-relaxed">{sub.description}</p>

                      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/80">
                        {sub.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs bg-slate-950 text-cyan-300 px-2.5 py-1 rounded-lg border border-slate-800 font-mono"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Feature list + WhatsApp CTA */}
        <section className="py-16 lg:py-20 bg-slate-900/40">
          <div className="container mx-auto px-4 lg:px-8 max-w-4xl text-center space-y-8">
            <div className="space-y-3">
              <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                مميزات الدراسة مع د. محمود المهدي
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-white">لماذا يختار طلاب الجامعة د. محمود؟</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-right">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mb-2" />
                <strong className="text-white text-sm block">حل امتحانات واقعية</strong>
                <p className="text-xs text-slate-400">تدريب مباشر على مسائل الميدتيرم والفاينل للجامعات.</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <Laptop className="w-6 h-6 text-blue-400 mb-2" />
                <strong className="text-white text-sm block">تطبيق كود عملي</strong>
                <p className="text-xs text-slate-400">تطبيق زوم تفاعلي وكتابة الكود خطوة بخطوة.</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <Award className="w-6 h-6 text-amber-400 mb-2" />
                <strong className="text-white text-sm block">مجموعات وحصص فردية</strong>
                <p className="text-xs text-slate-400">إمكانية الترتيب الفردي المكثف قبل الامتحانات.</p>
              </div>
            </div>

            <div className="pt-4">
              <Button
                asChild
                size="lg"
                className="bg-[#0866D9] hover:bg-[#0755b7] text-white font-black rounded-2xl px-10 py-6 text-sm shadow-xl shadow-blue-600/30 hover:scale-[1.02] transition-all"
              >
                <a href="https://wa.me/201044348610" target="_blank" rel="noreferrer">
                  <MessageCircle className="w-5 h-5 me-2" />
                  احجز مراجعة أو حصة تجريبية على واتساب
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-16 border-t border-slate-800/80">
          <div className="container mx-auto px-4 lg:px-8 max-w-3xl space-y-8">
            <h2 className="text-2xl font-black text-white text-center">الأسئلة الشائعة لطلاب الجامعة</h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-right">
                  <p className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    {faq.q}
                  </p>
                  <p className="text-xs md:text-sm text-slate-400 leading-relaxed pr-4">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800/80 py-8 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} د. محمود المهدي — شرح ومراجعات مواد الحاسبات وعلوم البرمجة
      </footer>
    </div>
  );
}
