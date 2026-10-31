// POST /api/upload  { png: "data:image/png;base64,...", text, title, label, article }
// Stores the tile and returns a short link whose preview card is the tile.
import { put } from '@vercel/blob';
import { randomBytes } from 'node:crypto';

export const config = { api: { bodyParser: { sizeLimit: '4mb' } } };

const ALLOWED_ARTICLE = /^https:\/\/privatebank\.jpmorgan\.com\//;
const DEFAULT_ARTICLE = 'https://privatebank.jpmorgan.com/apac/en/insights/markets-and-investing/asf/2026-asia-mid-year-outlook';

function cors(req, res) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { png, text = '', title = '', label = '', article = '' } = req.body || {};
  if (typeof png !== 'string' || !png.startsWith('data:image/png;base64,')) {
    return res.status(400).json({ error: 'png must be a data:image/png;base64 URI' });
  }
  const buf = Buffer.from(png.slice(png.indexOf(',') + 1), 'base64');
  if (buf.length < 1000 || buf.length > 3_000_000) return res.status(413).json({ error: 'tile must be between 1 KB and 3 MB' });

  const id = randomBytes(5).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 7) || Date.now().toString(36);
  const image = await put(`tiles/${id}.png`, buf, { access: 'public', contentType: 'image/png', addRandomSuffix: false });

  const meta = {
    id,
    title: String(title).slice(0, 160),
    label: String(label).slice(0, 40),
    text: String(text).replace(/\s+/g, ' ').trim().slice(0, 600),
    article: ALLOWED_ARTICLE.test(article) ? article : DEFAULT_ARTICLE,
    image: image.url,
    createdAt: new Date().toISOString(),
  };
  await put(`tiles/${id}.json`, JSON.stringify(meta), { access: 'public', contentType: 'application/json', addRandomSuffix: false });

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return res.status(200).json({ id, url: `https://${host}/t/${id}`, image: image.url });
}
