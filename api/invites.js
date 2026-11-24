// POST /api/invites
// Validates the invite form and emails the request to the organiser via Resend.
// Environment variables (set in Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY     required
//   INVITE_TO_EMAIL    required: where requests are sent (comma-separate several)
//   INVITE_FROM_EMAIL  optional: defaults to Resend's test sender

const LIMITS = { name: 120, phone: 25, instagram: 300, linkedin: 300 };
const SOCIAL = { instagram: 'instagram.com', linkedin: 'linkedin.com' };
const CHECK_FIELDS = 'Please check your name, phone number and social profile links.';
const NOT_SENT = 'Your request could not be sent. Please try again shortly.';

function validate(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  const v = {};
  for (const [key, max] of Object.entries(LIMITS)) {
    const raw = d[key] ?? '';
    if (typeof raw !== 'string' || raw.length > max) return null;
    v[key] = raw.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  }
  if (!v.name) return null;
  const digits = v.phone.replace(/\D/g, '').length;
  if (!/^\+?[\d\s().-]+$/.test(v.phone) || digits < 7 || digits > 15) return null;
  for (const [key, domain] of Object.entries(SOCIAL)) {
    if (!v[key]) continue;
    let url;
    try { url = new URL(v[key]); } catch { return null; }
    const host = url.hostname.toLowerCase();
    const onDomain = host === domain || host.endsWith('.' + domain);
    if (!['https:', 'http:'].includes(url.protocol) || !onDomain || url.username || url.password) return null;
  }
  const helicopter = d.helicopter ?? false;
  if (typeof helicopter !== 'boolean') return null;
  v.helicopter = helicopter;
  return v;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  const origin = req.headers.origin;
  if (origin) {
    let originHost = '';
    try { originHost = new URL(origin).host; } catch { /* rejected below */ }
    if (originHost !== req.headers.host) return res.status(403).json({ error: 'Invalid origin.' });
  }
  if ((req.headers['content-type'] || '').split(';')[0].trim() !== 'application/json') {
    return res.status(415).json({ error: 'Expected JSON.' });
  }

  let body;
  try { body = req.body; } catch { body = null; } // Vercel throws here on malformed JSON
  const v = validate(body);
  if (!v) return res.status(400).json({ error: CHECK_FIELDS });
  if (body.company_website) return res.status(400).json({ error: 'Unable to accept this request.' }); // honeypot

  const apiKey = process.env.RESEND_API_KEY;
  const to = (process.env.INVITE_TO_EMAIL || '').split(',').map((s) => s.trim()).filter(Boolean);
  const from = process.env.INVITE_FROM_EMAIL || 'The Reserve × Kappo <onboarding@resend.dev>';
  if (!apiKey || !to.length) {
    console.error('Missing RESEND_API_KEY or INVITE_TO_EMAIL.');
    return res.status(500).json({ error: NOT_SENT });
  }

  const text = [
    'New invite request',
    '',
    `Name:       ${v.name}`,
    `Phone:      ${v.phone}`,
    `Instagram:  ${v.instagram || '-'}`,
    `LinkedIn:   ${v.linkedin || '-'}`,
    `Helicopter: ${v.helicopter ? 'Interested' : 'No'}`,
    '',
    `Received:   ${new Date().toISOString()}`,
  ].join('\n');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject: `Invite request: ${v.name}`, text }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.error('Resend rejected the email:', response.status, await response.text());
      return res.status(502).json({ error: NOT_SENT });
    }
  } catch (error) {
    console.error('Could not reach Resend:', error.name);
    return res.status(502).json({ error: NOT_SENT });
  }
  return res.status(200).json({ ok: true });
};
