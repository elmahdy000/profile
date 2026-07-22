import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { videosTable } from "../lib/db/src/schema/videos";
import { coursesTable } from "../lib/db/src/schema/courses";
import { studentsTable } from "../lib/db/src/schema/learning";
import { eq } from "drizzle-orm";
import { normalizeLegacyStage } from "../artifacts/dr-mahmoud/src/data/stage-model";

const DATABASE_URL = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/drelmahdy";

async function runStageMigration() {
  console.log("==========================================================");
  console.log("🚀 STARTING EDUCATIONAL STAGES DATA MIGRATION & CLEANUP");
  console.log("==========================================================");

  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool);

  try {
    // 1. Fetch all videos
    const videos = await db.select().from(videosTable);
    console.log(`\n📹 Found ${videos.length} videos in database.`);

    let updatedVideosCount = 0;
    const stageDuplicationReport: Record<string, number> = {};

    for (const video of videos) {
      const originalStages = (video.stages as string[]) || (video.stage ? [video.stage] : ["عام"]);
      
      // Track frequency for duplication report
      for (const s of originalStages) {
        stageDuplicationReport[s] = (stageDuplicationReport[s] || 0) + 1;
      }

      // Normalize each stage and remove duplicates
      const normalizedStagesSet = new Set<string>();
      for (const s of originalStages) {
        if (s === "عام" || !s) {
          normalizedStagesSet.add("عام");
        } else {
          const norm = normalizeLegacyStage(s);
          normalizedStagesSet.add(norm.label);
        }
      }

      const newStages = Array.from(normalizedStagesSet);
      const newPrimaryStage = newStages[0] || "عام";

      await db
        .update(videosTable)
        .set({
          stage: newPrimaryStage,
          stages: newStages,
        })
        .where(eq(videosTable.id, video.id));

      updatedVideosCount++;
    }

    console.log(`✅ Successfully normalized stages for ${updatedVideosCount} video records.`);

    // 2. Output Duplication Report
    console.log("\n==========================================================");
    console.log("📊 STAGE DUPLICATION REPORT & CLEANUP SUMMARY");
    console.log("==========================================================");
    console.table(
      Object.entries(stageDuplicationReport).map(([legacyStage, count]) => {
        const norm = normalizeLegacyStage(legacyStage);
        return {
          "Legacy Text": legacyStage,
          "Occurrences": count,
          "Normalized Target Label": norm.label,
          "Canonical ID": norm.id,
        };
      })
    );

    console.log("\n🎉 MIGRATION COMPLETED SUCCESSFULLY!");
  } catch (err) {
    console.error("❌ Error during stage migration:", err);
  } finally {
    await pool.end();
  }
}

runStageMigration();
