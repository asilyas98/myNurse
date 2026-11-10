import { Link } from "react-router-dom";
import { EXAMS, EXAM_NAMES } from "../lib/exams.js";
import QOTD from "../components/QOTD.jsx";
import { isNative } from "../lib/platform.js";

const FEATURES = [
  {
    k: "Practice tests",
    title: "Questions that feel like test day",
    body: "Pick your exam, then a subject. Check each answer to see the full rationale, flag the ones you want to revisit, and jump around with the quiz summary — the same flow you'll see on NCLEX, TEAS, and HESI prep.",
    demo: "quiz",
  },
  {
    k: "Custom quizzes",
    title: "Build the quiz you actually need",
    body: "Choose the subjects, length, difficulty, and timing. Fresh questions are written for you, or add your own from class. Save it and retake it until it sticks.",
    demo: "builder",
  },
  {
    k: "Your dashboard",
    title: "See exactly where you're weak",
    body: "Every quiz feeds your dashboard: score trend, study streak, and a breakdown by subject so you know what to drill next — one tap starts a quiz on your weakest area.",
    demo: "dash",
  },
  {
    k: "Flashcards",
    title: "Make your own flashcards in seconds",
    body: "Type cards yourself, or paste your lecture notes and get a deck back. Flip through them, mark what you know, and study only what you don't.",
    demo: "cards",
  },
  {
    k: "Tutors",
    title: "Get help from nurses who've been there",
    body: "Browse tutors by exam, subject, and price. Read reviews from other students, request a lesson time, and get connected once your tutor confirms.",
    demo: "tutor",
  },
];

function Demo({ kind }) {
  if (kind === "quiz") return (
    <div className="demo">
      <p className="qtopic">Question 4 of 10 · Physiological Adaptation</p>
      <p className="demo-stem">A client's potassium is 6.8 mEq/L. What should the nurse do first?</p>
      <div className="demo-opt">A. Encourage potassium-rich foods</div>
      <div className="demo-opt right">B. Place on continuous cardiac monitoring</div>
      <div className="demo-opt">C. Recheck the level in 24 hours</div>
      <div className="demo-rat"><strong>Correct.</strong> Severe hyperkalemia can cause dysrhythmias…</div>
    </div>
  );
  if (kind === "builder") return (
    <div className="demo">
      <p className="qtopic">New quiz</p>
      <div className="demo-chips"><span className="on">Pharmacology</span><span className="on">Safety</span><span>Psychosocial</span><span>Basic Care</span></div>
      <div className="demo-row"><span>Questions</span><strong>20</strong></div>
      <div className="demo-row"><span>Difficulty</span><strong>Harder</strong></div>
      <div className="demo-row"><span>Timed</span><strong>On</strong></div>
      <div className="demo-btn">Write questions</div>
    </div>
  );
  if (kind === "dash") return (
    <div className="demo">
      <div className="demo-stats"><div><strong>78%</strong><span>avg score</span></div><div><strong>6</strong><span>day streak</span></div><div><strong>214</strong><span>answered</span></div></div>
      {[["Pharmacology", 54], ["Safety & Infection", 71], ["Management of Care", 83], ["Physiological Adapt.", 90]].map(([s, v]) => (
        <div className="demo-bar" key={s}><span>{s}</span><i><b style={{ width: v + "%" }} className={v < 60 ? "low" : v < 75 ? "mid" : ""} /></i><em>{v}%</em></div>
      ))}
    </div>
  );
  if (kind === "cards") return (
    <div className="demo demo-fc">
      <div className="fc-back" />
      <div className="fc-front"><span className="facek">Front</span>Antidote for warfarin?</div>
      <div className="demo-fc-btns"><span>Still learning</span><span className="on">Got it</span></div>
    </div>
  );
  return (
    <div className="demo">
      <div className="demo-tutor">
        <span className="avatar" style={{ background: "#237A5A", width: 46, height: 46 }}>M</span>
        <div><strong>Maria R.</strong><div className="meta">ICU RN · 9 yrs · NCLEX-RN</div><div className="stars">★★★★★ <span className="meta">4.9 · 38</span></div></div>
        <div className="demo-price"><strong>$35</strong><span className="meta">/hr</span></div>
      </div>
      <div className="demo-chips"><span>Pharmacology</span><span>Prioritization</span><span>ECGs</span></div>
      <div className="demo-btn">Book a lesson</div>
    </div>
  );
}

function AppWelcome() {
  return (
    <div className="appwelcome">
      <div className="aw-mark" aria-hidden="true">
        <svg viewBox="0 0 26 26"><rect x="1" y="1" width="24" height="24" rx="7" fill="#17223B" /><path d="M4 14h5l2-5 3 10 2-5h6" fill="none" stroke="#E5484D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <h1>Study between shifts.</h1>
      <p className="l-sub">Practice tests with full rationales, custom quizzes, flashcards, and real nurse tutors for NCLEX, TEAS 7, and HESI A2.</p>
      <div className="aw-actions">
        <Link to="/signin?new=1" className="btn big">Create a free account</Link>
        <Link to="/signin" className="btn ghost big">Log in</Link>
        <Link to="/practice" className="linkbtn">Try free practice questions first</Link>
      </div>
      <p className="tryhint">Question of the day</p>
      <QOTD exam="NCLEX-RN" compact />
    </div>
  );
}

export default function Landing() {
  if (isNative) return <AppWelcome />;
  return (
    <div className="landing">
      <section className="l-hero">
        <div className="l-hero-copy">
          <p className="eyebrow">NCLEX-RN · NCLEX-PN · TEAS 7 · HESI A2</p>
          <h1>Study between shifts. Pass with confidence.</h1>
          <p className="l-sub">Practice tests with full rationales, quizzes built around your weak spots, flashcards from your own notes, and real nurses who tutor — all in one place.</p>
          <div className="row">
            <Link to="/signin?new=1" className="btn big">Create a free account</Link>
            <Link to="/practice" className="btn ghost big">Try free questions</Link>
          </div>
          <p className="meta">Free to start. No credit card.</p>
          <svg className="trace" viewBox="0 0 880 84" preserveAspectRatio="none" aria-hidden="true">
            <path className="base" d="M0 52H880" />
            <path d="M0 52H120l12-8 12 8h30l10 4 14-46 16 64 10-18h40l16-12 18 12h120l12-8 12 8h30l10 4 14-46 16 64 10-18h40l16-12 18 12h120l12-8 12 8h30l10 4 14-46 16 64 10-18h40" />
          </svg>
        </div>
        <div className="l-hero-try">
          <p className="tryhint">Try one now ↓</p>
          <QOTD exam="NCLEX-RN" compact />
        </div>
      </section>

      <section id="exams" className="l-section">
        <h2>Pick your exam</h2>
        <p className="lede">Every exam is organized by the subjects it actually tests, so practice maps to the real blueprint.</p>
        <div className="examgrid">
          {EXAM_NAMES.map((x) => (
            <Link key={x} to="/practice" className="examcard">
              <strong>{x}</strong>
              <span className="meta">{EXAMS[x].blurb}</span>
              <span className="tags">{EXAMS[x].subjects.slice(0, 4).map((s) => <span className="tag" key={s}>{s}</span>)}{EXAMS[x].subjects.length > 4 && <span className="tag">+{EXAMS[x].subjects.length - 4} more</span>}</span>
            </Link>
          ))}
        </div>
      </section>

      <section id="features" className="l-section">
        <h2>Everything you need to study, in one app</h2>
        {FEATURES.map((f, i) => (
          <div key={f.k} className={"feature" + (i % 2 ? " flip-side" : "")}>
            <div className="feature-copy">
              <span className="tile-k">{f.k}</span>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
            <Demo kind={f.demo} />
          </div>
        ))}
      </section>

      <section className="l-section">
        <h2>How it works</h2>
        <ol className="steps">
          <li><span>1</span><strong>Create your account</strong><p>Pick the exam you're studying for. It takes 30 seconds.</p></li>
          <li><span>2</span><strong>Practice and build quizzes</strong><p>Work through subjects or build a quiz around what's on your next test.</p></li>
          <li><span>3</span><strong>Track and fix weak spots</strong><p>Your dashboard shows where you're slipping. Drill it, or book a tutor.</p></li>
        </ol>
      </section>

      <section id="tutors" className="l-section l-band">
        <div>
          <h2>Are you a nurse who loves to teach?</h2>
          <p className="lede">Publish a tutor profile, set your own rate and hours, and help students pass. Your contact info is only shared once you accept a lesson.</p>
        </div>
        <Link to="/signin?new=1" className="btn big">Join as a tutor</Link>
      </section>

      <section className="l-final">
        <h2>Your next exam is closer than it looks.</h2>
        <p className="lede">Start practicing today — it's free.</p>
        <Link to="/signin?new=1" className="btn big">Create a free account</Link>
      </section>
    </div>
  );
}
