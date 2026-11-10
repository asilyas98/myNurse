# MyNurse — practice tests, custom quizzes, flashcards, and tutors for nurses

> **iPhone app:** see [README-IOS.md](README-IOS.md) for building with Codemagic and submitting to the App Store.

React + Vite + React Router, a Netlify Function that proxies Claude, and Supabase (auth, Postgres, Realtime).

## Features

- **Accounts** — email/password sign-up with confirm password, Student or Tutor role, target exam, password reset/change.
- **Practice tests (NurseHub format)** — pick an exam (NCLEX-RN, NCLEX-PN, TEAS 7, HESI A2) → subject → quiz.
  Select → **Check** (rationale shows either way) → **Next**, plus **Skip**, **Review later** flags, a **Quiz summary** grid,
  results by subject, full review, and "retake missed only". Supports Select-All-That-Apply. Starter questions work signed out;
  signed-in users get fresh AI-written questions for every subject.
- **Custom quizzes** — choose exam, subjects, length, difficulty, focus, and timing; generate questions with AI and/or write your own;
  save, edit, retake. Score history on *My quizzes*.
- **Flashcards** — create decks by hand or generate them from a topic or pasted notes; flip-card study mode with "Got it / Still learning".
- **Tutors (Preply-style)** — tutor profiles with headline, bio, exams, subjects, rate, languages, availability; search, filter by exam and
  price, sort by rating/price/lessons. Students request a lesson time; tutors accept/decline/complete; contact info is shared only after
  a tutor accepts; students leave star reviews after completed lessons. Payment is arranged directly between tutor and student.
- **AI study tutor** chat and a **Question of the Day** on the home page.

## Setup

1. **Supabase** — in the SQL editor, run `supabase/schema.sql`. It works on a fresh project *and* on top of the earlier Rounds schema
   (it migrates tutor listings and removes the old help-request board). Safe to re-run.
   Authentication → URL Configuration: set Site URL to your Netlify URL so password-reset links come back to the app.
2. **Env** — `.env` already has the Supabase URL and publishable key. Add `ANTHROPIC_API_KEY`.
3. **Run locally**
   ```
   npm install
   npm install -g netlify-cli
   netlify dev
   ```

## Deploy (Netlify)

Push to Git (drag-and-drop deploys skip functions). Environment variables:

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (public) |
| `ANTHROPIC_API_KEY` | Secret — server only |
| `CLAUDE_MODEL` | Optional, AI tutor chat model (default `claude-sonnet-5`) |
| `CLAUDE_FAST_MODEL` | Optional, quiz/flashcard generation model (default `claude-haiku-4-5-20251001`) |

`netlify.toml` already tells the secrets scanner the two public Supabase values are expected in the bundle.

**Function timeouts:** quizzes are generated in parallel batches of 4 questions on the fast model so each call stays under Netlify's
default 10-second limit. If you see timeouts, raise the function timeout in Netlify (Site configuration → Functions) or lower the batch
size in `src/api.js`.

## Structure

```
netlify/functions/claude.js    Auth-checked Claude proxy: tutor chat, quiz, and flashcard modes
supabase/schema.sql            Tables, RLS, booking/contact functions, tutor_stats view, realtime
src/lib/exams.js               Exam → subject structure + starter question bank (add questions here)
src/lib/auth.jsx               Session + profile context
src/components/QuizPlayer.jsx  NurseHub-style quiz engine
src/pages/                     Home, Practice, QuizRun, QuizBuilder, MyQuizzes, Flashcards, Deck,
                               Tutors, TutorProfile, Lessons, Account, AskTutor
```

## Security notes

- RLS on every table. Quizzes, attempts, decks, and cards are private to their owner.
- Booking status changes go through `set_booking_status()` (tutor accepts/declines/completes; either side cancels).
- Tutor contact info lives in `tutor_contacts` and is only returned by `get_tutor_contact()` to the tutor or a student with an accepted/completed booking.
- Reviews require a completed booking between that student and tutor (one review per lesson).
- Consider per-user rate limits on the Claude function before a wide launch.
