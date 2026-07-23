import { useEffect, useState } from "react";
import { useCreateBooking } from "@workspace/api-client-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { FloatingButtons } from "@/components/FloatingButtons";
import { Navbar } from "@/components/Navbar";
import { SETTINGS_KEYS, useSiteSettings } from "@/hooks/useSiteSettings";
import {
  ArrowLeft, BarChart3, BookOpen, Check, CheckCircle2, ClipboardCheck,
  Clock3, FileText, GraduationCap, Laptop2, MapPin, MessageCircle,
  MonitorPlay, Play, Send, ShieldCheck, Star, UserCheck, Users,
} from "lucide-react";

type BookingForm = { parentName: string; studentName: string; phone: string; grade: string; schoolType: string; mode: string; message: string };
type Testimonial = { quote: string; author: string; role: string; stars?: number; initials?: string };

const initialBooking: BookingForm = { parentName: "", studentName: "", phone: "", grade: "أولى بكالوريا", schoolType: "عربي", mode: "أونلاين", message: "" };

const problems = [
  ["الحفظ بدل الفهم", "الطالب يحفظ شكل الكود، لكن أول ما السؤال يتغير مش بيعرف يبدأ."],
  ["البداية من مكان غلط", "يبدأ بكتابة الأكواد قبل فهم تحليل المشكلة والمتغيرات والشروط."],
  ["شرح بدون تسلسل", "يشاهد فيديوهات منفصلة لا تبني مسارًا واضحًا من الأساس للتطبيق."],
];

const journey = ["يفهم الفكرة", "يشوف مثال واضح", "يكتب الكود بنفسه", "يحل تدريبات متدرجة", "يدخل اختبار ويعرف مستواه"];

const faq = [
  ["هل البرنامج مناسب لطالب مبتدئ تمامًا؟", "نعم، المسار يبدأ بالتفكير البرمجي والأساسيات، ثم ينتقل تدريجيًا إلى كتابة الكود وحل الأسئلة."],
  ["هل الشرح مناسب للعربي واللغات؟", "نعم، البرنامج يخدم طلاب العربي واللغات مع الحفاظ على المصطلحات البرمجية الإنجليزية بشكل واضح."],
  ["هل يوجد أونلاين؟", "نعم، الدراسة الأونلاين متاحة للطلاب في محافظات مصر، وتشمل شرحًا ومحتوى واختبارات ومتابعة."],
  ["أين يوجد الأوفلاين؟", "الدراسة الحضورية متاحة في الزقازيق. تفاصيل المكان والمواعيد يتم تأكيدها عند التواصل."],
  ["هل المحاضرات مسجلة؟", "المنصة تدعم الفيديوهات التعليمية المسجلة، مع تنظيم الدروس ومتابعة التقدم وفق المحتوى المخصص للطالب."],
  ["كيف أتابع مستوى ابني؟", "من خلال متابعة الدروس والتقدم ونتائج الاختبارات والنشاط داخل المنصة، مع التواصل لتوضيح مستوى الطالب."],
  ["هل يوجد اختبار تحديد مستوى؟", "يمكن إرسال طلب حجز وتقييم، وبعد التواصل يتم تحديد نقطة البداية المناسبة للطالب."],
  ["ما الجهاز المطلوب؟", "جهاز كمبيوتر أو لابتوب مناسب للتدريب العملي، مع اتصال إنترنت مستقر للدراسة الأونلاين."],
  ["هل البرنامج يغطي منهج البكالوريا؟", "البرنامج مخصص لأولى وتانية بكالوريا ويجمع بين التأسيس وشرح المنهج والتدريب والاختبارات حسب المرحلة."],
  ["كيف يتم الحجز؟", "املأ طلب الحجز بالمرحلة وطريقة الدراسة، وسيتم التواصل معك لتوضيح البرنامج والمواعيد. إرسال الطلب لا يعني الدفع."],
];

const defaultTestimonials: Testimonial[] = [
  { quote: "الشرح بسيط جدًا وابني بدأ يحب البرمجة. الأسلوب العملي مختلف عن الحفظ.", author: "أم أحمد", role: "ولية أمر", stars: 5, initials: "أ" },
  { quote: "طريقة الدكتور منظمة وبتخلي الطالب يطبق بنفسه من أول درس.", author: "محمد س.", role: "طالب برمجة", stars: 5, initials: "م" },
];

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return <div className="mx-auto mb-10 max-w-3xl text-center"><span className="text-sm font-bold text-primary">{eyebrow}</span><h2 className="mt-2 text-3xl font-extrabold leading-[1.45] text-[#172033] md:text-[34px]">{title}</h2>{text && <p className="mt-3 text-[15px] font-medium leading-8 text-[#667085]">{text}</p>}</div>;
}

export function AcademyHome() {
  const { get, getJson } = useSiteSettings();
  const whatsapp = get(SETTINGS_KEYS.CONTACT_WHATSAPP, "201044348610");
  const testimonials = getJson<Testimonial[]>(SETTINGS_KEYS.TESTIMONIALS_LIST, defaultTestimonials).slice(0, 4);
  const { mutateAsync: createBooking, isPending } = useCreateBooking();
  const [form, setForm] = useState<BookingForm>(initialBooking);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    document.title = "د. محمود المهدي | برنامج البرمجة لطلاب البكالوريا";
    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute("content", "برنامج تأسيس وشرح البرمجة لطلاب أولى وتانية بكالوريا مع د. محمود المهدي، أونلاين في مصر وأوفلاين في الزقازيق، مع تدريبات واختبارات ومتابعة.");
    const schema = document.createElement("script");
    schema.id = "academy-home-schema";
    schema.type = "application/ld+json";
    schema.text = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "Person", name: "د. محمود المهدي", jobTitle: "مدرب برمجة وعلوم حاسب", description: "حاصل على ماجستير نظم المعلومات ويقدم برامج تعليم البرمجة للمدرسة والجامعة." },
        { "@type": "EducationalOrganization", name: "منصة د. محمود المهدي للبرمجة وعلوم الحاسب", url: window.location.origin, areaServed: "مصر" },
        { "@type": "Course", name: "برنامج البرمجة لطلاب أولى وتانية بكالوريا", description: "برنامج تأسيس وشرح البرمجة مع تدريبات واختبارات ومتابعة.", provider: { "@type": "Person", name: "د. محمود المهدي" } },
        { "@type": "FAQPage", mainEntity: faq.map(([question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) },
      ],
    });
    document.getElementById(schema.id)?.remove();
    document.head.appendChild(schema);
    return () => schema.remove();
  }, []);

  const submitBooking = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");
    if (!form.parentName.trim() || !form.studentName.trim() || !/^01\d{9}$/.test(form.phone.replace(/\s/g, ""))) {
      setFormError("اكتب اسم ولي الأمر واسم الطالب ورقم موبايل مصري صحيح.");
      return;
    }
    const details = `اسم الطالب: ${form.studentName}\nالمرحلة: ${form.grade}\nنوع المدرسة: ${form.schoolType}\nطريقة الدراسة: ${form.mode}\nالرسالة: ${form.message || "لا توجد"}`;
    try {
      await createBooking({ data: { name: form.parentName, phone: form.phone, message: details } });
      setSubmitted(true);
      setForm(initialBooking);
    } catch {
      setFormError("تعذر إرسال الطلب الآن. حاول مرة أخرى أو تواصل معنا عبر واتساب.");
    }
  };

  return <div className="min-h-screen bg-[#F6F8FC] text-[#172033]" dir="rtl">
    <Navbar />
    <main>
      <section id="hero" className="border-b border-[#DCE3EC] bg-[#F6F8FC]">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 md:px-8 md:py-16 lg:grid-cols-[1.04fr_.96fr] lg:py-20">
          <div className="order-1 text-right">
            <span className="inline-flex rounded-full bg-[#FFF4E8] px-4 py-2 text-sm font-bold text-[#B45309]">برمجة البكالوريا · تأسيس البرمجة · كورسات الجامعة</span>
            <h1 className="mt-5 max-w-3xl text-[38px] font-extrabold leading-[1.35] tracking-tight md:text-[52px]">ابنك مش محتاج يحفظ الكود...<br/><span className="text-primary">محتاج يفهم إزاي يفكر ويحل بنفسه</span></h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-[#526176]">برنامج تأسيس وشرح البرمجة لطلاب أولى وتانية بكالوريا، بتسلسل واضح يبدأ من التفكير البرمجي ويوصل لكتابة الكود وحل أسئلة المنهج والاختبارات بثقة.</p>
            <div className="mt-5 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#EAF3FF] text-primary"><GraduationCap className="h-6 w-6"/></span><div><strong className="block">د. محمود المهدي</strong><span className="text-sm text-[#667085]">ماجستير نظم المعلومات · مدرب برمجة وعلوم حاسب</span></div></div>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row"><Button asChild size="lg" className="min-h-12 rounded-xl px-6 font-bold shadow-lg shadow-blue-700/15"><a href="/baccalaureate">اعرف تفاصيل برنامج البكالوريا <ArrowLeft className="h-4 w-4"/></a></Button><Button asChild size="lg" variant="outline" className="min-h-12 rounded-xl border-[#DCE3EC] bg-white px-6 font-bold"><a href="#free-preview"><Play className="h-4 w-4"/> شاهد درس مجاني</a></Button></div>
            <div className="mt-6 grid gap-2 text-sm font-semibold text-[#526176] sm:grid-cols-2">{["أونلاين لكل محافظات مصر", "أوفلاين في الزقازيق", "شرح عربي ولغات", "اختبارات ومتابعة مستوى"].map(x=><span key={x} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#16A365]"/>{x}</span>)}</div>
          </div>
          <div className="order-2"><div className="mx-auto max-w-lg overflow-hidden rounded-[18px] border-4 border-white bg-white shadow-[0_16px_45px_rgba(15,29,50,.14)]"><img src="/dr-mahmoud-hero-classroom.png" alt="د. محمود المهدي يشرح البرمجة والروبوتات للطلاب" fetchPriority="high" className="aspect-[4/5] w-full object-cover object-[center_10%]"/></div></div>
        </div>
      </section>

      <section aria-label="مميزات البرنامج" className="border-b border-[#DCE3EC] bg-white"><div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-x-8 gap-y-3 px-4 py-5 md:justify-between md:px-8">{["منهج مرتب","متابعة حقيقية","تطبيق عملي","عربي ولغات","أونلاين وأوفلاين","اختبارات وتقارير"].map(x=><span key={x} className="flex items-center gap-2 text-sm font-bold text-[#526176]"><Check className="h-4 w-4 text-primary"/>{x}</span>)}</div></section>

      <section className="bg-white py-14 md:py-20"><div className="mx-auto max-w-7xl px-4 md:px-8"><SectionTitle eyebrow="المشكلة مش في الطالب" title="ليه طلاب كتير بيلاقوا البرمجة صعبة؟"/><div className="grid gap-5 md:grid-cols-3">{problems.map(([title,text],i)=><article key={title} className="rounded-2xl bg-[#F6F8FC] p-6"><span className="text-2xl font-black text-[#DCE3EC]">0{i+1}</span><h3 className="mt-4 text-xl font-bold">{title}</h3><p className="mt-2 font-medium leading-7 text-[#667085]">{text}</p></article>)}</div><p className="mx-auto mt-8 max-w-3xl rounded-2xl bg-[#EAF3FF] p-5 text-center text-lg font-bold leading-8 text-[#064A96]">الحل مش في عدد الفيديوهات... الحل في تسلسل يخلي الطالب يفهم ويفكر ويطبق.</p></div></section>

      <section id="baccalaureate" className="border-y border-[#DCE3EC] bg-[#F6F8FC] py-14 md:py-20"><div className="mx-auto max-w-7xl px-4 md:px-8"><SectionTitle eyebrow="العرض الرئيسي" title="برنامج البرمجة لطلاب أولى وتانية بكالوريا" text="مسار تعليمي يجمع بين التأسيس، شرح المنهج، التطبيق العملي، حل الأسئلة، الاختبارات والمتابعة."/><div className="grid gap-6 md:grid-cols-2">{[
        {title:"أولى بكالوريا",audience:"لطالب بيبدأ تأسيسه في التفكير البرمجي",outcome:"يفهم تحليل المشكلة والمتغيرات والشروط ويبدأ كتابة الحل بنفسه."},
        {title:"تانية بكالوريا",audience:"لطالب عايز يبني على الأساس ويثبت مهارة الحل",outcome:"يتدرب على تطبيق المفاهيم وحل أسئلة المنهج والاختبارات بثقة."},
      ].map(item=><article key={item.title} className="flex h-full flex-col rounded-2xl border border-[#F5C28E] bg-white p-6 shadow-[0_8px_30px_rgba(15,29,50,.07)]"><span className="w-fit rounded-full bg-[#FFF4E8] px-3 py-1 text-xs font-bold text-[#B45309]">برنامج البكالوريا</span><h3 className="mt-4 text-2xl font-extrabold">{item.title}</h3><p className="mt-2 font-bold text-[#526176]">{item.audience}</p><p className="mt-3 flex-1 leading-7 text-[#667085]">{item.outcome}</p><div className="mt-5 flex flex-wrap gap-2">{["عربي ولغات","أونلاين","أوفلاين بالزقازيق"].map(x=><span key={x} className="rounded-full bg-[#F6F8FC] px-3 py-1.5 text-xs font-bold text-[#526176]">{x}</span>)}</div><Button asChild className="mt-6 min-h-11 w-full rounded-xl bg-[#D97706] font-bold hover:bg-[#B45309]"><a href="/baccalaureate">عرض تفاصيل البرنامج <ArrowLeft className="h-4 w-4"/></a></Button></article>)}</div></div></section>

      <section className="bg-white py-14 md:py-20"><div className="mx-auto max-w-7xl px-4 md:px-8"><SectionTitle eyebrow="طريقة التعلم" title="الطالب هيمشي في البرنامج إزاي؟"/><ol className="grid gap-3 md:grid-cols-5">{journey.map((step,i)=><li key={step} className="relative rounded-2xl border border-[#DCE3EC] bg-white p-5 text-center"><span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-primary font-black text-white">{i+1}</span><strong className="mt-4 block">{step}</strong>{i<4&&<ArrowLeft className="absolute -left-5 top-8 z-10 hidden h-5 w-5 text-[#A8B2C1] md:block"/>}</li>)}</ol><p className="mt-7 text-center font-bold text-[#526176]">كل درس مرتبط باللي قبله، ومفيش انتقال لجزء جديد قبل تثبيت الأساس.</p></div></section>

      <section className="bg-[#F6F8FC] py-14 md:py-20"><div className="mx-auto max-w-7xl px-4 md:px-8"><SectionTitle eyebrow="داخل البرنامج" title="كل اللي يحتاجه الطالب في مكان واحد"/><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{[
        [MonitorPlay,"شرح وتعلم","فيديوهات شرح مرتبة ومحاضرات مباشرة حسب البرنامج."],
        [FileText,"مذكرات وتدريبات","ملخصات، تدريبات بعد الدروس، وبنك أسئلة منظم."],
        [ClipboardCheck,"اختبارات ومراجعات","اختبارات دورية ومراجعات تساعد على تثبيت الفهم."],
        [BarChart3,"متابعة التقدم","متابعة الحضور والتقدم ونتائج الاختبارات وتقارير المستوى."],
      ].map(([Icon,title,text]:any)=><article key={title} className="flex gap-4 rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(15,29,50,.06)]"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#EAF3FF] text-primary"><Icon className="h-6 w-6"/></span><div><h3 className="text-lg font-bold">{title}</h3><p className="mt-2 text-sm font-medium leading-7 text-[#667085]">{text}</p></div></article>)}</div></div></section>

      <section id="parent-tracking" className="bg-white py-14 md:py-20"><div className="mx-auto grid max-w-7xl items-center gap-10 px-4 md:px-8 lg:grid-cols-2"><div><span className="text-sm font-bold text-primary">متابعة ولي الأمر</span><h2 className="mt-2 text-3xl font-extrabold leading-[1.45]">مش هتفضل تسأل: ابني مستواه عامل إيه؟</h2><p className="mt-4 max-w-xl font-medium leading-8 text-[#667085]">تابع الدروس المكتملة، نتائج الاختبارات، مستوى التقدم، وآخر نشاط داخل المنصة. تفاصيل المتابعة المتاحة تعتمد على بيانات الطالب وبرنامجه.</p><Button asChild variant="outline" className="mt-6 min-h-11 rounded-xl font-bold"><a href="/platform">شوف نظام المتابعة <ArrowLeft className="h-4 w-4"/></a></Button></div><div className="rounded-2xl border border-[#DCE3EC] bg-[#F6F8FC] p-5 shadow-[0_8px_30px_rgba(15,29,50,.07)]" aria-label="نموذج توضيحي للمتابعة"><div className="flex items-center justify-between"><div><strong>نموذج متابعة توضيحي</strong><p className="text-xs text-[#667085]">بيانات مجهّلة لشرح شكل المتابعة</p></div><UserCheck className="h-6 w-6 text-primary"/></div><div className="mt-5 grid grid-cols-2 gap-3">{[["التقدم العام","يظهر حسب الدروس"],["الحضور","يُتابع حسب البرنامج"],["الاختبارات","الدرجات والمحاولات"],["آخر نشاط","آخر دخول أو تعلم"]].map(([a,b])=><div key={a} className="rounded-xl bg-white p-4"><strong className="text-sm">{a}</strong><span className="mt-1 block text-xs text-[#667085]">{b}</span></div>)}</div><div className="mt-3 rounded-xl bg-white p-4"><strong className="text-sm">ملاحظة المتابعة</strong><p className="mt-1 text-xs leading-6 text-[#667085]">يتم توضيح نقاط القوة والأجزاء التي تحتاج مراجعة بناءً على نشاط الطالب الفعلي.</p></div></div></div></section>

      <section id="about" className="bg-[#EAF3FF] py-14 md:py-20"><div className="mx-auto grid max-w-7xl items-center gap-10 px-4 md:px-8 lg:grid-cols-[.82fr_1.18fr]"><div className="overflow-hidden rounded-[18px] border-4 border-white shadow-[0_8px_30px_rgba(15,29,50,.12)]"><img src="/dr-mahmoud-hero-classroom.png" alt="د. محمود المهدي مدرب البرمجة وعلوم الحاسب" loading="lazy" className="aspect-[4/3] w-full object-cover object-[center_12%]"/></div><div><span className="text-sm font-bold text-primary">ليه تبدأ مع د. محمود المهدي؟</span><h2 className="mt-2 text-3xl font-extrabold">خبرة أكاديمية وطريقة شرح مبنية على الفهم</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{["ماجستير نظم المعلومات","خبرة أكاديمية في البرمجة وعلوم الحاسب","شرح قائم على الفهم","تسلسل مناسب للمبتدئ","تدريبات وأسئلة متدرجة","متابعة فعلية لمستوى الطالب"].map(x=><span key={x} className="flex gap-2 font-semibold text-[#526176]"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary"/>{x}</span>)}</div><p className="mt-6 rounded-xl bg-white p-5 font-bold leading-8 text-[#064A96]">الهدف مش إن الطالب يكرر كود جاهز؛ الهدف إنه يفهم السؤال ويحدد خطوات الحل ويكتب البرنامج بنفسه.</p></div></div></section>

      <section id="free-preview" className="bg-white py-14 md:py-20"><div className="mx-auto max-w-7xl px-4 md:px-8"><SectionTitle eyebrow="جرّب قبل ما تقرر" title="شوف أسلوب الشرح قبل ما تحجز" text="معاينات من المسارات والصفحات العامة الحالية بدون فتح أي محتوى محمي."/><div className="grid gap-5 md:grid-cols-3">{[
        [Play,"درس وتمهيد مجاني","ابدأ من صفحة برنامج البكالوريا وشوف طريقة تقديم المسار.","/baccalaureate","شاهد المعاينة"],
        [FileText,"خريطة المناهج","استعرض تنظيم المناهج والمسارات التعليمية المتاحة.","/curriculum","استعرض المناهج"],
        [ClipboardCheck,"نظام الاختبارات","شوف تجربة المنصة وكيف ترتبط الاختبارات بحساب الطالب.","/platform","دخول منصة الطالب"],
      ].map(([Icon,title,text,href,cta]:any)=><article key={title} className="flex flex-col rounded-2xl border border-[#DCE3EC] p-6"><Icon className="h-7 w-7 text-primary"/><h3 className="mt-4 text-xl font-bold">{title}</h3><p className="mt-2 flex-1 text-sm font-medium leading-7 text-[#667085]">{text}</p><a href={href} className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#EAF3FF] px-4 font-bold text-primary hover:bg-blue-100">{cta}<ArrowLeft className="h-4 w-4"/></a></article>)}</div></div></section>

      <section id="testimonials" className="bg-[#F6F8FC] py-14 md:py-20"><div className="mx-auto max-w-7xl px-4 md:px-8"><SectionTitle eyebrow="آراء مسجلة في إعدادات الموقع" title="تجارب الطلاب وأولياء الأمور"/><div className={`grid gap-5 ${testimonials.length > 2 ? "md:grid-cols-2 lg:grid-cols-4" : "mx-auto max-w-4xl md:grid-cols-2"}`}>{testimonials.map((item,i)=><blockquote key={`${item.author}-${i}`} className="flex h-full flex-col rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(15,29,50,.06)]"><div className="flex gap-1 text-[#D97706]">{Array.from({length:Math.min(item.stars||0,5)}).map((_,s)=><Star key={s} className="h-4 w-4 fill-current"/>)}</div><p className="mt-4 flex-1 font-medium leading-8">“{item.quote}”</p><footer className="mt-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#EAF3FF] font-bold text-primary">{item.initials||item.author?.[0]}</span><div><strong className="block text-sm">{item.author}</strong><span className="text-xs text-[#667085]">{item.role}</span></div></footer></blockquote>)}</div></div></section>

      <section id="tracks" className="bg-white py-14 md:py-20"><div className="mx-auto max-w-7xl px-4 md:px-8"><SectionTitle eyebrow="مسارات أخرى" title="تعليم برمجة مناسب لكل مرحلة"/><div className="grid gap-5 md:grid-cols-3">{[
        ["/university-cs-path.png","كورسات الجامعة","لطلاب حاسبات وهندسة","فهم مواد البرمجة والتطبيق عليها","/university"],
        ["/baccalaureate-hero.png","تأسيس البرمجة","للمبتدئين وطلاب المدرسة","بناء التفكير البرمجي خطوة بخطوة","/curriculum"],
        ["/web-development-path.png","برمجة الأطفال","للأطفال والمراهقين","تعلم مناسب للسن قائم على التطبيق","/kids"],
      ].map(([img,title,audience,outcome,href])=><article key={title} className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#DCE3EC] bg-white"><img src={img} alt={`مسار ${title}`} loading="lazy" className="aspect-video w-full object-cover"/><div className="flex flex-1 flex-col p-5"><span className="text-xs font-bold text-primary">{audience}</span><h3 className="mt-2 text-xl font-bold">{title}</h3><p className="mt-2 flex-1 text-sm font-medium leading-7 text-[#667085]">{outcome}</p><div className="mt-4 flex gap-2">{["تعلم منظم","تطبيق عملي","متابعة"].map(x=><span key={x} className="rounded-full bg-[#F6F8FC] px-2 py-1 text-[11px] font-bold text-[#667085]">{x}</span>)}</div><a href={href} className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-bold text-white">عرض المسار <ArrowLeft className="h-4 w-4"/></a></div></article>)}</div></div></section>

      <section className="bg-[#F6F8FC] py-14 md:py-20"><div className="mx-auto max-w-6xl px-4 md:px-8"><SectionTitle eyebrow="اختار الأنسب" title="أونلاين ولا أوفلاين؟" text="الاختيار يعتمد على مكان الطالب وطريقة التعلم المناسبة له."/><div className="grid gap-6 md:grid-cols-2">{[
        [Laptop2,"أونلاين","متاح لكل محافظات مصر",["محاضرات ومحتوى تعليمي","اختبارات ومتابعة","الرجوع للمحتوى المسجل"]],
        [MapPin,"أوفلاين في الزقازيق","حضور داخل الأكاديمية",["تطبيق مباشر","متابعة داخل المحاضرة","مجموعات ومواعيد يتم تأكيدها عند الحجز"]],
      ].map(([Icon,title,lead,items]:any)=><article key={title} className="rounded-2xl border border-[#DCE3EC] bg-white p-6"><Icon className="h-8 w-8 text-primary"/><h3 className="mt-4 text-2xl font-bold">{title}</h3><p className="mt-2 font-bold text-[#526176]">{lead}</p><ul className="mt-5 space-y-3">{items.map((x:string)=><li key={x} className="flex gap-2 text-sm font-medium text-[#667085]"><Check className="h-4 w-4 text-[#16A365]"/>{x}</li>)}</ul></article>)}</div></div></section>

      <section id="faq" className="bg-white py-14 md:py-20"><div className="mx-auto max-w-4xl px-4 md:px-8"><SectionTitle eyebrow="قبل ما تبدأ" title="الأسئلة الشائعة"/><Accordion type="single" collapsible className="space-y-3">{faq.map(([q,a],i)=><AccordionItem key={q} value={`faq-${i}`} className="rounded-2xl border border-[#DCE3EC] px-5"><AccordionTrigger className="min-h-14 text-right font-bold hover:no-underline">{q}</AccordionTrigger><AccordionContent className="pb-5 text-sm font-medium leading-7 text-[#667085]">{a}</AccordionContent></AccordionItem>)}</Accordion></div></section>

      <section id="booking" className="border-t border-[#DCE3EC] bg-[#F6F8FC] py-14 md:py-20"><div className="mx-auto grid max-w-7xl gap-8 px-4 md:px-8 lg:grid-cols-[.8fr_1.2fr]"><div><span className="text-sm font-bold text-primary">طلب حجز واستفسار</span><h2 className="mt-2 text-3xl font-extrabold leading-[1.45]">ابدأ بتحديد المرحلة المناسبة للطالب</h2><p className="mt-4 font-medium leading-8 text-[#667085]">اكتب البيانات الأساسية، وسيتم التواصل لتوضيح البرنامج والمواعيد المناسبة.</p><div className="mt-6 rounded-2xl bg-[#EAF3FF] p-5"><ShieldCheck className="h-6 w-6 text-primary"/><strong className="mt-3 block">إرسال الطلب لا يعني الدفع</strong><p className="mt-1 text-sm leading-6 text-[#526176]">الطلب للاستفسار وتحديد البرنامج المناسب فقط.</p></div><a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#25D366] bg-white font-bold text-[#168C45]"><MessageCircle className="h-5 w-5"/> التواصل عبر واتساب</a></div><div className="rounded-2xl border border-[#DCE3EC] bg-white p-6 shadow-[0_8px_30px_rgba(15,29,50,.07)] md:p-8">{submitted?<div role="status" className="grid min-h-80 place-items-center text-center"><div><CheckCircle2 className="mx-auto h-12 w-12 text-[#16A365]"/><h3 className="mt-4 text-2xl font-bold">تم إرسال طلب الحجز</h3><p className="mt-2 text-[#667085]">سيتم التواصل معك لتوضيح البرنامج والمواعيد المناسبة.</p><Button type="button" variant="outline" className="mt-5" onClick={()=>setSubmitted(false)}>إرسال طلب آخر</Button></div></div>:<form onSubmit={submitBooking} noValidate className="grid gap-4 sm:grid-cols-2"><Field label="اسم ولي الأمر"><input required value={form.parentName} onChange={e=>setForm({...form,parentName:e.target.value})} className="home-input"/></Field><Field label="اسم الطالب"><input required value={form.studentName} onChange={e=>setForm({...form,studentName:e.target.value})} className="home-input"/></Field><Field label="رقم الهاتف"><input required inputMode="tel" dir="ltr" placeholder="01xxxxxxxxx" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="home-input text-right"/></Field><Field label="المرحلة الدراسية"><select value={form.grade} onChange={e=>setForm({...form,grade:e.target.value})} className="home-input"><option>أولى بكالوريا</option><option>تانية بكالوريا</option><option>ثانوي عام</option><option>جامعة</option><option>أخرى</option></select></Field><Field label="نوع المدرسة"><select value={form.schoolType} onChange={e=>setForm({...form,schoolType:e.target.value})} className="home-input"><option>عربي</option><option>لغات</option><option>أخرى</option></select></Field><Field label="طريقة الدراسة"><select value={form.mode} onChange={e=>setForm({...form,mode:e.target.value})} className="home-input"><option>أونلاين</option><option>أوفلاين في الزقازيق</option><option>أحتاج مساعدة للاختيار</option></select></Field><label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-bold">رسالة اختيارية</span><textarea rows={3} value={form.message} onChange={e=>setForm({...form,message:e.target.value})} className="home-input resize-none"/></label>{formError&&<p role="alert" className="sm:col-span-2 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{formError}</p>}<Button disabled={isPending} type="submit" className="min-h-12 rounded-xl font-bold sm:col-span-2"><Send className="h-4 w-4"/>{isPending?"جاري إرسال الطلب...":"إرسال طلب الحجز"}</Button></form>}</div></div></section>
    </main>
    <Footer/><FloatingButtons/>
    <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-[#DCE3EC] bg-white/95 p-2 pb-[calc(.5rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,29,50,.08)] backdrop-blur md:hidden"><a href="/baccalaureate" className="flex min-h-11 items-center justify-center rounded-xl bg-primary px-3 text-sm font-bold text-white">تفاصيل البكالوريا</a><a href={`https://wa.me/${whatsapp}`} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#25D366] text-sm font-bold text-[#168C45]"><MessageCircle className="h-4 w-4"/> واتساب</a></div>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="mb-1.5 block text-sm font-bold">{label}</span>{children}</label>; }
