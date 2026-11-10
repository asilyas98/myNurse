// Origins allowed to call the functions from outside the website itself:
// the MyNurse iOS app (Capacitor serves it from capacitor://localhost) and local dev servers.
const ALLOWED = [/^capacitor:\/\/localhost$/, /^ionic:\/\/localhost$/, /^https?:\/\/localhost(:\d+)?$/];

export function corsHeaders(req) {
  const origin = req.headers.get("origin");
  if (!origin || !ALLOWED.some((re) => re.test(origin))) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
