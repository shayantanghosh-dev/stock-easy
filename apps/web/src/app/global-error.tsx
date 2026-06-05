"use client";

import { useEffect } from "react";

/**
 * Root-level error boundary (Next.js App Router convention). Catches errors
 * thrown in the root layout itself — the last-resort safety net so a user never
 * sees a raw white screen. It replaces the root layout, so it must render its
 * own <html>/<body> and cannot rely on the app's CSS (hence inline styles, with
 * colors matching the design tokens).
 *
 * Forward `error` to your monitoring provider here once configured
 * (e.g. `Sentry.captureException(error)` — see docs/OBSERVABILITY.md).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replace with your error tracker once a DSN is configured.
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#f8fafc",
          color: "#0f172a",
        }}
      >
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 8px" }}>Something went wrong</h1>
            <p style={{ fontSize: 14, lineHeight: 1.5, color: "#475569", margin: "0 0 20px" }}>
              An unexpected error occurred and has been logged. You can try again — if it keeps
              happening, please refresh the page.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                background: "#1d4ed8",
                color: "#fff",
                border: 0,
                borderRadius: 10,
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
