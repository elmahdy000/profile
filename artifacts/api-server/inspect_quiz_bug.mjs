import pg from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: "../../.env" });
dotenv.config();

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  await client.connect();

  const resQuizzes = await client.query(`
    SELECT id, title, "shuffleQuestions", "questionsToShow", jsonb_array_length(questions) 
    FROM quizzes 
    ORDER BY id DESC 
    LIMIT 5
  `);
  console.log("=== Recent Quizzes ===");
  for (const q of resQuizzes.rows) {
    console.log(q);
  }

  const resAttempts = await client.query(`
    SELECT id, "quizId", "studentId", score, passed, answers, details, "createdAt" 
    FROM quiz_attempts 
    ORDER BY id DESC 
    LIMIT 5
  `);
  console.log("\n=== Recent Attempts ===");
  for (const a of resAttempts.rows) {
    console.log(`Attempt ID: ${a.id} | Quiz ID: ${a.quizId} | Student ID: ${a.studentId} | Score: ${a.score}% | Passed: ${a.passed}`);
    console.log("Answers array:", JSON.stringify(a.answers));
    if (a.details) {
      console.log("Details sample:", JSON.stringify(a.details.slice(0, 5)));
    }
  }

  if (resAttempts.rows.length > 0) {
    const latestAttempt = resAttempts.rows[0];
    const resQuiz = await client.query('SELECT id, title, "shuffleQuestions", "questionsToShow", questions FROM quizzes WHERE id = $1', [latestAttempt.quizId]);
    if (resQuiz.rows.length > 0) {
      const qz = resQuiz.rows[0];
      console.log(`\n=== Target Quiz for Attempt ${latestAttempt.id} (${qz.title}) ===`);
      console.log(`shuffleQuestions: ${qz.shuffleQuestions}, questionsToShow: ${qz.questionsToShow}`);
      qz.questions.forEach((q, idx) => {
        console.log(`Q[${idx}]: correctIndex=${q.correctIndex}, options=${JSON.stringify(q.options)}`);
      });
    }
  }

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
