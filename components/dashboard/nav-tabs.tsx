"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef } from "react";

export interface NavTabItem {
  href: string;
  label: string;
}

interface NavTabsProps {
  items: readonly NavTabItem[];
  activeHref: string | null;
  /** Stretch the bar to full width and share it evenly (mobile row). */
  stretch?: boolean;
  className?: string;
}

/**
 * transitions.dev "tabs sliding": one pill tracks the active destination
 * instead of a background blinking on and off between two links.
 *
 * These are real links, not buttons, so navigation drives the position —
 * activeHref changes on route change and the pill tweens to the new tab.
 */
export function NavTabs({
  items,
  activeHref,
  stretch = false,
  className = "",
}: NavTabsProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  // Skip the tween on first paint and on resize, so the pill never
  // animates in from translateX(0) / width: 0.
  const hasPositioned = useRef(false);

  useLayoutEffect(() => {
    const bar = barRef.current;
    const pill = pillRef.current;
    if (!bar || !pill) return;

    function moveTo(animate: boolean) {
      const tab = bar!.querySelector<HTMLElement>('[data-active="true"]');
      if (!tab) {
        pill!.style.opacity = "0";
        return;
      }
      pill!.style.opacity = "1";

      if (!animate) {
        const prev = pill!.style.transition;
        pill!.style.transition = "none";
        pill!.style.transform = `translateX(${tab.offsetLeft}px)`;
        pill!.style.width = `${tab.offsetWidth}px`;
        void pill!.offsetWidth; // force reflow
        pill!.style.transition = prev;
      } else {
        pill!.style.transform = `translateX(${tab.offsetLeft}px)`;
        pill!.style.width = `${tab.offsetWidth}px`;
      }
    }

    moveTo(hasPositioned.current);
    hasPositioned.current = true;

    const onResize = () => moveTo(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeHref, stretch]);

  // Fonts land after first paint and change tab widths under the pill.
  useEffect(() => {
    if (!("fonts" in document)) return;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled) return;
      window.dispatchEvent(new Event("resize"));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      ref={barRef}
      className={`t-tabs ${stretch ? "t-tabs--stretch" : ""} ${className}`}
    >
      <span ref={pillRef} className="t-tabs-pill" aria-hidden style={{ opacity: 0 }} />
      {items.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            // These are navigation links, not a tablist, so the state is
            // aria-current. data-active is only the hook the pill measures.
            data-active={active}
            aria-current={active ? "page" : undefined}
            // The snippet's active colour hangs off [aria-selected], which is
            // invalid on a link. globals.css is unlayered so it also outranks
            // any Tailwind colour utility here — hence setting it inline.
            style={active ? { color: "var(--tabs-text-active)" } : undefined}
            className="t-tab inline-flex items-center whitespace-nowrap text-sm font-medium no-underline"
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
