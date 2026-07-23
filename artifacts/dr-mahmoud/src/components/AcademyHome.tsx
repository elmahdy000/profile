import { ArrowLeft, BookOpen, CheckCircle2, Clock3, GraduationCap, Laptop2, Rocket, ShieldCheck, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FloatingButtons } from "@/components/FloatingButtons";
import { ACADEMIC_TRACKS } from "@/data/academic";

interface ImageConfig {
  src: string;
  alt: string;
  objectFit?: "cover" | "contain";
  objectPosition?: string;
  mobileObjectPosition?: string;
}

interface Track {
  title: string;
  desc: string;
  meta: string;
  imageConfig: ImageConfig;
  tags: string[];
  href: string;
}

const tracks: Track[] = ACADEMIC_TRACKS.map((track) => ({
  title: track.title,
  desc: track.description,
  meta: track.eyebrow,
  imageConfig: {
    src: track.image,
    alt: track.imageAlt,
    objectFit: "cover",
    objectPosition: "center",
    mobileObjectPosition: "center",
  },
  tags: track.subjects,
  href: track.id === "baccalaureate"
    ? "/baccalaureate"
    : track.id === "computer-science"
      ? "/university"
      : "/platform?track=engineering",
}));

function renderMixedText(text: string) {
  const regex = /([A-Za-z0-9+#.\s-]+)/g;
  const parts = text.split(regex);
  return parts.map((part, idx) => {
    if (idx % 2 === 1) {
      return (
        <span key={idx} dir="ltr" className="inline-block font-sans select-all font-bold">
          {part}
        </span>
      );
    }
    return part;
  });
}

const benefits = [
  { icon: ShieldCheck, title: "منهج مرتب", text: "كل مسار متقسم من التأسيس للتطبيق بدون قفزات أو فجوات." },
  { icon: GraduationCap, title: "متابعة حقيقية", text: "اختبارات وواجبات ومراجعة مستوى بعد كل جزء علشان تعرف تقدمك." },
  { icon: Laptop2, title: "تطبيق عملي", text: "كل مفهوم بيتحول لكود أو مشروع صغير تثبت بيه فهمك." },
];

export function AcademyHome() {
  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <Navbar />
      <main>
        <section id="hero" className="relative overflow-hidden border-b border-slate-200 bg-[#f6f8fc]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-primary/20" />
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-10 md:px-8 md:py-14 lg:grid-cols-[1.05fr_.95fr] lg:py-16">
            <div className="order-2 space-y-6 text-right lg:order-1">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-primary">
                <GraduationCap className="h-4 w-4" /> مسارات تعليمية للمدرسة والجامعة
              </span>
              <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.3] tracking-tight text-[#172033] md:text-[3.15rem]">
                اتعلم البرمجة صح<br />وافهم منهجك خطوة بخطوة
              </h1>
              <p className="max-w-xl text-base font-medium leading-8 text-[#526176] md:text-lg">
                شرح منظم لطلاب البكالوريا وكليات الحاسبات والهندسة، مع تدريبات واختبارات ومتابعة مستمرة.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-13 rounded-xl px-8 font-bold shadow-lg shadow-primary/20">
                  <a href="/platform"><Rocket className="h-4 w-4" /> ابدأ مسارك الآن</a>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-13 rounded-xl border-slate-300 bg-white px-8 font-bold">
                  <a href="#tracks"><BookOpen className="h-4 w-4" /> استكشف المسارات</a>
                </Button>
              </div>
              <div className="flex flex-wrap gap-5 pt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> أول تقييم مجاني</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> أونلاين وحضوري</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> مشروعات واختبارات</span>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="relative mx-auto max-w-lg lg:max-w-none">
                <div className="absolute -bottom-4 -left-4 h-full w-full rounded-[18px] border border-blue-200 bg-blue-50" />
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[18px] border-4 border-white bg-slate-200 shadow-[0_16px_45px_rgba(15,29,50,.14)] lg:h-[560px] lg:aspect-auto">
                  <img 
                    src="/dr-mahmoud-hero-classroom.png"
                    alt="د. محمود المهدي أثناء شرح البرمجة والروبوتات للطلاب"
                    fetchPriority="high"
                    decoding="async"
                    className="h-full w-full object-cover object-[center_12%] sm:object-[center_10%] lg:object-top"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="أرقام المنصة" className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-slate-200 md:grid-cols-4">
            {[['3','مسارات تعليمية'],['مدرسة وجامعة','محتوى مناسب لمرحلتك'],['أونلاين وحضوري','طريقة الدراسة'],['متابعة واختبارات','قياس مستمر للمستوى']].map(([value,label]) => <div key={label} className="bg-white px-4 py-6 text-center"><strong className="block text-xl font-extrabold text-primary">{value}</strong><span className="mt-1 block text-xs font-medium text-slate-500">{label}</span></div>)}
          </div>
        </section>

        <section id="why" className="bg-white py-14 md:py-16">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <span className="text-sm font-bold text-primary">ليه الأكاديمية مختلفة؟</span>
              <h2 className="mt-3 text-3xl font-black md:text-4xl">تعليم منظم يخليك تفهم وتطبّق</h2>
              <p className="mt-3 font-medium leading-7 text-slate-600">شرح واضح، تدريب مستمر، ونتيجة تقدر تشوفها في مستواك ومشروعاتك.</p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {benefits.map(({ icon: Icon, title, text }, index) => (
                <article key={title} className={`rounded-2xl border p-6 text-right shadow-[0_8px_30px_rgba(15,29,50,.06)] transition duration-300 hover:-translate-y-1 ${index === 0 ? 'border-blue-200 bg-blue-50/70' : 'border-slate-200 bg-white'}`}>
                  <div className="mb-5 flex items-center justify-between"><div className="grid h-14 w-14 place-items-center rounded-xl bg-white text-primary shadow-sm"><Icon className="h-7 w-7" /></div><span className="text-2xl font-black text-slate-200">0{index+1}</span></div>
                  <h3 className="text-xl font-black">{title}</h3>
                  <p className="mt-3 font-medium leading-7 text-slate-600">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="tracks" className="border-y border-slate-200 bg-[#f6f8fc] py-14 md:py-16">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div><span className="text-sm font-bold text-primary">اختار طريقك وابدأ من مستواك</span><h2 className="mt-2 text-3xl font-extrabold md:text-4xl">مسارات تعليمية لكل مرحلة</h2></div>
              <div className="flex flex-wrap gap-2">
                <a href="/kids" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-primary">برمجة الأطفال</a>
                <a href="/curriculum" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-primary">كل المناهج</a>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-3 items-stretch">
              {tracks.map((track) => (
                <article key={track.title} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,29,50,.06)] transition duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
                    <img 
                      src={track.imageConfig.src} 
                      alt={track.imageConfig.alt} 
                      style={{
                        '--object-position-desktop': track.imageConfig.objectPosition || 'center',
                        '--object-position-mobile': track.imageConfig.mobileObjectPosition || track.imageConfig.objectPosition || 'center'
                      } as React.CSSProperties}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] [object-position:var(--object-position-mobile)] md:[object-position:var(--object-position-desktop)]" 
                    />
                  </div>
                  <div className="h-1.5 bg-primary" />
                  <div className="flex flex-1 flex-col p-5 text-right">
                    <span className="text-xs font-bold text-primary">{track.meta}</span>
                    <h3 className="mt-2 text-xl font-black text-foreground">
                      {renderMixedText(track.title)}
                    </h3>
                    <p className="mt-2 flex-1 text-sm font-medium leading-7 text-slate-600">
                      {renderMixedText(track.desc)}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {track.tags.slice(0, 3).map(tag => {
                        const isEnglish = /^[A-Za-z0-9+#.\s-]+$/.test(tag);
                        return (
                          <span 
                            key={tag} 
                            className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600"
                            dir={isEnglish ? "ltr" : "rtl"}
                          >
                            {tag}
                          </span>
                        );
                      })}
                    </div>
                    <a 
                      href={track.href}
                      className="mt-5 flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-bold text-white transition-colors hover:bg-primary/90"
                    >
                      <span>عرض المسار</span>
                      <ArrowLeft className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-1" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="testimonials" className="py-14 md:py-16">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <div className="mx-auto mb-10 max-w-2xl text-center"><span className="text-sm font-bold text-primary">كلام طلابنا</span><h2 className="mt-2 text-3xl font-black">النتيجة هي اللي بتتكلم</h2></div>
            <div className="grid gap-5 md:grid-cols-2">
              {[{quote:"الشرح منظم جدًا، وكل مرة بطلع فاهم أنا بعمل إيه وليه، مش بحفظ الكود وخلاص.",name:"أحمد ع.",stage:"طالب برمجة",result:"قدر ينفذ أول مشروع كامل بنفسه."},{quote:"كنت تايه في مواد الجامعة، وبعد المتابعة والاختبارات بقيت عارف أذاكر وأطبّق لوحدي.",name:"سارة م.",stage:"طالبة حاسبات",result:"تحسن واضح في حل مسائل البرمجة."}].map((item) => (
                <blockquote key={item.quote} className="rounded-2xl border border-slate-200 bg-white p-6 text-right shadow-[0_8px_30px_rgba(15,29,50,.06)]">
                  <div className="flex items-center justify-between"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-blue-50 font-black text-primary">{item.name[0]}</span><div><strong className="block">{item.name}</strong><span className="text-xs text-slate-500">{item.stage}</span></div></div><div className="flex gap-1 text-amber-500">{Array.from({length:5}).map((_,i)=><Star key={i} className="h-4 w-4 fill-current" />)}</div></div>
                  <p className="mt-5 font-semibold leading-8">“{item.quote}”</p>
                  <footer className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">النتيجة: {item.result}</footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="bg-[#EAF3FF] py-14 text-[#172033] md:py-16">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 md:px-8 lg:grid-cols-[.85fr_1.15fr]">
            <div className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-[18px] border-4 border-white bg-muted shadow-[0_8px_30px_rgba(15,29,50,.12)]">
              <img 
                src="/dr-mahmoud-hero-classroom.png"
                alt="د. محمود المهدي — مدرب البرمجة" 
                className="h-full w-full object-cover object-[center_12%]"
              />
            </div>
            <div className="space-y-5 text-right">
              <span className="block text-sm font-bold text-primary">عن د. محمود المهدي</span>
              <div>
                <h2 className="text-3xl font-extrabold md:text-4xl">خبرة أكاديمية وتطبيق عملي</h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-primary">
                  ماجستير نظم المعلومات — مدرب برمجة وعلوم حاسب
                </p>
              </div>
              <p className="max-w-2xl text-lg font-medium leading-8 text-slate-700">
                خبرة أكاديمية وتدريبية في البرمجة ونظم المعلومات، والهدف إن كل طالب يفهم الفكرة ويطبقها بإيده لحد ما يبقى قادر يعمل مشروع كامل.
              </p>
              <div className="flex flex-wrap gap-2.5 pt-2">
                {['ماجستير نظم المعلومات','مدرب برمجة وعلوم حاسب','شرح أونلاين وحضوري'].map(item => <span key={item} className="rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">{item}</span>)}
              </div>
              <a href="/curriculum" className="inline-flex items-center gap-2 font-bold text-primary">اعرف أكثر عن الدكتور <ArrowLeft className="h-4 w-4" /></a>
            </div>
          </div>
        </section>

        <section id="join" className="py-14 md:py-16">
          <div className="mx-auto max-w-5xl px-4 text-center">
            <div className="academy-card border-blue-100 bg-blue-50/60 p-8 shadow-lg md:p-12">
              <GraduationCap className="mx-auto h-11 w-11 text-primary" />
              <h2 className="mt-5 text-3xl font-extrabold md:text-4xl">ابدأ التعلم بخطوات واضحة</h2>
              <p className="mx-auto mt-3 max-w-2xl font-medium leading-7 text-slate-600">اختار مسارك، أنشئ حسابك، وابدأ التعلم بعد تأكيد التسجيل.</p>
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Button asChild size="lg" className="h-12 font-bold"><a href="/platform?mode=register">إنشاء حساب طالب</a></Button><Button asChild size="lg" variant="outline" className="h-12 font-bold"><a href="/platform">تسجيل الدخول</a></Button></div>
              <a href="https://wa.me/201044348610" className="mt-5 inline-block text-sm font-bold text-slate-600 hover:text-primary">تحتاج مساعدة؟ تواصل عبر واتساب</a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <FloatingButtons />
    </div>
  );
}
