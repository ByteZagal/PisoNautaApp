import { PoolClient } from "pg";

const ENABLE = process.env.ENABLE_SCHEMA_CHECK === "true";

/**
 * Si ENABLE=true: crea tabla si no existe. Si existe, no hace nada.
 */
export async function ensureTable(client: PoolClient, tableName: string, createDDL: string): Promise<void> {
  if (!ENABLE) return;

  const existsRes = await client.query<{ exists: boolean }>(
    `select exists (
       select 1
       from information_schema.tables
       where table_schema = 'public' and table_name = $1
     ) as exists`,
    [tableName]
  );
  const exists = existsRes.rows[0]?.exists === true;
  if (exists) return;

  await client.query(createDDL);
}
