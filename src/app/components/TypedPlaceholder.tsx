import { useEffect, useRef } from 'react';

interface UseTypedPlaceholderProps {
  strings: string[];
  typeSpeed?: number;
  backSpeed?: number;
  loop?: boolean;
  showCursor?: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
}

export function useTypedPlaceholder({
  strings,
  typeSpeed = 50,
  backSpeed = 30,
  loop = true,
  showCursor = true,
  inputRef,
}: UseTypedPlaceholderProps) {
  const currentStringIndex = useRef(0);
  const currentCharIndex = useRef(0);
  const isDeleting = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!inputRef.current) return;

    const type = () => {
      const currentString = strings[currentStringIndex.current];
      if (!currentString) return;

      if (isDeleting.current) {
        // Delete characters
        if (currentCharIndex.current > 0) {
          currentCharIndex.current--;
          if (inputRef.current) {
            inputRef.current.placeholder = currentString.substring(0, currentCharIndex.current) + (showCursor ? '|' : '');
          }
          timeoutRef.current = setTimeout(type, backSpeed);
        } else {
          // Move to next string
          isDeleting.current = false;
          currentStringIndex.current = (currentStringIndex.current + 1) % strings.length;
          timeoutRef.current = setTimeout(type, 500);
        }
      } else {
        // Type characters
        if (currentCharIndex.current < currentString.length) {
          currentCharIndex.current++;
          if (inputRef.current) {
            inputRef.current.placeholder = currentString.substring(0, currentCharIndex.current) + (showCursor ? '|' : '');
          }
          timeoutRef.current = setTimeout(type, typeSpeed);
        } else {
          // Finished typing, wait then start deleting
          if (loop) {
            timeoutRef.current = setTimeout(() => {
              isDeleting.current = true;
              type();
            }, 2000);
          }
        }
      }
    };

    // Start typing
    type();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [strings, typeSpeed, backSpeed, loop, showCursor, inputRef]);
}
