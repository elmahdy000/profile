import app from "./app";
import { logger } from "./lib/logger";
import { runAutoExamSchedulerTick } from "./services/auto-exam";
import { runMonitorAgentSchedulerTick } from "./services/ai-monitor-agent";

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

  // Run auto-exam & AI monitor ticks every 60 seconds (initial run after 15 seconds)
  setTimeout(() => {
    void runAutoExamSchedulerTick();
    void runMonitorAgentSchedulerTick();
    setInterval(() => {
      void runAutoExamSchedulerTick();
      void runMonitorAgentSchedulerTick();
    }, 60 * 1000);
  }, 15 * 1000);
});
