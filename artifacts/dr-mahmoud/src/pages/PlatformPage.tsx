import { useEffect } from "react";
import { ScrollProgress } from "@/components/ScrollProgress";
import { Navbar } from "@/components/Navbar";
import { StudentPlatform } from "@/components/platform/StudentPlatform";

export default function PlatformPage() {
  useEffect(() => {
    document.title = "المنصة التعليمية | د. محمود المهدي";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "منصة د. محمود المهدي التعليمية: كورسات ومسارات برمجة منظمة للمدارس والجامعة والمبتدئين.",
      );
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  return (
    <>
      <ScrollProgress />
      <Navbar />
      <main>
        <StudentPlatform />
      </main>
    </>
  );
}
