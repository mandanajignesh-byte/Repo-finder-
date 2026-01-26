/**
 * TypedText Component
 * Wrapper for Typed.js typing animation library
 * Reference: https://mattboldt.com/demos/typed-js/
 */

import { useEffect, useRef } from 'react';
import Typed from 'typed.js';

interface TypedTextProps {
  strings: string[];
  typeSpeed?: number;
  backSpeed?: number;
  loop?: boolean;
  showCursor?: boolean;
  className?: string;
  onComplete?: () => void;
}

export function TypedText({
  strings,
  typeSpeed = 50,
  backSpeed = 30,
  loop = false,
  showCursor = true,
  className = '',
  onComplete,
}: TypedTextProps) {
  const el = useRef<HTMLSpanElement>(null);
  const typed = useRef<Typed | null>(null);

  useEffect(() => {
    if (!el.current) return;

    const options = {
      strings,
      typeSpeed,
      backSpeed,
      loop,
      showCursor,
      onComplete: () => {
        if (onComplete) {
          onComplete();
        }
      },
    };

    typed.current = new Typed(el.current, options);

    return () => {
      if (typed.current) {
        typed.current.destroy();
      }
    };
  }, [strings, typeSpeed, backSpeed, loop, showCursor, onComplete]);

  return <span ref={el} className={className} />;
}
