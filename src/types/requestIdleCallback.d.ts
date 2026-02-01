// Type declarations for requestIdleCallback (for browsers that support it)

interface IdleRequestOptions {
  timeout?: number;
}

interface IdleDeadline {
  readonly didTimeout: boolean;
  timeRemaining(): number;
}

declare global {
  interface Window {
    requestIdleCallback?(
      callback: (deadline: IdleDeadline) => void,
      options?: IdleRequestOptions
    ): number;
    cancelIdleCallback?(handle: number): void;
  }
}

export {};
