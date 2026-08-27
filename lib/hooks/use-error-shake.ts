"use client";

import { useCallback, useEffect, useRef } from "react";

function cssMs(name: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const v = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(name)
  );
  return Number.isFinite(v) ? v : fallback;
}

/**
 * transitions.dev "error state shake".
 *
 * Returns a ref for the element that owns the visible border and a trigger
 * to replay the shake. `.is-error` and `.is-shaking` stay orthogonal so the
 * shake can replay on a repeated failure without the error treatment
 * flickering off and on in the same tick.
 */
export function useErrorShake<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => clear, [clear]);

  const shake = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    clear();
    el.classList.add("is-error");
    el.classList.remove("is-shaking");
    void el.offsetWidth; // force reflow so the animation replays
    el.classList.add("is-shaking");

    const shakeMs =
      cssMs("--shake-dur-a", 80) * 2 + cssMs("--shake-dur-b", 60) * 2;

    timers.current.push(
      setTimeout(() => el.classList.remove("is-shaking"), shakeMs + 20)
    );
  }, [clear]);

  /** Call while the user is correcting the value — stop nagging them. */
  const clearError = useCallback(() => {
    clear();
    ref.current?.classList.remove("is-error", "is-shaking");
  }, [clear]);

  return { ref, shake, clearError };
}
