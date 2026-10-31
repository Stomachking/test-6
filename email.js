// POST /api/email  { to: ["a@b.com"], subject, body, png: "data:image/png;base64,...", link, name }
// Sends the email with the tile inline and attached, through Resend (https://resend.com).
// Env: RESEND_API_KEY, EMAIL_FROM (e.g. "Asia Outlook Reader <share@yourdomain.com>").

export const config = { api: { bodyParser: { sizeLimit: '4mb' } } };

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return res.status(503).json({ error: 'Email sending is not configured on this deployment (RESEND_API_KEY, EMAIL_FROM).' });

  const { to, subject = '', body = '', png = '', link = '', name = '' } = req.body || {};
  const recipients = (Array.isArray(to) ? to : String(to || '').split(/[,;\s]+/)).map((s) => s.trim()).filter(Boolean);
  if (!recipients.length || recipients.length > 5 || !recipients.every((r) => EMAIL.test(r))) return res.status(400).json({ error: 'Give 1 to 5 valid email addresses.' });
  if (typeof png !== 'string' || !png.startsWith('data:image/png;base64,')) return res.status(400).json({ error: 'png must be a data:image/png;base64 URI' });
  const base64 = png.slice(png.indexOf(',') + 1);
  if (base64.length > 4_000_000) return res.status(413).json({ error: 'tile too large' });

  const safeLink = /^https:\/\//.test(link) ? link : '';
  const paragraphs = String(body).slice(0, 4000).split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px">${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  const html = `<!doctype html><html><body style="margin:0;background:#ffffff;color:#000000;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5">
  <div style="max-width:600px;margin:0 auto;padding:28px 20px">
    ${paragraphs}
    <img src="cid:tile" alt="Takeaway tile" width="540" style="display:block;width:100%;max-width:540px;height:auto;margin:6px 0 16px;box-shadow:0 12px 30px rgba(0,0,0,.14)">
    ${safeLink ? `<p style="margin:0 0 14px"><a href="${esc(safeLink)}" style="color:#936846">Read the full outlook</a></p>` : ''}
    <p style="margin:18px 0 0;font-size:12px;color:#6b7280">Shared${name ? ' by ' + esc(name) : ''} from the Asia Outlook Reader · Source: J.P. Morgan Private Bank, Asia Strategy Focus. Not investment advice.</p>
  </div></body></html>`;

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: recipients,
      subject: String(subject).slice(0, 200) || 'A takeaway from the 2026 Asia Mid-Year Outlook',
      html,
      text: String(body).slice(0, 4000) + (safeLink ? `\n\n${safeLink}` : ''),
      attachments: [{ filename: 'asia-outlook-takeaway.png', content: base64, content_id: 'tile' }],
    }),
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    return res.status(502).json({ error: 'The email service refused the message.', detail: detail.slice(0, 300) });
  }
  const j = await r.json().catch(() => ({}));
  return res.status(200).json({ ok: true, id: j.id || null, sent: recipients.length });
}
