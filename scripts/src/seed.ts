import { db, coursesTable, podcastsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const initialCourses = [
  {
    title: "Kids Programming Package",
    age: "من 4 إلى 18 سنة",
    duration: "3 أشهر",
    sessions: "12 حصة",
    level: "مبتدئ",
    category: "kids",
    tags: ["Scratch", "Python basics", "AI basics", "mini projects", "creative thinking"],
    img: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&q=70"
  },
  {
    title: "Python Track",
    age: "من الصفر",
    duration: "شهرين",
    sessions: "16 حصة",
    level: "مبتدئ → متوسط",
    category: "python",
    tags: ["Variables", "Conditions", "Loops", "Functions", "Lists", "OOP", "Problem Solving"],
    img: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=400&q=70"
  },
  {
    title: "SQL & Database Design",
    age: "جميع المستويات",
    duration: "شهرين",
    sessions: "16 حصة",
    level: "مبتدئ → متوسط",
    category: "db",
    tags: ["SQL", "SQL Server", "MySQL", "Database Design", "ERD", "Joins", "Stored Procedures", "Indexes"],
    img: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=400&q=70"
  },
  {
    title: "Flutter Development",
    age: "للمبتدئين والمحترفين",
    duration: "3 أشهر",
    sessions: "20 حصة",
    level: "مبتدئ → متقدم",
    category: "mobile",
    tags: ["Dart", "Flutter", "Widgets", "State Management", "APIs", "Firebase", "iOS & Android"],
    img: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&q=70"
  },
  {
    title: "Android Native",
    age: "للمبتدئين والمحترفين",
    duration: "3 أشهر",
    sessions: "20 حصة",
    level: "مبتدئ → متقدم",
    category: "mobile",
    tags: ["Java", "Kotlin", "Android Studio", "XML Layouts", "Activities", "APIs", "Firebase"],
    img: "https://images.unsplash.com/photo-1607252650355-f7fd0460ccdb?w=400&q=70"
  },
  {
    title: "C++ Programming",
    age: "طلاب الجامعة والثانوي",
    duration: "شهرين",
    sessions: "14 حصة",
    level: "مبتدئ → متقدم",
    category: "university",
    tags: ["C++ Basics", "OOP", "Pointers", "Data Structures", "Algorithms", "STL", "Problem Solving"],
    img: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=400&q=70"
  },
  {
    title: "Java Programming",
    age: "طلاب الجامعة والمحترفون",
    duration: "شهرين",
    sessions: "16 حصة",
    level: "مبتدئ → متقدم",
    category: "university",
    tags: ["Java Basics", "OOP", "Collections", "Generics", "Exception Handling", "Design Patterns"],
    img: "https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?w=400&q=70"
  },
  {
    title: "AI Starter Track",
    age: "للمبتدئين والطلاب",
    duration: "شهر",
    sessions: "8 حصص",
    level: "مبتدئ",
    category: "ai",
    tags: ["AI concepts", "Machine Learning basics", "Prompting", "ChatGPT", "Practical tools", "Projects"],
    img: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&q=70"
  },
  {
    title: "Python for Data & AI",
    age: "من الصفر للاحتراف",
    duration: "3 أشهر",
    sessions: "20 حصة",
    level: "متوسط → متقدم",
    category: "ai",
    tags: ["Python", "NumPy", "Pandas", "Matplotlib", "Scikit-learn", "ML Models", "Real Projects"],
    img: "https://images.unsplash.com/photo-1591696205602-2f950c417cb9?w=400&q=70"
  },
  {
    title: "ICDL Practical Track",
    age: "جميع المستويات",
    duration: "شهر ونص",
    sessions: "10 حصص",
    level: "مبتدئ",
    category: "icdl",
    tags: ["Word", "PowerPoint", "Excel", "presentations", "reports", "spreadsheets"],
    img: "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=400&q=70"
  },
  {
    title: "University Support",
    age: "طلاب الجامعة",
    duration: "حسب المادة",
    sessions: "جلسات فردية",
    level: "متوسط → متقدم",
    category: "university",
    tags: ["C++", "OOP", "Data Structures", "Algorithms", "Database", "Discrete Math"],
    img: "https://images.unsplash.com/photo-1562774053-701939374585?w=400&q=70"
  },
  {
    title: "Baccalaureate Programming",
    age: "طلاب البكالوريا",
    duration: "شهرين",
    sessions: "14 حصة",
    level: "مبتدئ → متوسط",
    category: "university",
    tags: ["Programming basics", "logic", "Python", "problem solving", "practical exercises"],
    img: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=400&q=70"
  }
];

const initialPodcasts = [
  {
    title: "دخلوا المجال عشان الترند؟",
    desc: "هل اختيار البرمجة بسبب الترند قرار صح؟ وإيه الفرق بين اللي بيتعلم وعنده هدف واللي بيجري وراء الموضة؟",
    duration: "45 دقيقة",
    youtubeUrl: "https://youtube.com/@dr-mahmoud",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" // sample audio URL
  },
  {
    title: "ولا فاهمين البكالوريا والبرمجة صح؟",
    desc: "كيف يجمع الطالب بين دراسة البكالوريا وتعلم البرمجة؟ وإيه الخطوات العملية للبداية الصح؟",
    duration: "38 دقيقة",
    youtubeUrl: "https://youtube.com/@dr-mahmoud",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" // sample audio URL
  },
  {
    title: "الذكاء الاصطناعي هيأكل الشغل ولا هيخلق فرص؟",
    desc: "نقاش صريح عن مستقبل سوق العمل في عصر الـ AI وإزاي تتأهل للمرحلة الجاية.",
    duration: "52 دقيقة",
    youtubeUrl: "https://youtube.com/@dr-mahmoud",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" // sample audio URL
  }
];

async function main() {
  console.log("Seeding database...");
  
  // Clear tables
  await db.execute(sql`TRUNCATE TABLE courses, podcasts RESTART IDENTITY CASCADE`);
  console.log("Cleared existing courses and podcasts.");

  // Insert courses
  await db.insert(coursesTable).values(initialCourses);
  console.log(`Inserted ${initialCourses.length} courses.`);

  // Insert podcasts
  await db.insert(podcastsTable).values(initialPodcasts);
  console.log(`Inserted ${initialPodcasts.length} podcasts.`);

  console.log("Database seeded successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
