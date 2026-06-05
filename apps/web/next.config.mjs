/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== "production";

// --- Same-origin API proxy (zero-cost, no-custom-domain deployment) ----------
// In production we proxy the API *through* this Next app so the browser only
// ever talks to the web origin. That keeps the httpOnly refresh cookie
// (SameSite=Strict) FIRST-PARTY, so login/refresh/reload work across separate
// hosts (e.g. Vercel + Render) with no custom domain and no auth-code change.
// Set API_PROXY_TARGET to the API origin (e.g. https://stockeasy-api.onrender.com).
// Leave it unset locally → no rewrite; the app talks to NEXT_PUBLIC_API_URL directly.
const apiProxyTarget = process.env.API_PROXY_TARGET;

// Derive the API origin for the CSP `connect-src`. A relative NEXT_PUBLIC_API_URL
// (e.g. "/api/v1", used with the proxy) is same-origin and already covered by 'self'.
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
let apiConnectSrc = "";
try {
  apiConnectSrc = new URL(apiUrl).origin; // absolute URL → use its origin
} catch {
  apiConnectSrc = ""; // relative URL → same-origin (covered by 'self')
}

// Content-Security-Policy. Next.js injects inline bootstrap scripts and several
// libraries inject inline styles, so 'unsafe-inline' is required here without a
// nonce-based middleware. 'unsafe-eval' + the HMR websocket are dev-only.
const contentSecurityPolicy = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob:`,
  `font-src 'self' data:`,
  `connect-src 'self'${apiConnectSrc ? " " + apiConnectSrc : ""}${isDev ? " ws: wss:" : ""}`,
  `frame-ancestors 'none'`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // Enforced only over HTTPS (ignored on http://localhost), 2 years + preload.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Isolate our browsing context and stop other origins from embedding our
  // resources. Cross-Origin-Embedder-Policy is intentionally omitted: the app
  // needs no cross-origin isolation (no SharedArrayBuffer/wasm threads), and
  // `require-corp` would risk breaking legitimate cross-origin loads for no gain.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const nextConfig = {
  reactStrictMode: true,
  // Don't advertise the framework/version via the X-Powered-By header.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    if (!apiProxyTarget) return [];
    const target = apiProxyTarget.replace(/\/$/, "");
    // Browser → /api/* on the web origin → proxied server-side to the API.
    return [{ source: "/api/:path*", destination: `${target}/api/:path*` }];
  },
};

export default nextConfig;
