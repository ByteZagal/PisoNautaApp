export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogMeta = Record<string, unknown>;

export interface LogEvent {
  level: LogLevel;
  msg: string;
  time: string; // ISO
  meta?: LogMeta;
}

function emit(evt: LogEvent): void {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(evt));
}

export function log(level: LogLevel, msg: string, meta?: LogMeta): void {
  emit({ level, msg, meta, time: new Date().toISOString() });
}

export const logDebug = (msg: string, meta?: LogMeta) => log("debug", msg, meta);
export const logInfo  = (msg: string, meta?: LogMeta) => log("info", msg, meta);
export const logWarn  = (msg: string, meta?: LogMeta) => log("warn", msg, meta);
export const logError = (msg: string, meta?: LogMeta) => log("error", msg, meta);
