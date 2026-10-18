# Kanyaka Desk

Staff portal for Kanyaka Corporation: enquiries, customer emails, quotations, customers and stock.
It is a separate website on the **same PostgreSQL database** as the public site ([kanyaka-marketing](https://github.com/corporationkanyaka-netizen/kanyaka-marketing)).

## What it does

| Area | What staff can do |
|---|---|
| **Dashboard** | Enquiries waiting for a reply (red after 24 h), work in progress, value quoted and won this month, low stock, recent activity, website chats |
| **Enquiries** | Inbox with tabs (Needs reply / In progress / Won / Lost / Spam) and search. Each enquiry has one conversation: website details, calls, WhatsApp notes, emails sent and **customer replies**. Log phone, WhatsApp and walk-in enquiries too |
| **Email** | Write to the customer from the enquiry. It goes from the company Gmail with the KC-ENQ reference in the subject; the customer's reply is read back from Gmail (IMAP) and filed on the same enquiry automatically |
| **Quotations** | Build a priced quotation (rates, GST per line, freight, terms), email it in one click, print / save as PDF on A4. Accepting it marks the enquiry **Won** |
| **Customers** | One record per company (matched by phone), with GSTIN, notes, every enquiry, quotation, dispatch and email |
| **Stock** | Stock on hand per warehouse (Pashamylaram, Kanukunta) in bags / MT. Stock in, Stock out, Transfer, Return, Adjustment, Opening stock. Can't dispatch more than is in the warehouse. Low-stock email to admins. Excel (CSV) export for the accountant / Tally |
| **Settings** (admins) | Products: bag weight, GST, HSN, reorder level. Users: add staff, Admin / Staff role, which alert emails they get, switch off |

## Sign-in (password + emailed code)

1. **Email + password.** 5 wrong passwords in a row lock the account for 15 minutes.
2. **A 6-digit code** is emailed to the user (valid 10 minutes, 5 tries, only works in the same browser).

Only active users in the `users` table can sign in — the same table that decides who gets the website's alert emails.
**Passwords:** new users are emailed a "set your password" link when an admin adds them (Settings → Users). Anyone can use
**Set or forgot password?** on the sign-in page, and admins can resend the link from the Users page. Links work once and expire in 60 minutes;
setting a password signs that user out on every other device. Passwords are stored as scrypt hashes; codes and links as SHA-256 hashes.

## How it fits with the website

```
kanyaka-marketing (public site)          kanyaka-desk (this repo)
  forms, chat → enquiries, customers  ─┐
                                       ├─ same PostgreSQL database
  owns prisma/migrations              ─┘   prisma/schema.prisma is a COPY (generate only)
```

- **Schema changes are made in the website repo**: edit `prisma/schema.prisma` there, run its migration (`npm run db:migrate`, then `npm run db:deploy:prod`), then here run `npm run schema:sync` and commit the copied schema.
- Stock is a ledger (`stock_movements`); stock on hand is the sum. Entries are never edited — corrections are Adjustments.
- Quote maths is identical to the website's (integer paise, half-up per line).

## Local setup

```bash
npm install
cp .env.example .env.local   # same DATABASE_URL as the website's .env.development
npm run dev                  # http://localhost:3002
```

## Deploying on Vercel

1. Import this repo as a new Vercel project (framework: Next.js).
2. Environment variables:
   - `DATABASE_URL` — the **production** database URL (same as the website)
   - `SMTP_USER`, `SMTP_PASS` — the company Gmail + app password (same as the website). IMAP must be enabled in Gmail settings for replies to come back.
   - `DESK_URL` — this site's address, e.g. `https://kanyaka-admin.vercel.app` (sign-in links point here)
   - `SITE_URL` — the public website address (logo in emails)
3. Deploy. Make sure the website's migrations have been deployed to production first.
