import { useAuth } from "../lib/auth.jsx";
import Auth from "./Auth.jsx";

export default function RequireAuth({ children, reason }) {
  const { session, loading } = useAuth();
  if (loading) return <p className="note">Loading…</p>;
  if (!session) return <Auth reason={reason} />;
  return children;
}
