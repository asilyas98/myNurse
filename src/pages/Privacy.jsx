import { Link } from "react-router-dom";
import { SUPPORT_EMAIL } from "../lib/platform.js";

export default function Privacy() {
  const contact = SUPPORT_EMAIL
    ? <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
    : "the support contact listed on MyNurse's App Store page";
  return (
    <section className="prose">
      <Link to="/" className="backlink">← Back</Link>
      <h2>Privacy policy</h2>
      <p className="meta">Last updated November 10, 2026 · MyNurse is operated by SimpleAI LLC.</p>

      <h3>What we collect</h3>
      <ul>
        <li><strong>Account details:</strong> your name, email address, role (student or tutor), and the exam you're studying for.</li>
        <li><strong>Study activity:</strong> quizzes you build, questions you write, quiz scores and results by subject, time spent on quizzes, and flashcard decks.</li>
        <li><strong>Tutoring:</strong> tutor profiles (bio, credentials, subjects, rate, availability, contact details), lesson requests and messages, and reviews.</li>
        <li><strong>Questions you send to the AI tutor</strong> and topics or notes you submit to generate quizzes or flashcards.</li>
      </ul>
      <p>We don't collect your location, contacts, photos, or advertising identifiers, and we don't track you across other apps or websites.</p>

      <h3>How we use it</h3>
      <ul>
        <li>To run your account and show your progress, quizzes, and flashcards.</li>
        <li>To connect students and tutors. A tutor's contact details are shown to a student only after the tutor accepts that student's lesson; a student's contact details are shown to a tutor only for an accepted lesson.</li>
        <li>To answer AI tutor questions and generate practice content.</li>
      </ul>
      <p>We don't sell your data or use it for advertising.</p>

      <h3>Who processes it</h3>
      <ul>
        <li><strong>Supabase</strong> stores account and study data.</li>
        <li><strong>Netlify</strong> hosts the website and the server functions.</li>
        <li><strong>Anthropic</strong> processes the text you send to AI features (questions, topics, notes) to produce answers, quizzes, and flashcards. Don't include patient information or other confidential details.</li>
      </ul>

      <h3>Your choices</h3>
      <ul>
        <li>Edit your profile and tutor listing any time from Account.</li>
        <li>Delete your account from <Link to="/account#delete">Account → Delete account</Link>. This permanently removes your account and everything tied to it.</li>
      </ul>

      <h3>Not medical advice</h3>
      <p>MyNurse is a study aid. It isn't for decisions about real patients and doesn't replace your program's materials, your preceptor, or facility policy.</p>

      <h3>Contact</h3>
      <p>Questions about privacy: {contact}.</p>
    </section>
  );
}
