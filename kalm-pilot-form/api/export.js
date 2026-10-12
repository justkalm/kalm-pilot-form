// GET /api/export?key=EXPORT_KEY -> downloads all signups as CSV.
import crypto from 'node:crypto';
import { getSql } from './_db.js';

const same = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const cell = (v) => {
  let s = v instanceof Date ? v.toISOString() : String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // stops spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};

export default async function handler(req, res) {
  const key = String(req.query.key || '');
  if (!process.env.EXPORT_KEY || !same(key, process.env.EXPORT_KEY)) return res.status(401).send('Unauthorized');
  const sql = await getSql();
  const rows = await sql`SELECT * FROM pilot_signups ORDER BY created_at DESC`;
  const cols = rows.length ? Object.keys(rows[0]) : ['id'];
  const csv = [cols.map(cell).join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="pilot-signups.csv"');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(csv);
}
