import paramiko
import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HOST = "72.62.27.196"
USER = "root"
PASS = "e#LWhcSAa6B&R8s"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

# Run a test inside the VPS environment with the dist bundle
test_cmd = """
node --env-file=/var/www/profile/.env -e '
async function test() {
  const { getAutoExamFullConfig, generateDraftExamForSchedule } = await import("/var/www/profile/artifacts/api-server/dist/index.mjs");
  const config = await getAutoExamFullConfig();
  console.log("Current schedules count:", config.schedules.length);
  
  // Test schedule matching user screen: Stage + Unit (no lesson)
  const testSched = {
    id: "test_sched",
    title: "New Exam",
    enabled: true,
    timeOfDay: "08:00",
    stage: "البكالوريا · الصف الثاني (تانية بكالوريا) · مدارس عربي",
    unit: "منهج البكالوريا : دروس البكالوريا تانية عام (عربى)",
    lesson: "all",
    courseId: null,
    questionsCount: 5,
    durationMinutes: 15,
    passingScore: 60,
    difficultyDistribution: { easy: 2, medium: 2, hard: 1 }
  };
  
  const result = await generateDraftExamForSchedule(testSched, config.channels);
  console.log("SUCCESS! Generated quiz ID:", result.quiz?.id);
  console.log("Course title:", result.courseTitle);
  console.log("Stage:", result.stageName);
  console.log("Unit:", result.unitName);
  console.log("Lesson:", result.lessonName);
  console.log("Questions count:", result.quiz?.questions?.length);
  console.log("Telegram Result:", JSON.stringify(result.telegramResult));
}

test().catch(err => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
'
"""

stdin, stdout, stderr = ssh.exec_command(test_cmd)
print("STDOUT:\n", stdout.read().decode("utf-8", errors="replace"))
print("STDERR:\n", stderr.read().decode("utf-8", errors="replace"))
ssh.close()
