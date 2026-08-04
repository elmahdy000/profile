import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const outputRoot = resolve(import.meta.dirname, "../dist/public");
const sourceHtml = await readFile(resolve(outputRoot, "index.html"), "utf8");

const replacements = new Map([
  [
    /<title>[\s\S]*?<\/title>/,
    "<title>برمجة البكالوريا المصرية أونلاين | د. محمود المهدي</title>"
  ],
  [
    /<meta name="description" content="[^"]*" \/>/,
    '<meta name="description" content="شرح منهج برمجة البكالوريا المصرية لأولى وثانية ثانوي أونلاين: Python والتفكير المنطقي والمشروعات والاختبارات مع د. محمود المهدي. احجز تقييمًا مجانيًا." />'
  ],
  [
    /<link rel="canonical" href="[^"]*" \/>/,
    '<link rel="canonical" href="https://drelmahdy.com/baccalaureate" />'
  ],
  [/<meta property="og:url" content="[^"]*" \/>/, '<meta property="og:url" content="https://drelmahdy.com/baccalaureate" />'],
  [/<meta property="og:title" content="[^"]*" \/>/, '<meta property="og:title" content="برمجة البكالوريا المصرية أونلاين | د. محمود المهدي" />'],
  [/<meta property="og:description" content="[^"]*" \/>/, '<meta property="og:description" content="شرح وتأسيس منهج برمجة البكالوريا المصرية لأولى وثانية ثانوي مع تدريبات واختبارات ومتابعة أونلاين." />'],
  [/<meta property="og:image" content="[^"]*" \/>/, '<meta property="og:image" content="https://drelmahdy.com/opengraph-baccalaureate-2026.png" />'],
  [/<meta name="twitter:title" content="[^"]*" \/>/, '<meta name="twitter:title" content="برمجة البكالوريا المصرية أونلاين | د. محمود المهدي" />'],
  [/<meta name="twitter:description" content="[^"]*" \/>/, '<meta name="twitter:description" content="شرح منهج برمجة البكالوريا المصرية لأولى وثانية ثانوي أونلاين، من الصفر وحتى المشروعات والاختبارات." />'],
  [/<meta name="twitter:image" content="[^"]*" \/>/, '<meta name="twitter:image" content="https://drelmahdy.com/opengraph-baccalaureate-2026.png" />']
]);

let pageHtml = sourceHtml;
for (const [pattern, replacement] of replacements) {
  if (!pattern.test(pageHtml)) throw new Error(`SEO source tag was not found: ${pattern}`);
  pageHtml = pageHtml.replace(pattern, replacement);
}

const staticSummary = `
    <noscript>
      <main dir="rtl">
        <h1>شرح برمجة البكالوريا المصرية أونلاين</h1>
        <p>شرح منهج البرمجة وعلوم الحاسب لطلاب أولى وثانية ثانوي في نظام البكالوريا المصرية مع د. محمود المهدي.</p>
        <h2>محتوى كورس برمجة البكالوريا</h2>
        <p>Python، التفكير المنطقي، حل المشكلات، الخوارزميات، هياكل البيانات، الدوال، المشروعات العملية، التدريبات والاختبارات.</p>
        <h2>حصص أونلاين وحضوري</h2>
        <p>الحصص متاحة أونلاين لكل محافظات مصر وحضوريًا في الزقازيق، مع متابعة للطالب وتقييم مجاني قبل البدء.</p>
        <p><a href="https://drelmahdy.com/">الرئيسية</a> — <a href="https://wa.me/201066711545">احجز تقييمًا مجانيًا</a></p>
      </main>
    </noscript>`;

pageHtml = pageHtml.replace('<div id="root"></div>', `<div id="root"></div>${staticSummary}`);

const targetDirectory = resolve(outputRoot, "baccalaureate");
await mkdir(targetDirectory, { recursive: true });
await writeFile(resolve(targetDirectory, "index.html"), pageHtml, "utf8");

console.log("Generated SEO entry: dist/public/baccalaureate/index.html");
