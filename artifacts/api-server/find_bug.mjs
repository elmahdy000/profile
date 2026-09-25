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

  console.log("=== Searching question_bank ===");
  const bankRes = await client.query(`
    SELECT id, stage, unit, lesson, question
    FROM question_bank
    WHERE question::text LIKE '%تيار التسرب%' OR question::text LIKE '%المعالجة المتوازية%'
    LIMIT 5
  `);
  for (const r of bankRes.rows) {
    console.log(`Bank ID: ${r.id}, Stage: ${r.stage}, Unit: ${r.unit}, Lesson: ${r.lesson}`);
    console.log("Question payload:", JSON.stringify(r.question, null, 2));
  }

  console.log("\n=== Searching quizzes ===");
  const quizRes = await client.query(`
    SELECT id, title, questions
    FROM quizzes
    WHERE questions::text LIKE '%تيار التسرب%' OR questions::text LIKE '%المعالجة المتوازية%'
    LIMIT 5
  `);
  for (const r of quizRes.rows) {
    console.log(`Quiz ID: ${r.id}, Title: ${r.title}`);
    const qList = r.questions || [];
    for (let i = 0; i < qList.length; i++) {
      if (JSON.stringify(qList[i]).includes("تيار التسرب") || JSON.stringify(qList[i]).includes("المعالجة المتوازية")) {
        console.log(`Q[${i}]:`, JSON.stringify(qList[i], null, 2));
      }
    }
  }

  console.log("\n=== Searching self_assessment_sessions ===");
  const sessRes = await client.query(`
    SELECT id, session_id, student_name, score, percentage, details
    FROM self_assessment_sessions
    WHERE questions::text LIKE '%تيار التسرب%' OR questions::text LIKE '%المعالجة المتوازية%'
    ORDER BY id DESC
    LIMIT 2
  `);
  for (const r of sessRes.rows) {
    console.log(`Session ID: ${r.id}, Name: ${r.student_name}, Score: ${r.score} (${r.percentage}%)`);
    if (r.details) {
      for (const d of r.details) {
        if (JSON.stringify(d).includes("تيار التسرب") || JSON.stringify(d).includes("المعالجة المتوازية")) {
          console.log("Detail item:", JSON.stringify(d, null, 2));
        }
      }
    }
  }

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
