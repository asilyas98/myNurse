import { NavLink, Navigate, Route, Routes, useLocation, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { supabaseConfigured } from "./supabase.js";
import { useAuth } from "./lib/auth.jsx";
import Auth from "./components/Auth.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import Home from "./pages/Home.jsx";
import Practice from "./pages/Practice.jsx";
import QuizRun from "./pages/QuizRun.jsx";
import QuizBuilder from "./pages/QuizBuilder.jsx";
import MyQuizzes from "./pages/MyQuizzes.jsx";
import Flashcards from "./pages/Flashcards.jsx";
import Deck from "./pages/Deck.jsx";
import Tutors from "./pages/Tutors.jsx";
import TutorProfile from "./pages/TutorProfile.jsx";
import Lessons from "./pages/Lessons.jsx";
import Account from "./pages/Account.jsx";
import AskTutor from "./pages/AskTutor.jsx";
import Privacy from "./pages/Privacy.jsx";
import { isNative } from "./lib/platform.js";

const NAV = [
  { to: "/", label: "Home", authLabel: "Dashboard", icon: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z", end: true },
  { to: "/practice", label: "Practice", icon: "M9 5h10M9 12h10M9 19h10M4 5h.01M4 12h.01M4 19h.01" },
  { to: "/quizzes", label: "My quizzes", icon: "M4 4h16v16H4zM8 9h8M8 13h5", desktopOnly: true },
  { to: "/flashcards", label: "Flashcards", icon: "M3 7h14v12H3zM7 3h14v12" },
  { to: "/tutors", label: "Tutors", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" },
  { to: "/ask", label: "AI tutor", icon: "M4 5h16v11H8l-4 4z", desktopOnly: true },
  { to: "/lessons", label: "Lessons", icon: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4", desktopOnly: true },
  { to: "/account", label: "Account", icon: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6.5 18.5a6 6 0 0 1 11 0" },
];

function Icon({ d }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22"><path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function SignInPage() {
  const { session } = useAuth();
  const [params] = useSearchParams();
  if (session) return <Navigate to="/" replace />;
  return (
    <section className="narrow">
      <h2>Welcome to MyNurse</h2>
      <p className="lede">Practice tests, custom quizzes, flashcards, and tutors — all in one place.</p>
      <Auth startMode={params.get("new") ? "signup" : "signin"} />
    </section>
  );
}

export default function App() {
  const { session, profile, notice, setNotice } = useAuth();
  const { pathname } = useLocation();
  useEffect(() => { if (notice) { const t = setTimeout(() => setNotice(""), 6000); return () => clearTimeout(t); } }, [notice, setNotice]);
  useEffect(() => { if (!window.location.hash || window.location.hash.includes("access_token")) window.scrollTo(0, 0); }, [pathname]);

  if (!supabaseConfigured) {
    return (
      <div className="wrap" style={{ padding: "40px 20px" }}>
        <h2>Almost there</h2>
        <p className="lede">Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> to <code>.env</code>, then restart the dev server.</p>
      </div>
    );
  }

  const authed = (el, reason) => <RequireAuth reason={reason}>{el}</RequireAuth>;
  const nav = NAV.filter((n) => session || ["/", "/practice"].includes(n.to));

  return (
    <>
      <header className="topbar">
        <div className="wrap topbar-in">
          <NavLink to="/" className="brand" aria-label="MyNurse home">
            <svg viewBox="0 0 26 26" aria-hidden="true"><rect x="1" y="1" width="24" height="24" rx="7" fill="var(--ink)" /><path d="M4 14h5l2-5 3 10 2-5h6" fill="none" stroke="var(--pulse)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            MyNurse
          </NavLink>
          <nav className="desknav" aria-label="Main">
            {session
              ? nav.filter((n) => n.to !== "/account").map((n) => <NavLink key={n.to} to={n.to} end={n.end}>{n.authLabel || n.label}</NavLink>)
              : pathname === "/"
                ? <><a href="#features">Features</a><a href="#exams">Exams</a><a href="#tutors">For tutors</a><NavLink to="/practice">Free practice</NavLink></>
                : <><NavLink to="/" end>Home</NavLink><NavLink to="/practice">Free practice</NavLink></>}
          </nav>
          <div className="account">
            {session
              ? <NavLink to="/account" className="acct-chip">{profile?.role === "tutor" && <span className="pill">Tutor</span>}{profile?.display_name || "Account"}</NavLink>
              : <><NavLink to="/signin" className="btn ghost small">Log in</NavLink><NavLink to="/signin?new=1" className="btn small">Sign up</NavLink></>}
          </div>
        </div>
      </header>

      {notice && <div className="wrap"><p className="toast" role="status">{notice}<button className="linkbtn" onClick={() => setNotice("")} aria-label="Dismiss">✕</button></p></div>}

      <main className="wrap">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/quiz" element={<QuizRun />} />
          <Route path="/quiz/:id" element={authed(<QuizRun />)} />
          <Route path="/quizzes" element={authed(<MyQuizzes />, "Sign in to build and save custom quizzes.")} />
          <Route path="/quizzes/new" element={authed(<QuizBuilder />, "Sign in to build and save custom quizzes.")} />
          <Route path="/quizzes/:id/edit" element={authed(<QuizBuilder />)} />
          <Route path="/flashcards" element={authed(<Flashcards />, "Sign in to make and study flashcard decks.")} />
          <Route path="/flashcards/:id" element={authed(<Deck />)} />
          <Route path="/tutors" element={authed(<Tutors />, "Sign in to browse tutors and request lessons.")} />
          <Route path="/tutors/:id" element={authed(<TutorProfile />, "Sign in to view tutor profiles.")} />
          <Route path="/lessons" element={authed(<Lessons />)} />
          <Route path="/ask" element={authed(<AskTutor />, "Sign in to ask the AI study tutor.")} />
          <Route path="/account" element={authed(<Account />)} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="wrap sitefoot">MyNurse is a study aid. It doesn't replace your program's materials, your preceptor, or facility policy. <NavLink to="/privacy">Privacy</NavLink></footer>

      <nav className={"tabbar" + (!session && !isNative && pathname === "/" ? " hidden" : "")} aria-label="Main">
        {nav.filter((n) => !n.desktopOnly).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}><Icon d={n.icon} /><span>{session ? n.authLabel || n.label : n.label}</span></NavLink>
        ))}
        {!session && <NavLink to="/signin"><Icon d={NAV.at(-1).icon} /><span>Sign in</span></NavLink>}
      </nav>
    </>
  );
}
