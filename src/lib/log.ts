type Level = "info" | "warn" | "error";

// Tipos JSON-serializables (sin any)
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonArray;
interface JsonObject { [key: string]: JsonValue }
type JsonArray = JsonValue[];

export function log(level: Level, msg: string, meta: JsonObject = {}) {
  const line: JsonObject = {
    t: new Date().toISOString(),
    level,
    msg,
    ...meta,
  };
  try {
    console.log(JSON.stringify(line));
  } catch {
    console.log(JSON.stringify({ t: new Date().toISOString(), level, msg, meta: "[Unserializable]" }));
  }
}
