import { z } from "zod";

const server = z.object({
  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(20),
  LOG_LEVEL: z.enum(["debug","info","warn","error"]).default("info"),
  ENABLE_SCHEMA_CHECK: z.string().optional(),
});

const client = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
});

export const env = {
  server: server.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    LOG_LEVEL: process.env.LOG_LEVEL ?? "info",
    ENABLE_SCHEMA_CHECK: process.env.ENABLE_SCHEMA_CHECK,
  }),
  client: client.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }),
} as const;
