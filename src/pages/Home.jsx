import { useAuth } from "../lib/auth.jsx";
import Landing from "./Landing.jsx";
import Dashboard from "./Dashboard.jsx";

export default function Home() {
  const { session, loading } = useAuth();
  if (loading) return <p className="note">Loading…</p>;
  return session ? <Dashboard /> : <Landing />;
}
