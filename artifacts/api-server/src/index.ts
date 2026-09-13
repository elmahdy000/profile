import app from "./app";
import { logger } from "./lib/logger";
import { runAutoExamSchedulerTick } from "./services/auto-exam";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Run auto-exam check every 60 seconds (and initial check after 15 seconds)
  setTimeout(() => {
    void runAutoExamSchedulerTick();
    setInterval(() => {
      void runAutoExamSchedulerTick();
    }, 60 * 1000);
  }, 15 * 1000);
});
