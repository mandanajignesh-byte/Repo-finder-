/**
 * TypedMessage Component
 * Displays agent messages with typing animation
 */

import { useEffect, useRef, useState } from 'react';
import Typed from 'typed.js';

interface TypedMessageProps {
  text: string;
  className?: string;
  onComplete?: () => void;
  typeSpeed?: number;
}

export function TypedMessage({ 
  text, 
  className = '', 
  onComplete,
  typeSpeed = 30 
}: TypedMessageProps) {
  const el = useRef<HTMLSpanElement>(null);
  const typed = useRef<Typed | null>(null);
  const initialized = useRef(false);
  const textKey = useRef(text);

  useEffect(() => {
    if (!el.current) return;

    // If text changed, reset
    if (textKey.current !== text) {
      textKey.current = text;
      initialized.current = false;
      if (typed.current) {
        try {
          typed.current.destroy();
        } catch (e) {
          // Ignore
        }
        typed.current = null;
      }
    }

    // Don't re-initialize if already done
    if (initialized.current && el.current.textContent === text) {
      return;
    }

    // Clear element
    if (el.current) {
      el.current.textContent = '';
    }

    // Initialize Typed
    try {
      const options = {
        strings: [text],
        typeSpeed,
        showCursor: false,
        fadeOut: false,
        onComplete: () => {
          initialized.current = true;
          // Force text to stay
          if (el.current) {
            el.current.textContent = text;
          }
          if (onComplete) {
            onComplete();
          }
        },
      };

      typed.current = new Typed(el.current, options);
    } catch (error) {
      // Fallback: show text immediately
      console.error('Typed.js error:', error);
      if (el.current) {
        el.current.textContent = text;
      }
      initialized.current = true;
    }

    return () => {
      if (typed.current) {
        try {
          // Save text before destroying
          const currentText = el.current?.textContent || text;
          typed.current.destroy();
          typed.current = null;
          // Immediately restore text
          if (el.current && currentText) {
            el.current.textContent = currentText;
          }
        } catch (e) {
          // Ignore errors, but ensure text is there
          if (el.current && text) {
            el.current.textContent = text;
          }
        }
      }
    };
  }, [text, typeSpeed, onComplete]);

  // Safety net: always ensure text is visible
  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (el.current && !el.current.textContent && text) {
        el.current.textContent = text;
      }
    }, 100);

    return () => clearInterval(checkInterval);
  }, [text]);

  return <span ref={el} className={className} />;
}
