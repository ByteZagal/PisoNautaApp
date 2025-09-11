import { z } from "zod";

/** Variables del lado servidor (siempre se validan) */
const serverSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(20),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  ENABLE_SCHEMA_CHECK: z.string().optional(),
});

/** Variables públicas de cliente (se validan SOLO al acceder) */
const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
});

const server = serverSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  LOG_LEVEL: process.env.LOG_LEVEL ?? "info",
  ENABLE_SCHEMA_CHECK: process.env.ENABLE_SCHEMA_CHECK,
});

/**
 * Export: env.server (siempre OK) y env.client (getter “lazy”).
 * En build/route handlers del servidor NO se toca env.client,
 * así evitamos errores si NEXT_PUBLIC_* no está definido aún.
 */
export const env = {
  server,
  get client() {
    return clientSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });
  },
} as const;
