import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabase.js";
import { generateCards } from "../api.js";
import { shuffle } from "../lib/exams.js";

export default function Deck() {
  const { id } = useParams();
  const nav = useNavigate();
  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [studying, setStudying] = useState(null); // array of cards in study order
  const [draft, setDraft] = useState({ front: "", back: "" });
  const [editId, setEditId] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const [d, c] = await Promise.all([
      supabase.from("decks").select("*").eq("id", id).maybeSingle(),
      supabase.from("cards").select("*").eq("deck_id", id).order("position").order("created_at"),
    ]);
    if (!d.data) { setErr("That deck couldn't be found."); return; }
    setDeck(d.data); setCards(c.data || []);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function saveCard() {
    setErr("");
    const front = draft.front.trim(), back = draft.back.trim();
    if (!front || !back) return setErr("Fill in both sides of the card.");
    const res = editId
      ? await supabase.from("cards").update({ front, back }).eq("id", editId)
      : await supabase.from("cards").insert({ deck_id: id, front, back, position: cards.length });
    if (res.error) return setErr("That card didn't save. Try again.");
    setDraft({ front: "", back: "" }); setEditId(null); load();
  }

  async function removeCard(cid) {
    await supabase.from("cards").delete().eq("id", cid);
    load();
  }

  async function addMore() {
    setErr(""); setBusy("Adding cards…");
    try {
      const fresh = await generateCards({ topic: `${deck.title}${deck.subject ? ` (${deck.subject})` : ""}. Avoid repeating these fronts: ${cards.map((c) => c.front).slice(0, 40).join(" | ")}`, count: 10 });
      await supabase.from("cards").insert(fresh.map((c, i) => ({ deck_id: id, front: c.front, back: c.back, position: cards.length + i })));
      load();
    } catch (e) { setErr(e.message); }
    finally { setBusy(""); }
  }

  async function removeDeck() {
    if (!confirm(`Delete "${deck.title}" and all its cards?`)) return;
    await supabase.from("decks").delete().eq("id", id);
    nav("/flashcards");
  }

  async function markKnown(card, known) {
    setCards((cs) => cs.map((c) => (c.id === card.id ? { ...c, known } : c)));
    await supabase.from("cards").update({ known }).eq("id", card.id);
  }

  if (err && !deck) return <div className="card"><p className="err">{err}</p></div>;
  if (!deck) return <p className="note">Loading…</p>;

  if (studying) {
    return <Study deckTitle={deck.title} cards={studying} onMark={markKnown} onExit={() => { setStudying(null); load(); }} />;
  }

  const known = cards.filter((c) => c.known).length;
  return (
    <section>
      <Link to="/flashcards" className="backlink">← All decks</Link>
      <div className="pagehead">
        <div>
          <p className="qtopic">{deck.subject || "Flashcards"}</p>
          <h2>{deck.title}</h2>
          <p className="lede">{cards.length} cards · {known} marked as known</p>
        </div>
      </div>
      <div className="row" style={{ marginTop: 0 }}>
        <button className="btn" disabled={!cards.length} onClick={() => setStudying(shuffle(cards))}>Study all</button>
        <button className="btn ghost" disabled={!cards.length || known === cards.length} onClick={() => setStudying(shuffle(cards.filter((c) => !c.known)))}>Study unknown ({cards.length - known})</button>
        <button className="btn ghost" onClick={addMore} disabled={!!busy}>{busy || "Add 10 more with AI"}</button>
        <button className="btn ghost small" onClick={removeDeck}>Delete deck</button>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h3>{editId ? "Edit card" : "Add a card"}</h3>
        <div className="two">
          <div>
            <label htmlFor="c-front">Front</label>
            <textarea id="c-front" maxLength={500} value={draft.front} placeholder="Question or term" onChange={(e) => setDraft({ ...draft, front: e.target.value })} />
          </div>
          <div>
            <label htmlFor="c-back">Back</label>
            <textarea id="c-back" maxLength={1500} value={draft.back} placeholder="Answer or definition" onChange={(e) => setDraft({ ...draft, back: e.target.value })} />
          </div>
        </div>
        <div className="row">
          <button className="btn" onClick={saveCard}>{editId ? "Save card" : "Add card"}</button>
          {editId && <button className="btn ghost" onClick={() => { setEditId(null); setDraft({ front: "", back: "" }); }}>Cancel</button>}
        </div>
        {err && <p className="err">{err}</p>}
      </div>

      <div className="cardlist">
        {cards.map((c) => (
          <article key={c.id} className="card fc-row">
            <div><strong>{c.front}</strong><p>{c.back}</p></div>
            <div className="row tight">
              {c.known && <span className="status taken">Known</span>}
              <button className="btn ghost small" onClick={() => { setEditId(c.id); setDraft({ front: c.front, back: c.back }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button>
              <button className="btn ghost small" onClick={() => removeCard(c.id)}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Study({ deckTitle, cards, onMark, onExit }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [tally, setTally] = useState({ known: 0, learning: 0 });
  const done = i >= cards.length;
  const card = cards[i];

  useEffect(() => {
    const onKey = (e) => {
      if (done) return;
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); setFlipped((f) => !f); }
      if (flipped && e.key === "ArrowRight") answer(true);
      if (flipped && e.key === "ArrowLeft") answer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function answer(known) {
    onMark(card, known);
    setTally((t) => ({ ...t, [known ? "known" : "learning"]: t[known ? "known" : "learning"] + 1 }));
    setFlipped(false);
    setI(i + 1);
  }

  if (done) {
    return (
      <div className="card quizcard center">
        <h3>Deck complete</h3>
        <p className="lede">{tally.known} known · {tally.learning} still learning</p>
        <div className="row" style={{ justifyContent: "center" }}><button className="btn" onClick={onExit}>Back to deck</button></div>
      </div>
    );
  }

  return (
    <div className="study">
      <div className="quizhead"><strong>{deckTitle}</strong><span className="meta">{i + 1} / {cards.length}</span></div>
      <div className="progress" aria-hidden="true"><span style={{ width: `${(i / cards.length) * 100}%` }} /></div>
      <button className={"flip" + (flipped ? " is-flipped" : "")} onClick={() => setFlipped(!flipped)} aria-label={flipped ? "Show front" : "Show answer"}>
        <span className="face front"><span className="facek">Front</span>{card.front}</span>
        <span className="face back"><span className="facek">Back</span>{card.back}</span>
      </button>
      <p className="note center">Tap the card or press space to flip.{flipped ? " ← still learning · got it →" : ""}</p>
      <div className="row" style={{ justifyContent: "center" }}>
        {flipped ? (
          <>
            <button className="btn ghost" onClick={() => answer(false)}>Still learning</button>
            <button className="btn" onClick={() => answer(true)}>Got it</button>
          </>
        ) : <button className="btn" onClick={() => setFlipped(true)}>Show answer</button>}
        <button className="btn ghost small" onClick={onExit}>End session</button>
      </div>
    </div>
  );
}
