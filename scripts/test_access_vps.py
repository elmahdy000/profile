import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('72.62.27.196', port=22, username='root', password='e#LWhcSAa6B&R8s', timeout=30)

# Run test directly using psql data
node_test_code = """
function normalizeCategory(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("ar");
}

function isGradeMatch(studentStage, contentStage) {
  const sNorm = normalizeCategory(studentStage);
  const cNorm = normalizeCategory(contentStage);

  if (sNorm === cNorm) return true;

  // Grade 1 matching
  const s1 = sNorm.includes("أولى") || sNorm.includes("الأول") || sNorm.includes("first_secondary") || sNorm.includes("year_1");
  const c1 = cNorm.includes("أولى") || cNorm.includes("الأول") || cNorm.includes("first_secondary") || cNorm.includes("year_1");
  if (s1 || c1) return s1 && c1;

  // Grade 2 matching
  const s2 = sNorm.includes("تانية") || sNorm.includes("الثاني") || sNorm.includes("second_secondary") || sNorm.includes("year_2");
  const c2 = cNorm.includes("تانية") || cNorm.includes("الثاني") || cNorm.includes("second_secondary") || cNorm.includes("year_2");
  if (s2 || c2) return s2 && c2;

  // Grade 3 matching
  const s3 = sNorm.includes("ثالثة") || sNorm.includes("الثالث") || sNorm.includes("third_secondary") || sNorm.includes("year_3");
  const c3 = cNorm.includes("ثالثة") || cNorm.includes("الثالث") || cNorm.includes("third_secondary") || cNorm.includes("year_3");
  if (s3 || c3) return s3 && c3;

  return false;
}

function canStudentAccessContent(student, category, stage, stages, courseId) {
  const studentStage = student.grade === "أخرى" ? student.otherGradeDetail : student.grade;
  const contentStages = stages?.length ? stages : stage ? [stage] : [];
  
  const isGeneralContent =
    contentStages.length === 0 ||
    contentStages.some((s) => normalizeCategory(s) === "عام");

  const stageMatches =
    isGeneralContent ||
    contentStages.some((value) => isGradeMatch(studentStage, value));

  const assignedCourse = (student.enrolledCategories ?? []).some(
    (value) => normalizeCategory(value) === normalizeCategory(category),
  );
  const assignedCourseId =
    Boolean(courseId) &&
    (student.enrolledCourseIds ?? []).includes(Number(courseId));

  if (courseId) {
    if (assignedCourseId || assignedCourse) return true;
  }

  const categoryMatches = assignedCourse || false;
  if (contentStages.length > 0) {
    return stageMatches || (isGeneralContent && categoryMatches);
  }
  return categoryMatches;
}

const student = {
  grade: "البكالوريا · الصف الأول (أولى بكالوريا) · مدارس عربي",
  enrolledCategories: [],
  enrolledCourseIds: []
};

const video = {
  category: "C++ Programming",
  stage: "أولى بكالوريا",
  stages: ["أولى بكالوريا", "البكالوريا · الصف الثاني (تانية بكالوريا) · مدارس عربي"],
  courseId: 6
};

console.log("canStudentAccessContent result:", canStudentAccessContent(student, video.category, video.stage, video.stages, video.courseId));
"""

sftp = client.open_sftp()
with sftp.open("/var/www/profile/test_access.js", "w") as f:
    f.write(node_test_code)
sftp.close()

stdin, stdout, stderr = client.exec_command("node /var/www/profile/test_access.js")
print(stdout.read().decode("utf-8", errors="replace"))

client.exec_command("rm -f /var/www/profile/test_access.js")
client.close()
