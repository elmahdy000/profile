// Build-time static entry pages for crawlers. Runs after `vite build`.
// For each public route it writes dist/public/<route>/index.html with its own
// title, description, canonical, OG tags and real HTML text inside #root
// (React replaces it on load). Also writes 404.html (SPA shell, served with 404 status).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SITE = "https://drelmahdy.com";
const outputRoot = resolve(import.meta.dirname, "../dist/public");
const sourceHtml = await readFile(resolve(outputRoot, "index.html"), "utf8");

const pages = [
  {
    route: "baccalaureate",
    title: "برمجة البكالوريا المصرية أونلاين | د. محمود المهدي",
    description: "شرح منهج برمجة البكالوريا المصرية لأولى وثانية ثانوي أونلاين: Python والتفكير المنطقي والمشروعات والاختبارات مع د. محمود المهدي. احجز تقييمًا مجانيًا.",
    image: "opengraph-baccalaureate-2026.png",
    h1: "شرح برمجة البكالوريا المصرية أونلاين",
    body: [
      ["p", "شرح منهج البرمجة وعلوم الحاسب لطلاب أولى وثانية ثانوي في نظام البكالوريا المصرية مع د. محمود المهدي."],
      ["h2", "محتوى كورس برمجة البكالوريا"],
      ["p", "Python، التفكير المنطقي، حل المشكلات، الخوارزميات، هياكل البيانات، الدوال، المشروعات العملية، التدريبات والاختبارات."],
      ["h2", "حصص أونلاين وحضوري"],
      ["p", "الحصص متاحة أونلاين لكل محافظات مصر وحضوريًا في الزقازيق، مع متابعة للطالب وتقييم مجاني قبل البدء."],
    ],
  },
  {
    route: "platform",
    title: "المنصة التعليمية لبرمجة البكالوريا | د. محمود المهدي",
    description: "منصة د. محمود المهدي التعليمية: دروس فيديو واختبارات وتدريبات لطلاب برمجة البكالوريا المصرية، تسجيل الطلاب ومتابعة النتائج أونلاين.",
    image: "opengraph-baccalaureate-2026.png",
    h1: "المنصة التعليمية لبرمجة البكالوريا المصرية",
    body: [
      ["p", "منصة أونلاين للطلاب: دروس فيديو، اختبارات، تدريبات، ومتابعة النتائج، مع د. محمود المهدي."],
      ["p", "سجل حسابك وابدأ المذاكرة من أي مكان في مصر."],
    ],
  },
  {
    route: "university",
    title: "مواد حاسبات ومعلومات وكليات الهندسة | د. محمود المهدي",
    description: "شرح مبسط لمواد حاسبات ومعلومات وبرمجة لطلاب الجامعات وكليات الهندسة والحاسبات مع د. محمود المهدي، ماجستير نظم المعلومات.",
    image: "opengraph.jpg",
    h1: "شرح وتبسيط مواد حاسبات ومعلومات",
    body: [
      ["p", "شرح مواد البرمجة والحاسبات لطلاب الجامعات وكليات الهندسة والحاسبات والمعلومات مع د. محمود المهدي."],
    ],
  },
  {
    route: "curriculum",
    title: "المناهج والملخصات البرمجية المصورة | د. محمود المهدي",
    description: "ملخصات ومناهج برمجة مصورة ومبسطة بالعربي لطلاب البكالوريا والجامعات مع د. محمود المهدي.",
    image: "opengraph.jpg",
    h1: "المناهج والملخصات البرمجية المصورة",
    body: [
      ["p", "ملخصات مصورة ومبسطة لمناهج البرمجة بالعربي لطلاب البكالوريا والجامعات."],
    ],
  },
];

const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function swap(html, pattern, replacement) {
  if (!pattern.test(html)) throw new Error(`SEO source tag not found: ${pattern}`);
  return html.replace(pattern, () => replacement);
}

function render(p) {
  const url = `${SITE}/${p.route}`;
  const img = `${SITE}/${p.image}`;
  let h = sourceHtml;
  h = swap(h, /<title>[\s\S]*?<\/title>/, `<title>${esc(p.title)}</title>`);
  h = swap(h, /<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${esc(p.description)}" />`);
  h = swap(h, /<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${url}" />`);
  h = swap(h, /<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${url}" />`);
  h = swap(h, /<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${esc(p.title)}" />`);
  h = swap(h, /<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${esc(p.description)}" />`);
  h = swap(h, /<meta property="og:image" content="[^"]*" \/>/, `<meta property="og:image" content="${img}" />`);
  h = swap(h, /<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${esc(p.title)}" />`);
  h = swap(h, /<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${esc(p.description)}" />`);
  h = swap(h, /<meta name="twitter:image" content="[^"]*" \/>/, `<meta name="twitter:image" content="${img}" />`);
  const inner = [`<h1>${esc(p.h1)}</h1>`, ...p.body.map(([t, x]) => `<${t}>${esc(x)}</${t}>`),
    `<p><a href="${SITE}/">الرئيسية</a></p>`].join("");
  h = swap(h, /<div id="root"><\/div>/, `<div id="root"><main dir="rtl" style="max-width:720px;margin:0 auto;padding:24px;font-family:Cairo,sans-serif">${inner}</main></div>`);
  return h;
}

for (const p of pages) {
  const dir = resolve(outputRoot, p.route);
  await mkdir(dir, { recursive: true });
  await writeFile(resolve(dir, "index.html"), render(p), "utf8");
  console.log(`Generated SEO entry: dist/public/${p.route}/index.html`);
}

// Home page: add real text inside #root too (keeps its own head).
const home = swap(
  sourceHtml,
  /<div id="root"><\/div>/,
  `<div id="root"><main dir="rtl" style="max-width:720px;margin:0 auto;padding:24px;font-family:Cairo,sans-serif"><h1>د. محمود المهدي | مدرس برمجة البكالوريا المصرية أونلاين</h1><p>شرح وتأسيس البرمجة لطلاب البكالوريا المصرية أولى وثانية ثانوي، حصص أونلاين لكل محافظات مصر وحضوريًا في الزقازيق.</p></main></div>`,
);
await writeFile(resolve(outputRoot, "index.html"), home, "utf8");

// 404 shell: the SPA renders its NotFound page; nginx serves it with status 404.
const notFoundHtml = sourceHtml
  .replace(/<meta name="robots" content="[^"]*" \/>/, '<meta name="robots" content="noindex, nofollow" />')
  .replace(/\s*<link rel="canonical"[^>]*>/, "");
await writeFile(resolve(outputRoot, "404.html"), notFoundHtml, "utf8");
console.log("Generated 404.html");
