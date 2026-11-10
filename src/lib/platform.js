import { Capacitor } from "@capacitor/core";

const env = import.meta.env;

/** True inside the iOS app (Capacitor), false on the website. */
export const isNative = Capacitor.isNativePlatform();

/** Public web address of the Netlify site, e.g. https://mynurse.netlify.app (no trailing slash). */
const rawSite = (env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
export const SITE_URL = /YOUR-SITE/i.test(rawSite) ? "" : rawSite;

/** Where the Netlify Claude function lives. On the web it's same-origin; in the app it must be absolute. */
export const API_BASE = isNative ? SITE_URL : "";

/** Where Supabase sends people back after email confirmation / password reset. */
export const AUTH_REDIRECT = isNative ? "mynurse://auth-callback" : window.location.origin;
export const RESET_REDIRECT = isNative ? "mynurse://auth-callback?next=/account" : `${window.location.origin}/account`;

export const SUPPORT_EMAIL = env.NEXT_PUBLIC_SUPPORT_EMAIL || "";
