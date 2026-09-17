"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  /** Decimal places to show. */
  decimals?: number;
  duration?: number;
  format?: (value: number) => string;
}

/**
 * Counts up to `value` on mount and whenever the value changes, so a filter
 * change reads as a recalculation rather than a silent swap. Falls back to the
 * final value immediately when the user prefers reduced motion.
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  duration = 900,
  format,
}: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      // easeOutExpo keeps the count lively at the start and settles cleanly
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplay(from + (value - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduceMotion]);

  if (format) return <>{format(display)}</>;

  return (
    <>
      {display.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </>
  );
}

export default AnimatedNumber;
