import { useEffect, useState } from "react";
import { ScrollProgress } from "@/components/ScrollProgress";
import { Navbar } from "@/components/Navbar";
import { StudentPlatform } from "@/components/platform/StudentPlatform";

export default function PlatformPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
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

  useEffect(() => {
    const check = () => {
      const deviceId = localStorage.getItem("dr_mahmoud_device_id") || "";
      const headers: Record<string, string> = {};
      if (deviceId) headers["X-Device-Id"] = deviceId;

      return fetch("/api/student/me", { credentials: "include", headers })
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => setAuthenticated(Boolean(data?.student)))
        .catch(() => setAuthenticated(false))
        .finally(() => setAuthChecked(true));
    };
    void check();
    window.addEventListener("student-auth-changed", check);
    return () => window.removeEventListener("student-auth-changed", check);
  }, []);

  return (
    <>
      {!authenticated && <ScrollProgress />}
      {authChecked && !authenticated && <Navbar />}
      <div>
        <StudentPlatform />
      </div>
    </>
  );
}
