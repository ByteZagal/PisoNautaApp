import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL!;
export const pool = new Pool({
  connectionString,
  max: 5,
  idleTimeoutMillis: 30_000,
});
