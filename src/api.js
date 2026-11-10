import { supabase } from "./supabase.js";
import { API_BASE, isNative } from "./lib/platform.js";

async function call(body) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error("Sign in to use this.");
  if (isNative && !API_BASE) throw new Error("This build is missing NEXT_PUBLIC_SITE_URL, so AI features can't reach the server.");
  let res;
  try {
    res = await fetch(`${API_BASE}/.netlify/functions/claude`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Couldn't reach MyNurse. Check your connection and try again.");
  }
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || "Something went wrong. Try again.");
  return out;
}

export async function askTutor(messages) {
  return (await call({ mode: "tutor", messages })).text;
}

const BATCH = 4;
const ANGLES = [
  "lean toward assessment and expected findings",
  "lean toward priority and first-action decisions",
  "lean toward medications, labs, and calculations where relevant",
  "lean toward client teaching and safety",
  "lean toward less common but testable content",
];

/** Generate `count` questions in parallel batches so each request stays fast. */
export async function generateQuestions({ exam, subjects, count, difficulty, focus, avoid = [], onProgress }) {
  const batches = Math.ceil(count / BATCH);
  let done = 0;
  const results = await Promise.allSettled(
    Array.from({ length: batches }, (_, i) =>
      call({
        mode: "quiz",
        exam,
        subjects,
        difficulty,
        focus,
        avoid: avoid.slice(0, 30),
        count: Math.min(BATCH, count - i * BATCH),
        batchNote: batches > 1 ? `batch ${i + 1} of ${batches}: ${ANGLES[i % ANGLES.length]}` : "",
      }).then((r) => { done++; onProgress?.(done, batches); return r.questions; })
    )
  );
  const seen = new Set(avoid.map((s) => s.toLowerCase()));
  const questions = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const q of r.value) {
      const key = q.stem.toLowerCase();
      if (!seen.has(key)) { seen.add(key); questions.push(q); }
    }
  }
  if (!questions.length) {
    const firstErr = results.find((r) => r.status === "rejected");
    throw new Error(firstErr?.reason?.message || "No questions came back. Try again.");
  }
  return questions;
}

export async function generateCards({ topic, notes, count }) {
  return (await call({ mode: "flashcards", topic, notes, count })).cards;
}
