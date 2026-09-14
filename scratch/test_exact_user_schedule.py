import paramiko
import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HOST = "72.62.27.196"
USER = "root"
PASS = "e#LWhcSAa6B&R8s"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

# Run test with environment variables set
cmd = """
export PORT=5000
export SESSION_SECRET="dr-mahmoud-session-secret"
export DATABASE_URL="postgresql://postgres:pass1234@localhost:5432/profile"
export STREAM_TOKEN_SECRET="dr-mahmoud-auto-exam-secret-salt"
export ADMIN_PASSWORD="dummy"

node -e '
async function test() {
  const { getAutoExamFullConfig, generateDraftExamForSchedule } = await import("/var/www/profile/artifacts/api-server/dist/index.mjs");
  const config = await getAutoExamFullConfig();
  console.log("Found schedules:", config.schedules.length);
  const sched = config.schedules[0];
  console.log("Testing schedule:", sched.title, "Stage:", sched.stage, "Unit:", sched.unit, "Lesson:", sched.lesson);
  
  const result = await generateDraftExamForSchedule(sched, config.channels);
  console.log("RESULT SUCCESS!");
  console.log("Draft Quiz ID:", result.quiz?.id);
  console.log("Course Title:", result.courseTitle);
  console.log("Questions picked:", result.quiz?.questions?.length);
}
test().catch(err => {
  console.error("TEST ERROR:", err);
  process.exit(1);
});
'
"""

stdin, stdout, stderr = ssh.exec_command(cmd)
print("STDOUT:\n", stdout.read().decode("utf-8", errors="replace"))
print("STDERR:\n", stderr.read().decode("utf-8", errors="replace"))
ssh.close()
