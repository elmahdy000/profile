import express, { type Express } from "express";
import cors, { type CorsOptions } from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { errorHandler } from "./middleware/error-handler";
import { logger } from "./lib/logger";

import path from "path";
import cookieParser from "cookie-parser";

const app: Express = express();

// The production service is behind one nginx reverse proxy. This makes
// request IPs (and therefore rate limits) work per visitor instead of treating
// every visitor as the proxy itself.
app.set("trust proxy", 1);

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }
  next();
});

// Allowed origins come from the CORS_ORIGINS env var (comma-separated).
// If unset, CORS is disabled (same-origin only) rather than wide-open.
const allowedOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Allow same-origin / non-browser requests (no Origin header).
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    try {
      const url = new URL(origin);
      if (
        url.hostname === "localhost" ||
        url.hostname === "127.0.0.1" ||
        url.hostname === "drelmahdy.com" ||
        url.hostname === "www.drelmahdy.com"
      ) {
        callback(null, true);
        return;
      }
    } catch (e) {
      // Ignore invalid URLs
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
app.use(cookieParser());

// Serve static uploads. `X-Content-Type-Options: nosniff` prevents browsers
// from re-interpreting an uploaded file as an executable type (e.g. HTML),
// mitigating stored-XSS from user-supplied files.
app.use(
  "/uploads",
  (req, res, next) => {
    // Videos must only be read through the authorization-aware range endpoint.
    // Images and audio continue to be served as ordinary public assets.
    if (/\.(mp4|webm|ogv|ogg|mov|avi|mkv)$/i.test(req.path)) {
      res.status(404).end();
      return;
    }
    next();
  },
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
