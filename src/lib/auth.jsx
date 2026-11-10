import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { App as CapApp } from "@capacitor/app";
import { supabase } from "../supabase.js";
import { isNative } from "./platform.js";

const AuthCtx = createContext({ session: null, profile: null, loading: true, refreshProfile: () => {}, notice: "", setNotice: () => {} });

/** Pull Supabase tokens out of mynurse://auth-callback?next=/x#access_token=…&refresh_token=… */
function parseAuthLink(url) {
  if (!url || !url.startsWith("mynurse://")) return null;
  const [beforeHash, hash = ""] = url.split("#");
  const query = beforeHash.includes("?") ? beforeHash.split("?")[1] : "";
  const h = new URLSearchParams(hash);
  const q = new URLSearchParams(query);
  return {
    access_token: h.get("access_token"),
    refresh_token: h.get("refresh_token"),
    type: h.get("type"),
    error: h.get("error_description") || q.get("error_description"),
    next: q.get("next") || "/",
  };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const navigate = useNavigate();
  const handled = useRef(new Set());

  const refreshProfile = useCallback(async (s) => {
    const sess = s ?? (await supabase.auth.getSession()).data.session;
    if (!sess) { setProfile(null); return; }
    const { data } = await supabase.from("profiles").select("*").eq("user_id", sess.user.id).maybeSingle();
    setProfile(data || { user_id: sess.user.id, display_name: sess.user.email, role: "student", target_exam: "NCLEX-RN" });
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await refreshProfile(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      refreshProfile(s);
    });
    return () => sub.subscription.unsubscribe();
  }, [refreshProfile]);

  // iOS app: email confirmation and password-reset links open the app through the mynurse:// scheme.
  useEffect(() => {
    if (!isNative) return;
    async function handle(url) {
      const link = parseAuthLink(url);
      if (!link || handled.current.has(url)) return;
      handled.current.add(url);
      if (link.error) { setNotice(link.error.replace(/\+/g, " ")); return; }
      if (!link.access_token || !link.refresh_token) return;
      const { error } = await supabase.auth.setSession({ access_token: link.access_token, refresh_token: link.refresh_token });
      if (error) { setNotice("That link has expired. Sign in, or request a new link."); return; }
      if (link.type === "recovery") {
        setNotice("You're signed in. Set a new password below.");
        navigate("/account#password");
      } else {
        setNotice("Email confirmed — you're signed in.");
        navigate(link.next);
      }
    }
    CapApp.getLaunchUrl().then((r) => r?.url && handle(r.url)).catch(() => {});
    const listener = Promise.resolve()
      .then(() => CapApp.addListener("appUrlOpen", ({ url }) => handle(url)))
      .catch(() => null);
    return () => { listener.then((l) => l?.remove()); };
  }, [navigate]);

  return <AuthCtx.Provider value={{ session, profile, loading, refreshProfile, notice, setNotice }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
