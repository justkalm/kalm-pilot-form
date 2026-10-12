// Shared DB helper. Creates the table on first use, so no migration step is needed.
import { neon } from '@neondatabase/serverless';

let ready = false;
export async function getSql() {
  const sql = neon(process.env.DATABASE_URL);
  if (!ready) {
    await sql`CREATE TABLE IF NOT EXISTS pilot_signups (
      id SERIAL PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      role TEXT NOT NULL, name TEXT NOT NULL, business TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL,
      areas TEXT, trades TEXT, years TEXT, team_size TEXT, license_no TEXT,
      project_type TEXT, active_projects TEXT, find_method TEXT, referred_by TEXT, notes TEXT)`;
    ready = true;
  }
  return sql;
}
