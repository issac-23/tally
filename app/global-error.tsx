"use client";

import { useEffect } from "react";

/**
 * Last resort: the root layout itself failed, so no layout renders and
 * this has to supply its own <html> and <body>.
 *
 * That also means no fonts and no globals.css — the styling here is inline
 * on purpose, because the stylesheet may be exactly what didn't load.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[tally] root layout failed", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          background: "#FDFCFA",
          color: "#1C1A17",
          fontFamily: "system-ui, -apple-system, sans-serif",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "24rem" }}>
          <h1 style={{ fontSize: "1.125rem", fontWeight: 500, margin: 0 }}>
            Tally couldn&rsquo;t start
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#6B6660", marginTop: "0.75rem" }}>
            Something failed before the page could load. Reloading usually
            fixes it.
          </p>
          <button
            type="button"
            onClick={() => unstable_retry()}
            style={{
              marginTop: "1.5rem",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#fff",
              background: "#C2410C",
              border: "none",
              borderRadius: "0.25rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p
              style={{
                marginTop: "1rem",
                fontFamily: "ui-monospace, monospace",
                fontSize: "11px",
                color: "#9A948C",
              }}
            >
              {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
