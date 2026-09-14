import paramiko
import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HOST = "72.62.27.196"
USER = "root"
PASS = "e#LWhcSAa6B&R8s"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

# Check what schedules exist in the database or test node code directly
test_cmd = """
node -e '
async function test() {
  const { getAutoExamFullConfig, generateDraftExamForSchedule } = await import("/var/www/profile/artifacts/api-server/dist/services/auto-exam.js");
  const config = await getAutoExamFullConfig();
  console.log("CHANNELS CONFIG:", JSON.stringify(config.channels, null, 2));
  console.log("SCHEDULES COUNT:", config.schedules.length);
  if (config.schedules.length > 0) {
    console.log("FIRST SCHEDULE:", JSON.stringify(config.schedules[0], null, 2));
    const result = await generateDraftExamForSchedule(config.schedules[0], config.channels);
    console.log("TRIGGER RESULT:", JSON.stringify({
      success: true,
      quizId: result.quiz?.id,
      quizTitle: result.quiz?.title,
      courseTitle: result.courseTitle,
      telegramResult: result.telegramResult
    }, null, 2));
  }
}
test().catch(err => console.error(err));
'
"""

stdin, stdout, stderr = ssh.exec_command(test_cmd)
print("STDOUT:")
print(stdout.read().decode("utf-8", errors="replace"))
print("STDERR:")
print(stderr.read().decode("utf-8", errors="replace"))
ssh.close()
