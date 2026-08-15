import fs from "fs";

const file = "c:/Users/engel/Desktop/profile/artifacts/dr-mahmoud/src/components/AcademyHome.tsx";
let content = fs.readFileSync(file, "utf8");

const startStr = `<span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-xs font-bold text-blue-700 border border-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-400/35">`;
const endStr = `{/* Trust line */}`;

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `<span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-xs font-bold text-blue-700 border border-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-400/35">
                  <GraduationCap className="h-4 w-4 text-blue-600" />
                  برامج البكالوريا المصرية وحاسبات ومعلومات • أونلاين لكل مصر
                </span>

                <h1 className="text-3xl font-black leading-tight text-slate-900 sm:text-4xl md:text-5xl">
                  اتعلم البرمجة وعلوم الحاسب <span className="text-blue-600">من البداية صح</span>
                </h1>

                <p className="max-w-2xl text-base font-semibold leading-relaxed text-slate-600 md:text-lg">
                  شرح عملي وتأسيس شامل لطلاب البكالوريا وحاسبات ومعلومات مع د. محمود المهدي، ماجستير نظم المعلومات.
                </p>

                {/* Primary Dual Actions: Baccalaureate & Computer Science */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <Button asChild size="lg" className="h-12 rounded-xl bg-blue-600 px-4 font-black text-white hover:bg-blue-700 shadow-md w-full justify-center">
                    <a href="/baccalaureate" className="flex items-center justify-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      <span>برنامج البكالوريا</span>
                      <ArrowLeft className="mr-1 h-4 w-4" />
                    </a>
                  </Button>

                  <Button asChild size="lg" className="h-12 rounded-xl bg-indigo-600 px-4 font-black text-white hover:bg-indigo-700 shadow-md w-full justify-center">
                    <a href="/university" className="flex items-center justify-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      <span>حاسبات ومعلومات</span>
                      <ArrowLeft className="mr-1 h-4 w-4" />
                    </a>
                  </Button>
                </div>

                {/* Secondary Actions */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <Button asChild size="lg" variant="outline" className="h-11 rounded-xl border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:bg-slate-800">
                    <a href="/platform" className="flex items-center justify-center gap-1.5">
                      <Laptop className="h-4 w-4 text-blue-600" />
                      <span>دخول الطالب</span>
                    </a>
                  </Button>

                  <Button asChild size="lg" variant="outline" className="h-11 rounded-xl border-blue-200 bg-blue-50/70 px-3 text-xs font-bold text-blue-800 hover:bg-blue-100 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-200 dark:hover:bg-blue-500/20">
                    <a href="/parent" className="flex items-center justify-center gap-1.5">
                      <Users className="h-4 w-4 text-blue-700" />
                      <span>بوابة ولي الأمر</span>
                    </a>
                  </Button>
                </div>

                `;

  content = content.slice(0, startIndex) + replacement + content.slice(endIndex);
  fs.writeFileSync(file, content, "utf8");
  console.log("SUCCESSFULLY PATCHED ACADEMYHOME HERO");
} else {
  console.log("START OR END STR NOT FOUND", { startIndex, endIndex });
}
