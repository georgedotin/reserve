# The Reserve × Kappo — Request an invite

A static page with one Vercel function. When someone submits the form, the request is emailed to the organiser through [Resend](https://resend.com). Nothing is stored; the email is the record.

## Files
- `public/` — the page (`index.html`, `styles.css`, `app.js`)
- `api/invites.js` — validates the form and sends the email
- `vercel.json` — security headers

No build step and no dependencies.

## Deploy
1. In Resend, create an API key. To send to anyone other than your own Resend login address, also verify a sending domain there.
2. Import this folder into Vercel (or run `vercel` in it). Leave the framework preset as "Other".
3. In Vercel → Project → Settings → Environment Variables, add:

   | Name | Value |
   | --- | --- |
   | `RESEND_API_KEY` | your Resend key |
   | `INVITE_TO_EMAIL` | where requests should arrive (comma-separate several) |
   | `INVITE_FROM_EMAIL` | optional, e.g. `The Reserve <invites@yourdomain.com>` on a verified domain |

4. Redeploy so the variables take effect, then submit the form once to confirm the email arrives.

Without `INVITE_FROM_EMAIL` the function uses Resend's test sender (`onboarding@resend.dev`), which only delivers to the address your Resend account was created with.

## Run locally

    vercel dev

Opening `public/index.html` directly shows the design but cannot send.

## Notes
- Name and phone are required. Instagram and LinkedIn links are optional and must be on their own domains.
- There is no rate limiting in the function. If the form gets abused, add a rate-limit rule in Vercel's Firewall for `/api/invites`.
- Before launch, update the date, venue and privacy wording in `public/index.html`.
