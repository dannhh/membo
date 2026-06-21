# Memory

A personal assistant web app for learning, finances, and calendar planning — all in one place, each with its own AI chat assistant and persistent per-user memory.

## Features

- **Learn** (`/dashboard`) — a notes workspace with note types (`concept`, `trip`, more pluggable via `src/lib/note-types/`). Each note has an AI chat assistant that reads/writes the note's content and metadata via tool use, so study sessions, quizzes, and generated materials persist across visits. Supports PDF import, writing rubrics with AI-graded submissions, and folder organization.
- **Finance** (`/finance`) — accounts (cash, bank, savings, credit, investment, debt), transactions, recurring installments, and monthly budgets, with an AI chat assistant that can query and update your finances conversationally.
- **Calendar** (`/calendar`) — events, tasks, and study sessions, with Google Calendar sync, AI-assisted focus-session scheduling, and a chat assistant for natural-language event management.

## Stack

- **Next.js 16** (App Router, TypeScript) — see `node_modules/next/dist/docs/` for this version's API, it differs from older Next.js
- **Clerk** — auth
- **Neon** — serverless Postgres
- **Drizzle ORM** — DB schema + queries
- **Google Gemini API** (`@google/generative-ai`) — AI chat with tool-use for memory persistence
- **Tailwind CSS** + **Radix UI** — styling/components
- **Vercel** — deployment

## Setup

### 1. Clone and install

```bash
git clone <this-repo>
cd membo
npm install
```

### 2. Configure environment variables

Create `.env.local` with:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | [Clerk dashboard](https://dashboard.clerk.com) → API Keys |
| `CLERK_SECRET_KEY` | Same |
| `DATABASE_URL` | [Neon dashboard](https://neon.tech) → Connection string (pooled) |
| `GOOGLE_AI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) |

### 3. Set up the database

```bash
npm run db:push
```

This runs `drizzle-kit push` to create the tables in Neon. Use `npm run db:studio` to browse the data.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push this repo to GitHub
2. Import it at [vercel.com/new](https://vercel.com/new)
3. Add the environment variables above in the Vercel project settings
4. Deploy

## How It Works

### Learn / Notes

Notes are typed (`noteType`, e.g. `concept`, `trip`) and each type defines its own chat modes and system prompts in `src/lib/note-types/<type>/`. The chat route (`src/app/api/chat/route.ts`) builds a system prompt from the note's current content + metadata, then lets Gemini use tools to save updates back to Postgres:

- `notes` — note content and folder placement
- `note_metadata` — per-note scores, progress, activity logs
- `chat_history` — persisted conversation per note/mode/sub-mode
- `writing_rubrics` / `writing_submissions` — custom grading rubrics and AI-graded essay submissions

### Finance

`finance_accounts`, `finance_transactions`, `finance_installments`, and `finance_budgets` track money across accounts. The finance chat assistant (`src/app/api/finance/chat/route.ts`) can read and mutate these via tool use (e.g. "log a $40 grocery expense").

### Calendar

`calendar_events` stores events/tasks/study sessions, optionally synced to Google Calendar (`googleEventId`). The calendar chat assistant and focus-suggestion endpoints help schedule and reschedule study/focus time around existing events.
