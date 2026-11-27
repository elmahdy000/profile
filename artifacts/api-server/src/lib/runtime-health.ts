import os from "os";

export interface RecordedServerError {
  id: string;
  method: string;
  path: string;
  message: string;
  at: string;
}

const MAX_ERRORS = 50;
const recentErrors: RecordedServerError[] = [];

export function recordServerError(method: string, path: string, err: unknown): void {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "Unhandled internal error";

  recentErrors.unshift({
    id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    method: method || "GET",
    path: (path || "/").slice(0, 140),
    message: String(message).slice(0, 260),
    at: new Date().toISOString(),
  });

  if (recentErrors.length > MAX_ERRORS) {
    recentErrors.length = MAX_ERRORS;
  }
}

export function getRecentServerErrors(hours = 24): RecordedServerError[] {
  const cutoff = Date.now() - hours * 3600 * 1000;
  return recentErrors.filter((e) => new Date(e.at).getTime() >= cutoff);
}

export function getProcessRuntimeStats() {
  const mem = process.memoryUsage();
  const totalOsMemMb = Math.round(os.totalmem() / (1024 * 1024));
  const freeOsMemMb = Math.round(os.freemem() / (1024 * 1024));
  return {
    uptimeSeconds: Math.round(process.uptime()),
    nodeVersion: process.version,
    processRssMb: Math.round(mem.rss / (1024 * 1024)),
    heapUsedMb: Math.round(mem.heapUsed / (1024 * 1024)),
    osFreeMemMb: freeOsMemMb,
    osTotalMemMb: totalOsMemMb,
    osMemUsedPercent: totalOsMemMb > 0 ? Math.round(((totalOsMemMb - freeOsMemMb) / totalOsMemMb) * 100) : 0,
    loadAvg1m: Number((os.loadavg()[0] || 0).toFixed(2)),
    errorsLast24hCount: getRecentServerErrors(24).length,
    recentErrors: getRecentServerErrors(24).slice(0, 8),
  };
}
