// Netlify Function: authenticated proxy to the Anthropic Messages API.
// Modes: "tutor" (chat), "quiz" (generate up to 5 questions), "flashcards" (generate up to 20 cards).
// The API key and all prompts live server-side only.

import { corsHeaders } from "../shared/cors.js";

const env = process.env;
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
const CHAT_MODEL = env.CLAUDE_MODEL || "claude-sonnet-5";
// Generation uses a fast model so batches finish inside Netlify's function time limit.
const FAST_MODEL = env.CLAUDE_FAST_MODEL || "claude-haiku-4-5-20251001";

const EXAMS = ["NCLEX-RN", "NCLEX-PN", "TEAS 7", "HESI A2"];
const DIFFICULTY = ["easier", "mixed", "harder"];

const TUTOR_SYSTEM = `You are a patient, accurate nursing tutor helping nursing students and nurses study (NCLEX-RN/PN, TEAS 7, HESI A2).
Explain clearly with the reasoning behind it (pathophysiology, the "why"), use plain language, and give a memory aid when useful.
Keep answers focused: short paragraphs, "- " bullets only where they help, under about 250 words unless asked for more. Use **bold** sparingly for key terms.
This is for study only. If someone asks for help with a real patient's care decisions, remind them to follow their facility's protocols and consult their charge nurse, provider, or pharmacist.
Never invent drug doses; if a number matters, say to verify it against a current drug reference.`;

const QUIZ_SYSTEM = `You write original exam-prep practice questions for nursing students. Accuracy matters more than anything: every question must reflect current, standard nursing and science content, with exactly one defensible keyed answer set.
Respond with ONLY a JSON object, no markdown fences, no commentary.`;

const CARDS_SYSTEM = `You make concise, accurate study flashcards for nursing students. Front: a short question or term. Back: a clear answer in 1-3 sentences, with a memory aid only when it truly helps.
Respond with ONLY a JSON object, no markdown fences, no commentary.`;

let CORS = {};
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS } });

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function parseJson(text) {
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean.slice(clean.indexOf("{"), clean.lastIndexOf("}") + 1));
}

async function claude({ model, system, messages, max_tokens }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, system, messages, max_tokens }),
  });
  if (res.status === 429) throw Object.assign(new Error("Too many requests right now. Wait a minute and try again."), { status: 429 });
  if (!res.ok) {
    console.error("Anthropic error", res.status, await res.text());
    throw Object.assign(new Error("The AI couldn't finish that. Try again."), { status: 502 });
  }
  const data = await res.json();
  return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
}

function normalizeQuestion(q, fallbackSubject) {
  if (!q || typeof q.stem !== "string" || !Array.isArray(q.options)) return null;
  const options = q.options.map((o) => String(o).trim()).filter(Boolean);
  let answers = Array.isArray(q.answers) ? q.answers : [q.answer];
  answers = [...new Set(answers.map(Number))].filter((i) => Number.isInteger(i) && i >= 0 && i < options.length).sort();
  const type = q.type === "sata" || answers.length > 1 ? "sata" : "single";
  if (type === "single" && (options.length !== 4 || answers.length !== 1)) return null;
  if (type === "sata" && (options.length < 5 || options.length > 6 || answers.length < 2 || answers.length >= options.length)) return null;
  return {
    type,
    stem: q.stem.trim(),
    options,
    answers,
    rationale: String(q.rationale || "").trim(),
    subject: str(q.subject, 60) || fallbackSubject,
  };
}

async function handleQuiz(body) {
  const exam = EXAMS.includes(body.exam) ? body.exam : "NCLEX-RN";
  const subjects = (Array.isArray(body.subjects) ? body.subjects : []).map((s) => str(s, 60)).filter(Boolean).slice(0, 10);
  const count = Math.min(5, Math.max(1, parseInt(body.count, 10) || 3));
  const difficulty = DIFFICULTY.includes(body.difficulty) ? body.difficulty : "mixed";
  const focus = str(body.focus, 300);
  const avoid = (Array.isArray(body.avoid) ? body.avoid : []).map((s) => str(s, 160)).filter(Boolean).slice(0, 40);
  const batchNote = str(body.batchNote, 120);
  const nclex = exam.startsWith("NCLEX");

  const prompt = `Exam: ${exam}
Subject area(s): ${subjects.length ? subjects.join("; ") : "any subject on this exam"}
Number of questions: ${count}
Difficulty: ${difficulty}
${focus ? `Student's focus request: ${focus}\n` : ""}${batchNote ? `Variety: ${batchNote}\n` : ""}${avoid.length ? `Do NOT repeat or closely paraphrase these existing questions:\n- ${avoid.join("\n- ")}\n` : ""}
Rules:
- Match the style and level of the real ${exam}.${nclex ? " Prefer application/analysis items (prioritization, first action, expected finding, client teaching). About 1 in 4 questions may be Select All That Apply." : " Use single-best-answer items only."}
- Single-answer items: exactly 4 options, "type": "single", "answers": [one index].
- SATA items: 5 or 6 options, "type": "sata", "answers": [2 or more indexes], stem ends with "Select all that apply."
- Spread questions across the listed subject areas and set "subject" to the area each one belongs to (use the exact name given).
- Rationale: 2-4 sentences explaining why the keyed answer(s) are right and why the distractors are wrong.

Return: {"questions":[{"type":"single|sata","subject":"...","stem":"...","options":["..."],"answers":[0],"rationale":"..."}]}`;

  const text = await claude({ model: FAST_MODEL, system: QUIZ_SYSTEM, messages: [{ role: "user", content: prompt }], max_tokens: 2500 });
  const parsed = parseJson(text);
  const questions = (parsed.questions || [])
    .map((q) => normalizeQuestion(q, subjects[0] || exam))
    .filter(Boolean)
    .map((q) => ({ ...q, exam }));
  if (!questions.length) throw Object.assign(new Error("The questions didn't come back complete. Try again."), { status: 502 });
  return { questions };
}

async function handleFlashcards(body) {
  const topic = str(body.topic, 200);
  const notes = str(body.notes, 6000);
  const count = Math.min(20, Math.max(3, parseInt(body.count, 10) || 10));
  if (!topic && !notes) throw Object.assign(new Error("Add a topic or paste some notes."), { status: 400 });
  const prompt = `Make ${count} flashcards.
${topic ? `Topic: ${topic}\n` : ""}${notes ? `Base them on these notes (stay faithful to them; fix only clear factual errors):\n"""\n${notes}\n"""\n` : ""}
Return: {"cards":[{"front":"...","back":"..."}]}`;
  const text = await claude({ model: FAST_MODEL, system: CARDS_SYSTEM, messages: [{ role: "user", content: prompt }], max_tokens: 3000 });
  const parsed = parseJson(text);
  const cards = (parsed.cards || [])
    .map((c) => ({ front: str(c?.front, 500), back: str(c?.back, 1500) }))
    .filter((c) => c.front && c.back);
  if (!cards.length) throw Object.assign(new Error("The cards didn't come back complete. Try again."), { status: 502 });
  return { cards };
}

async function handleTutor(body) {
  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 21)
    throw Object.assign(new Error("Invalid messages."), { status: 400 });
  for (const m of messages) {
    if (!m || !["user", "assistant"].includes(m.role) || typeof m.content !== "string" || m.content.length > 6000)
      throw Object.assign(new Error("Invalid message."), { status: 400 });
  }
  if (messages[0].role !== "user" || messages[messages.length - 1].role !== "user")
    throw Object.assign(new Error("Conversation must start and end with the user."), { status: 400 });
  const text = await claude({ model: CHAT_MODEL, system: TUTOR_SYSTEM, messages, max_tokens: 900 });
  return { text };
}

export default async (req) => {
  CORS = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!env.ANTHROPIC_API_KEY) return json({ error: "Server is missing ANTHROPIC_API_KEY." }, 500);

  // Only signed-in users of this app can spend API credits.
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Sign in to use this." }, 401);
  const who = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_KEY },
  });
  if (!who.ok) return json({ error: "Your session expired. Sign in again." }, 401);

  let body;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON." }, 400); }

  try {
    if (body?.mode === "tutor") return json(await handleTutor(body));
    if (body?.mode === "quiz") return json(await handleQuiz(body));
    if (body?.mode === "flashcards") return json(await handleFlashcards(body));
    return json({ error: "Unknown mode." }, 400);
  } catch (e) {
    if (e instanceof SyntaxError) return json({ error: "The AI response was incomplete. Try again." }, 502);
    return json({ error: e.message || "Something went wrong." }, e.status || 500);
  }
};
