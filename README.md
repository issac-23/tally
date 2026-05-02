# Tally — Personal Finance Tracker

A warm, focused expense tracker that helps you understand not just where your money goes, but how long your money lasts.

**Currently in active development.**

---

## What it does

- **Runway tracker** — See how many months you can sustain your current spending rate before running out of money. Color-coded: green (6+ months), yellow (3–6), orange (1–3), red (under 1 month).
- **Spending breakdown** — Pie charts by category (food, rent, transport) and by merchant (Starbucks, Amazon, etc.)
- **Smart budget limit** — Enter your savings balance and monthly salary. Tally calculates a realistic monthly budget for you.
- **Daily / weekly / monthly summaries** — Know exactly what you've spent at any timeframe.
- **Manual expense entry** — Quick form: amount, category, merchant, date. Done in seconds.
- **Custom categories** — Comes with sensible presets. Add your own anytime.
- **Private by design** — Sign in with Google. Your data is locked to your account via Supabase Row Level Security. The code is open source; your numbers are not.

---

## Tech stack

| Layer | Tool |
|---|---|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Auth + Database | Supabase (Google OAuth + PostgreSQL) |
| Language | TypeScript |

---

## Running it locally

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/tally.git
cd tally
npm install
```

### 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **Authentication → Providers** and enable Google
3. Follow the [Google OAuth setup guide](https://supabase.com/docs/guides/auth/social-login/auth-google) to get your Client ID and Secret
4. Run the database migrations (SQL files in `/supabase/migrations/`) in the Supabase SQL editor

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in your values from the Supabase dashboard:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project structure

```
app/
  (auth)/login/        # Login page
  (dashboard)/
    dashboard/         # Main dashboard with charts + runway
    transactions/      # Transaction history
    settings/          # Profile, salary, savings
components/
  ui/                  # Reusable UI components
  charts/              # Pie chart components
  forms/               # Expense entry forms
lib/supabase/          # Supabase client + server helpers
types/                 # TypeScript interfaces
supabase/migrations/   # Database schema (run these first)
```

---

## Roadmap

- [x] Project setup + warm design system
- [ ] Google auth + Supabase integration
- [ ] Onboarding (savings + salary entry)
- [ ] Add expense form
- [ ] Runway indicator
- [ ] Dashboard + spending summaries
- [ ] Pie charts (category + merchant)
- [ ] Custom categories
- [ ] Polish + mobile responsiveness

---

Built by [Issac Ip](https://github.com/issac-ip)
