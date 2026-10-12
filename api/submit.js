import { Resend } from 'resend';
import { getSql } from './_db.js';

const clip = (v, n = 200) => String(v ?? '').trim().slice(0, n);
const bad = (res, error) => res.status(400).json({ error });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const b = req.body && typeof req.body === 'object' ? req.body : {};
  if (b.website) return res.status(200).json({ ok: true }); // honeypot: bots fill this, pretend success

  const d = {
    role: clip(b.role, 20), name: clip(b.name, 120), business: clip(b.business, 160),
    phone: clip(b.phone, 20), email: clip(b.email, 160).toLowerCase(), areas: clip(b.areas),
    trades: Array.isArray(b.trades) ? b.trades.slice(0, 10).map((t) => clip(t, 40)).join(', ') : '',
    years: clip(b.years, 3), team_size: clip(b.team_size, 20), license_no: clip(b.license_no, 60),
    project_type: clip(b.project_type, 40), active_projects: clip(b.active_projects, 20),
    find_method: clip(b.find_method, 60), referred_by: clip(b.referred_by, 120), notes: clip(b.notes, 1000),
  };
  const digits = d.phone.replace(/\D/g, '');
  if (!['contractor', 'developer'].includes(d.role) || !d.name || !d.business || !d.areas) return bad(res, 'Please fill in all required fields.');
  if (digits.length < 10 || digits.length > 13) return bad(res, 'Please enter a valid phone number.');
  if (!/^\S+@\S+\.\S+$/.test(d.email)) return bad(res, 'Please enter a valid email.');
  if (!d.trades) return bad(res, 'Please select at least one trade.');
  if (b.consent !== true) return bad(res, 'Please tick the consent box.');

  try {
    const sql = await getSql();
    await sql`INSERT INTO pilot_signups (role,name,business,phone,email,areas,trades,years,team_size,license_no,project_type,active_projects,find_method,referred_by,notes)
      VALUES (${d.role},${d.name},${d.business},${d.phone},${d.email},${d.areas},${d.trades},${d.years},${d.team_size},${d.license_no},${d.project_type},${d.active_projects},${d.find_method},${d.referred_by},${d.notes})`;
  } catch (e) {
    console.error('DB insert failed', e);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }

  // Email alert is best-effort: the signup is already saved, so a failure here never reaches the user.
  if (process.env.RESEND_API_KEY && process.env.NOTIFY_EMAIL) {
    try {
      const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: '(kalm) Pilot <onboarding@resend.dev>',
        to: process.env.NOTIFY_EMAIL,
        subject: `New pilot signup (${d.role}): ${d.business}`,
        text: Object.entries(d).map(([k, v]) => `${k}: ${v || '-'}`).join('\n'),
      });
      if (error) console.error('Resend error', error);
    } catch (e) {
      console.error('Email failed', e);
    }
  }
  return res.status(200).json({ ok: true });
}
