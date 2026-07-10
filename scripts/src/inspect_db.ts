import { db, coursesTable, podcastsTable, videosTable, curriculumsTable } from "@workspace/db";

async function main() {
  try {
    const courses = await db.select().from(coursesTable);
    console.log("Courses in DB:", JSON.stringify(courses, null, 2));

    const videos = await db.select().from(videosTable);
    console.log("Videos in DB count:", videos.length);
    console.log("Videos categories:", Array.from(new Set(videos.map(v => v.category))));

    const curriculums = await db.select().from(curriculumsTable);
    console.log("Curriculums count:", curriculums.length);
    console.log("Curriculums subjects:", Array.from(new Set(curriculums.map(c => c.subject))));
  } catch (err) {
    console.error("Error inspecting database:", err);
  }
  process.exit(0);
}

main();
