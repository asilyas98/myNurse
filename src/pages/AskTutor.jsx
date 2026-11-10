import { Link } from "react-router-dom";
import { useRef, useState } from "react";
import { askTutor } from "../api.js";
import Markdown from "../components/Markdown.jsx";

const STARTERS = [
  "Explain the RAAS system like I'm studying for a test tomorrow",
  "How do I tell hypo- from hyperkalemia on an ECG?",
  "Walk me through ABG interpretation step by step",
  "Give me a memory trick for cranial nerves",
  "What's the difference between left and right heart failure?",
];

export default function AskTutor() {
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const endRef = useRef(null);

  async function send(text) {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setErr(""); setInput(""); setBusy(true);
    const next = [...history, { role: "user", content: q }];
    setHistory(next);
    try {
      const answer = await askTutor(next.length > 11 ? next.slice(-11) : next);
      setHistory([...next, { role: "assistant", content: answer }]);
    } catch (e) {
      setHistory(history); setInput(q); setErr(e.message);
    } finally {
      setBusy(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
    }
  }

  return (
    <section>
      <Link to="/" className="backlink">← Dashboard</Link>
      <h2>AI study tutor</h2>
      <p className="lede">Explain a concept, walk through a drug, or break down a practice question. For studying — not for decisions about real patients.</p>
      <div className="chips">{STARTERS.map((s) => <button key={s} className="chip" onClick={() => send(s)} disabled={busy}>{s}</button>)}</div>
      <div className="thread" aria-live="polite">
        {history.length === 0 && <div className="empty">Try a prompt above or type your own. Follow-ups keep the context.</div>}
        {history.map((m, i) => (
          <div key={i} className={"msg " + (m.role === "user" ? "me" : "ai")}>{m.role === "user" ? m.content : <Markdown text={m.content} />}</div>
        ))}
        {busy && <div className="msg ai"><p className="note">Thinking…</p></div>}
        <div ref={endRef} />
      </div>
      <div className="composer">
        <textarea rows={2} value={input} aria-label="Your question" placeholder="e.g. Why does fluid volume excess cause crackles?"
          onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <button className="btn" onClick={() => send()} disabled={busy}>Ask</button>
      </div>
      {err && <p className="err">{err}</p>}
    </section>
  );
}
