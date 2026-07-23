import { ArrowLeft, BookOpen, CheckCircle2, Code2, GraduationCap, Play, Rocket, ShieldCheck, Sparkles, Star, Users } from "lucide-react";
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
  cta: string;
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
  cta: track.id === "engineering" ? "سجّل في المسار" : "اعرف تفاصيل المسار",
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
  { icon: ShieldCheck, title: "منهج واضح من غير لف", text: "كل مسار مترتب من البداية، وكل درس بيكمل اللي قبله علشان توصل للنتيجة أسرع." },
  { icon: GraduationCap, title: "متابعة مباشرة", text: "مش هتتعلم لوحدك؛ فيه متابعة وملفات واختبارات بتوضح مستواك أول بأول." },
  { icon: Users, title: "مجتمع تقني فعّال", text: "هتكون وسط طلاب ليهم نفس هدفك، وتشارك أسئلة وتجارب ومشروعات حقيقية." },
];

export function AcademyHome() {
  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <Navbar />
      <main>
        <section id="hero" className="academy-hero overflow-hidden border-b border-border/60">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 md:px-8 lg:grid-cols-2 lg:py-20">
            <div className="order-2 space-y-6 text-right lg:order-1">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary">
                <Sparkles className="h-4 w-4" /> منصة متخصصة للمدرسة والجامعة
              </span>
              <h1 className="text-4xl font-black leading-[1.25] md:text-6xl">
                افهم منهجك ومواد كليتك<br />{" "}مع <span className="text-primary">د. محمود المهدي</span>
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                كورسات مخصصة لطلاب البكالوريا، حاسبات ومعلومات، وهندسة. كل كورس مرتب إلى دروس وملفات واختبارات، ومتاح أونلاين أو حضوري.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 rounded-lg px-7 font-bold shadow-lg shadow-primary/15">
                  <a href="/platform"><Rocket className="h-4 w-4" /> ابدأ رحلتك دلوقتي</a>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 rounded-lg px-7 font-bold">
                  <a href="#tracks"><BookOpen className="h-4 w-4" /> شوف المسارات</a>
                </Button>
              </div>
              <div className="flex flex-wrap gap-5 pt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> أول تقييم مجاني</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> أونلاين وحضوري</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> مشروعات واختبارات</span>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="relative mx-auto max-w-xl lg:max-w-none">
                <div className="absolute -inset-6 rounded-[2rem] bg-primary/10 blur-3xl" />
                <div className="relative w-full aspect-[4/3] lg:h-[540px] lg:w-[720px] lg:max-w-full rounded-3xl border border-primary/10 overflow-hidden shadow-2xl bg-muted">
                  <img 
                    src="/dr-mahmoud-photo.png" 
                    alt="د. محمود المهدي" 
                    className="w-full h-full object-cover object-[center_25%] lg:object-[center_28%]" 
                  />
                </div>
                <div className="absolute bottom-4 right-4 lg:bottom-6 lg:right-6 rounded-2xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur z-10">
                  <strong className="block text-primary">د. محمود المهدي</strong>
                  <span className="text-xs text-muted-foreground">ماجستير نظم معلومات · مدرب برمجة وAI</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="why" className="py-20">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <span className="text-sm font-bold text-primary">ليه الأكاديمية مختلفة؟</span>
              <h2 className="mt-3 text-3xl font-black md:text-4xl">تعليم منظم يخليك تفهم وتطبّق</h2>
              <p className="mt-3 text-muted-foreground">مش فيديوهات وخلاص؛ دي رحلة كاملة فيها شرح وتطبيق وملفات واختبارات.</p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {benefits.map(({ icon: Icon, title, text }) => (
                <article key={title} className="academy-card p-6 text-right">
                  <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-6 w-6" /></div>
                  <h3 className="text-xl font-black">{title}</h3>
                  <p className="mt-3 leading-7 text-muted-foreground">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="tracks" className="bg-[#f0f3ff] py-20">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div><span className="text-sm font-bold text-primary">اختار بوابتك التعليمية</span><h2 className="mt-2 text-3xl font-black md:text-4xl">بكالوريا، حاسبات، أو هندسة</h2></div>
              <div className="flex flex-wrap gap-4">
                <a href="/kids" className="flex items-center gap-2 font-bold text-primary">برمجة الأطفال <ArrowLeft className="h-4 w-4" /></a>
                <a href="/curriculum" className="flex items-center gap-2 font-bold text-primary">شوف كل المناهج <ArrowLeft className="h-4 w-4" /></a>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-3 items-stretch">
              {tracks.map((track) => (
                <article key={track.title} className="academy-card group flex flex-col h-full overflow-hidden bg-card transition duration-300">
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
                  <div className="flex flex-col flex-1 p-5 text-right">
                    <span className="text-xs font-bold text-primary">{track.meta}</span>
                    <h3 className="mt-2 text-xl font-black text-foreground">
                      {renderMixedText(track.title)}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground flex-1">
                      {renderMixedText(track.desc)}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {track.tags.map(tag => {
                        const isEnglish = /^[A-Za-z0-9+#.\s-]+$/.test(tag);
                        return (
                          <span 
                            key={tag} 
                            className="rounded-md bg-muted px-2 py-1 text-[11px] font-bold text-muted-foreground"
                            dir={isEnglish ? "ltr" : "rtl"}
                          >
                            {tag}
                          </span>
                        );
                      })}
                    </div>
                    <a 
                      href={track.href}
                      className="mt-5 flex items-center justify-between border-t border-border pt-4 font-bold text-primary hover:text-primary/80 transition-colors"
                    >
                      <span>{track.cta}</span>
                      <ArrowLeft className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-1" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="testimonials" className="py-20">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <div className="mx-auto mb-10 max-w-2xl text-center"><span className="text-sm font-bold text-primary">كلام طلابنا</span><h2 className="mt-2 text-3xl font-black">النتيجة هي اللي بتتكلم</h2></div>
            <div className="grid gap-5 md:grid-cols-2">
              {["الشرح منظم جدًا، وكل مرة بطلع فاهم أنا بعمل إيه وليه، مش بحفظ الكود وخلاص.", "كنت تايه في مواد الجامعة، وبعد المتابعة والاختبارات بقيت عارف أذاكر وأطبّق لوحدي."].map((quote, index) => (
                <blockquote key={quote} className="rounded-2xl bg-primary/5 p-7 text-right">
                  <div className="mb-4 flex gap-1 text-amber-500">{Array.from({length:5}).map((_,i)=><Star key={i} className="h-4 w-4 fill-current" />)}</div>
                  <p className="text-lg font-semibold leading-8">“{quote}”</p>
                  <footer className="mt-5 text-sm text-muted-foreground">{index ? "سارة محمد · طالبة جامعة" : "أحمد علي · طالب برمجة"}</footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="bg-primary py-16 text-primary-foreground">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 md:px-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="relative mx-auto aspect-[4/3] w-full max-w-md max-h-[420px] rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-muted">
              <img 
                src="/dr-mahmoud-photo.png" 
                alt="د. محمود المهدي — مدرب البرمجة" 
                className="w-full h-full object-cover object-[center_25%] lg:object-[center_28%]" 
              />
            </div>
            <div className="space-y-5 text-right">
              <span className="text-sm font-bold text-cyan-200 uppercase tracking-wider block">اعرف مدرسك</span>
              <div>
                <h2 className="text-3xl font-black md:text-4xl text-white">د. محمود المهدي</h2>
                <p className="text-sm text-cyan-100/90 mt-1.5 font-medium leading-relaxed">
                  ماجستير نظم المعلومات — مدرب برمجة وعلوم حاسب
                </p>
              </div>
              <p className="text-lg leading-relaxed text-white/90">
                خبرة أكاديمية وتدريبية في البرمجة ونظم المعلومات، والهدف إن كل طالب يفهم الفكرة ويطبقها بإيده لحد ما يبقى قادر يعمل مشروع كامل.
              </p>
              <div className="flex flex-wrap gap-2.5 pt-2">
                <span className="rounded-xl bg-white/10 border border-white/5 px-4 py-2 text-sm font-medium">شرح بالمصري</span>
                <span className="rounded-xl bg-white/10 border border-white/5 px-4 py-2 text-sm font-medium">متابعة شخصية</span>
                <span className="rounded-xl bg-white/10 border border-white/5 px-4 py-2 text-sm font-medium">تطبيقات عملية</span>
              </div>
            </div>
          </div>
        </section>

        <section id="join" className="py-20">
          <div className="mx-auto max-w-5xl px-4 text-center">
            <div className="academy-card bg-gradient-to-l from-primary/[.07] to-cyan-500/[.05] p-8 md:p-12">
              <Code2 className="mx-auto h-11 w-11 text-primary" />
              <h2 className="mt-5 text-3xl font-black md:text-4xl">جاهز تبدأ رحلتك؟</h2>
              <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">سجّل طلبك، وبعد مراجعة الأدمن هيوصلك كود الدخول الخاص بيك وتبدأ تتعلم فورًا.</p>
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Button asChild size="lg" className="h-12 font-bold"><a href="/platform">دخول أو تسجيل طالب</a></Button><Button asChild size="lg" variant="outline" className="h-12 font-bold"><a href="https://wa.me/201044348610">اسألنا على واتساب</a></Button></div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <FloatingButtons />
    </div>
  );
}
