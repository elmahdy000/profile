import express, { type Express } from "express";
import cors, { type CorsOptions } from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { errorHandler } from "./middleware/error-handler";
import { logger } from "./lib/logger";

import path from "path";

const app: Express = express();

// Allowed origins come from the CORS_ORIGINS env var (comma-separated).
// If unset, CORS is disabled (same-origin only) rather than wide-open.
const allowedOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Allow same-origin / non-browser requests (no Origin header).
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Not allowed by CORS"));
  },
};

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Serve static uploads. `X-Content-Type-Options: nosniff` prevents browsers
// from re-interpreting an uploaded file as an executable type (e.g. HTML),
// mitigating stored-XSS from user-supplied files.
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "public/uploads"), {
    setHeaders(res) {
      res.setHeader("X-Content-Type-Options", "nosniff");
    },
  }),
);

app.use("/api", router);

// Global error handler — must be registered last.
app.use(errorHandler);

export default app;
