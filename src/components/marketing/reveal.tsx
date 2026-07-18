'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Fades a section in the first time it enters the viewport. Purely
 * presentational and fail-safe: content is server-rendered visible, the
 * hidden state only applies once the observer attaches, a timer force-reveals
 * if the observer never fires, and prefers-reduced-motion disables the effect
 * in CSS.
 */
export function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') return;

    let revealed = false;
    const show = () => {
      if (revealed) return;
      revealed = true;
      node.classList.add('reveal-visible');
      observer.disconnect();
    };

    node.classList.add('reveal');
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) show();
      },
      { rootMargin: '0px 0px -40px 0px', threshold: 0.05 }
    );
    observer.observe(node);
    // Belt-and-braces: never leave content hidden if the observer goes quiet.
    const fallback = window.setTimeout(show, 1500);

    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
