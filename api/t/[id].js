// GET /t/:id  — the share page. Crawlers (LinkedIn, WhatsApp, Teams, iMessage, Outlook) read the Open Graph
// tags and render the tile as the preview card; people are sent on to the article.
import { list } from '@vercel/blob';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export default async function handler(req, res) {
  const id = String(req.query.id || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
  if (!id) return res.status(404).send('Not found');

  const { blobs } = await list({ prefix: `tiles/${id}.json`, limit: 1 });
  if (!blobs.length) return res.status(404).send('This share link has expired.');
  const meta = await (await fetch(blobs[0].url)).json();

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const self = `https://${host}/t/${id}`;
  const description = meta.text || 'A takeaway from the 2026 Asia Mid-Year Outlook.';
  const title = meta.label ? `${meta.label.charAt(0) + meta.label.slice(1).toLowerCase()} · ${meta.title}` : meta.title;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=86400');
  return res.status(200).send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(self)}">
<meta property="og:image" content="${esc(meta.image)}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1080">
<meta property="og:image:height" content="1080">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(meta.image)}">
<style>
  body{margin:0;background:#fff;color:#000;font-family:Amplitude,Archivo,"Helvetica Neue",Arial,sans-serif;display:flex;flex-direction:column;align-items:center;gap:20px;padding:40px 16px}
  img{width:min(540px,100%);height:auto;box-shadow:0 16px 40px rgba(0,0,0,.18)}
  a.btn{display:inline-block;background:#000;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600}
  p{max-width:60ch;text-align:center;color:#374151;line-height:1.5;margin:0}
  small{color:#6b7280}
</style>
</head>
<body>
<img src="${esc(meta.image)}" alt="${esc(description)}">
<p>${esc(description)}</p>
<a class="btn" href="${esc(meta.article)}">Read the full outlook</a>
<small>Source: J.P. Morgan Private Bank, Asia Strategy Focus</small>
<script>
  // Crawlers don't run this; people get sent straight to the article.
  if (!/bot|crawl|spider|preview|facebookexternalhit|whatsapp|linkedin|slack|telegram|twitter/i.test(navigator.userAgent)) {
    setTimeout(function(){ location.replace(${JSON.stringify(meta.article)}); }, 400);
  }
</script>
</body>
</html>`);
}
