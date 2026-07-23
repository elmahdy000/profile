import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

/**
 * Structural check for a ZodError. We avoid `instanceof` because zod reaches
 * this package transitively (via @workspace/api-zod); a duplicated module copy
 * would break identity checks. A ZodError is identified by name + issues array.
 */
function isZodError(
  err: unknown,
): err is { name: string; issues: unknown[] } {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { name?: unknown }).name === "ZodError" &&
    Array.isArray((err as { issues?: unknown }).issues)
  );
}

function isMulterError(
  err: unknown,
): err is { name: string; code: string; message: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { name?: unknown }).name === "MulterError"
  );
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  if (isZodError(err)) {
    res.status(400).json({ error: "Validation failed", issues: err.issues });
    return;
  }

  if (isMulterError(err)) {
    const tooLarge = err.code === "LIMIT_FILE_SIZE";
    res.status(tooLarge ? 413 : 400).json({
      error: tooLarge
        ? "حجم الملف أكبر من الحد المسموح (150 MB). اضغط الملف أو اختر ملفًا أصغر."
        : err.message,
    });
    return;
  }

  // Upload fileFilter rejections surface as plain Errors with a known message.
  if (
    err instanceof Error &&
    /allowed|Only (images|audio)/i.test(err.message)
  ) {
    res.status(400).json({ error: err.message });
    return;
  }

  logger.error({ err }, "Unhandled request error");
  res.status(500).json({ error: "Internal server error" });
}
