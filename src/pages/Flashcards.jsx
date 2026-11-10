import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabase.js";
import { generateCards } from "../api.js";

export default function Flashcards() {
  const [decks, setDecks] = useState(null);
  const [mode, setMode] = useState(null); // null | "blank" | "ai"
  const [f, setF] = useState({ title: "", subject: "", topic: "", notes: "", count: 15 });
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    supabase.from("decks").select("id,title,subject,created_at,cards(count)").order("created_at", { ascending: false })
      .then(({ data }) => setDecks(data || []));
  }, []);

  async function create() {
    setErr("");
    const title = f.title.trim() || f.topic.trim();
    if (!title) return setErr("Give the deck a title.");
    if (mode === "ai" && !f.topic.trim() && !f.notes.trim()) return setErr("Add a topic or paste your notes.");
    setBusy(mode === "ai" ? "Making your cards…" : "Creating…");
    try {
      let cards = [];
      if (mode === "ai") cards = await generateCards({ topic: f.topic.trim(), notes: f.notes.trim(), count: f.count });
      const { data: deck, error } = await supabase.from("decks").insert({ title: title.slice(0, 100), subject: f.subject.trim().slice(0, 60) }).select("id").single();
      if (error) throw new Error("The deck didn't save. Try again.");
      if (cards.length) {
        const { error: e2 } = await supabase.from("cards").insert(cards.map((c, i) => ({ deck_id: deck.id, front: c.front, back: c.back, position: i })));
        if (e2) throw new Error("The deck saved, but its cards didn't. Open it and try adding them again.");
      }
      nav(`/flashcards/${deck.id}`);
    } catch (e) { setErr(e.message); }
    finally { setBusy(""); }
  }

  return (
    <section>
      <div className="pagehead">
        <div><h2>Flashcards</h2><p className="lede">Make your own decks, or turn a topic or your class notes into cards in seconds.</p></div>
      </div>

      <div className="row" style={{ marginTop: 0 }}>
        <button className={"btn" + (mode === "blank" ? "" : " ghost")} onClick={() => setMode(mode === "blank" ? null : "blank")}>New blank deck</button>
        <button className={"btn" + (mode === "ai" ? "" : " ghost")} onClick={() => setMode(mode === "ai" ? null : "ai")}>Make cards from a topic or notes</button>
      </div>

      {mode && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="two">
            <div>
              <label htmlFor="d-title">Deck title</label>
              <input id="d-title" type="text" maxLength={100} value={f.title} placeholder={mode === "ai" ? "Defaults to the topic" : "e.g. Cardiac meds"} onChange={(e) => setF({ ...f, title: e.target.value })} />
            </div>
            <div>
              <label htmlFor="d-subj">Subject <span className="meta">(optional)</span></label>
              <input id="d-subj" type="text" maxLength={60} value={f.subject} placeholder="e.g. Pharmacology" onChange={(e) => setF({ ...f, subject: e.target.value })} />
            </div>
          </div>
          {mode === "ai" && (
            <>
              <label htmlFor="d-topic">Topic</label>
              <input id="d-topic" type="text" maxLength={200} value={f.topic} placeholder="e.g. antidotes and reversal agents" onChange={(e) => setF({ ...f, topic: e.target.value })} />
              <label htmlFor="d-notes">Or paste your notes <span className="meta">(optional)</span></label>
              <textarea id="d-notes" maxLength={6000} value={f.notes} placeholder="Lecture notes, a study guide section, a list of terms…" onChange={(e) => setF({ ...f, notes: e.target.value })} />
              <label htmlFor="d-count">How many cards</label>
              <select id="d-count" value={f.count} onChange={(e) => setF({ ...f, count: +e.target.value })} style={{ width: "auto" }}>
                {[10, 15, 20].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </>
          )}
          <div className="row">
            <button className="btn" onClick={create} disabled={!!busy}>{busy || (mode === "ai" ? "Make cards" : "Create deck")}</button>
          </div>
          {err && <p className="err">{err}</p>}
        </div>
      )}

      <h3 className="sectionhead">Your decks</h3>
      {decks === null ? <p className="note">Loading…</p> : decks.length === 0 ? (
        <div className="empty">No decks yet. Start with a blank deck, or make one from a topic you're studying this week.</div>
      ) : (
        <div className="tiles">
          {decks.map((d) => (
            <Link key={d.id} to={`/flashcards/${d.id}`} className="tile deck">
              <span className="tile-k">{d.subject || "Deck"}</span>
              <strong>{d.title}</strong>
              <span className="meta">{d.cards?.[0]?.count ?? 0} cards</span>
              <span className="tile-go">Open →</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
