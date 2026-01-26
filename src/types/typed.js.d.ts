/**
 * Type definitions for typed.js
 */

declare module 'typed.js' {
  interface TypedOptions {
    strings?: string[];
    typeSpeed?: number;
    backSpeed?: number;
    backDelay?: number;
    startDelay?: number;
    loop?: boolean;
    loopCount?: number;
    showCursor?: boolean;
    cursorChar?: string;
    fadeOut?: boolean;
    fadeOutClass?: string;
    fadeOutDelay?: number;
    onComplete?: (self: Typed) => void;
    onStringTyped?: (arrayPos: number, self: Typed) => void;
    onTypingPaused?: (arrayPos: number, self: Typed) => void;
    onTypingResumed?: (arrayPos: number, self: Typed) => void;
    onReset?: (self: Typed) => void;
    onStop?: (arrayPos: number, self: Typed) => void;
    onStart?: (arrayPos: number, self: Typed) => void;
    onDestroy?: (self: Typed) => void;
  }

  class Typed {
    constructor(element: string | Element, options?: TypedOptions);
    toggle(): void;
    stop(): void;
    start(): void;
    destroy(): void;
    reset(restart?: boolean): void;
  }

  export default Typed;
}
