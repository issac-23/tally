"use client";

import { useEffect, useRef } from "react";

interface SuccessCheckProps {
  /** Flip to true the moment the action succeeds. */
  shown: boolean;
  size?: number;
  className?: string;
}

/**
 * transitions.dev "success check" — fade + rotate + blur + Y-bob with the
 * tick stroke drawing itself. Used for the save/add confirmations, which
 * previously just blinked into existence as the word "Saved".
 */
export function SuccessCheck({
  shown,
  size = 16,
  className = "",
}: SuccessCheckProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!shown) {
      el.setAttribute("data-state", "out");
      return;
    }
    // Reset then reflow so a second save replays the draw from offset 0.
    el.setAttribute("data-state", "out");
    void el.offsetWidth;
    el.setAttribute("data-state", "in");
  }, [shown]);

  return (
    <span
      ref={ref}
      className={`t-success-check ${className}`}
      data-state="out"
      aria-hidden
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* getTotalLength() for this path is 12.4 — the stroke-dasharray in
            globals.css rounds to 20, which is long enough to stay hidden
            until the draw runs. */}
        <path
          d="M3.5 8.5L6.5 11.5L12.5 5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
