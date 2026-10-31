# Asia Outlook Reader — demo deploy

One deploy gives you both demos:

- **Desktop**: `https://<your-project>.vercel.app/` — each share creates a short link (`/t/abc1234`) whose preview card *is* the tile. Paste it into LinkedIn, WhatsApp, Teams or Outlook and the tile appears automatically; clicks go to the J.P. Morgan article.
- **Phone**: open the same URL on an iPhone or Android. Share buttons use the device share sheet with the tile attached and the text filled in.

## Deploy (about 5 minutes)

1. Install the Vercel CLI: `npm i -g vercel` and sign in with `vercel login`.
2. In this folder run `vercel` and accept the defaults (framework: Other). Note the project name.
3. In the Vercel dashboard open the project → **Storage** → **Create** → **Blob**, and connect it to the project. This adds `BLOB_READ_WRITE_TOKEN` automatically.
4. Run `vercel --prod`. The reader is at the printed URL; the service is the same origin.

5. **Email with the tile inside** (optional, 3 more minutes): create a free account at resend.com, verify a sending domain (or use their test domain for a demo), and add two environment variables to the Vercel project: `RESEND_API_KEY` and `EMAIL_FROM` (for example `Asia Outlook Reader <share@yourdomain.com>`). Redeploy with `vercel --prod`. The Email buttons then show a To / Subject / Message form and send the email from the service with the tile embedded in the body and attached as a PNG. Without these variables the Email buttons fall back to opening the user's mail app with the text, and the tile is copied for pasting.

To point a reader hosted elsewhere at this service, open it with `?svc=https://<your-project>.vercel.app`.

## What happens on share

1. The page renders the tile to a PNG and POSTs it to `/api/upload`.
2. The service stores the PNG and a small JSON record in Vercel Blob and returns `/t/<id>`.
3. `/t/<id>` serves Open Graph tags (`og:image` = the tile) for crawlers and redirects people to the article.
4. LinkedIn opens with that link so the post card is the tile; WhatsApp receives the text with the link, which unfurls into the tile.

Links are public once created (that is what lets the platforms fetch the card). Add an expiry job or a signed id if you need links to lapse.

## Presenting

- Desktop: highlight a passage → Share as tile → wait for "Share link ready" → LinkedIn. The composer opens with the tile as the card. Repeat with WhatsApp Web: the message shows the tile preview before sending.
- Phone: same flow; tap WhatsApp or Instagram and the share sheet opens with the tile attached.
- Email: click Email colleagues, type an address, Send with tile. The email arrives with the tile in the body.
- Generate takeaways first to show the "Share your takeaways" row and the numbered takeaways tile.
