import { pool } from "./db";

const required: Record<string, string[]> = {
  users: ["id","email","name","avatar_url","created_at"],
  houses: ["id","name","created_at"],
  memberships: ["user_id","house_id","role","joined_at"],
  rooms: ["id","house_id","name"],
  tasks: ["id","house_id","room_id","title","assigned_to","due_date","completed","created_at"],
  shopping_items: ["id","house_id","title","quantity","added_by","created_at"],
  expenses: ["id","house_id","title","amount","paid_by","split_method","created_at"],
  agreements: ["id","house_id","text","created_at"],
  agreement_acceptances: ["agreement_id","user_id","accepted_at"],
  activities: ["id","house_id","user_id","type","payload","created_at"],
};

const cache = new Map<string, boolean>();

export async function ensureTable(table: string): Promise<boolean> {
  if (process.env.ENABLE_SCHEMA_CHECK !== "true") return true;
  if (cache.has(table)) return cache.get(table)!;
  const { rows } = await pool.query(
    `select column_name from information_schema.columns
     where table_schema='public' and table_name=$1`,
    [table]
  );
  const cols = rows.map((r) => r.column_name);
  const ok = (required[table] || []).every((c) => cols.includes(c));
  cache.set(table, ok);
  return ok;
}
