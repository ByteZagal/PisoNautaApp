import { Pool } from "pg";

// Usa tu DATABASE_URL del .env(.local|Vercel)
const connectionString = process.env.DATABASE_URL!;
export const pool = new Pool({
  connectionString,
  max: 5,
  idleTimeoutMillis: 30_000,
});
