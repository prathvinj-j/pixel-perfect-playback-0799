import { useSyncExternalStore } from "react";

// One shared 1s ticker for every countdown on the page.
let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

const serverSnapshot = () => 0;

/** Current time in ms, re-rendering every second. Returns 0 during SSR/hydration. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, () => now, serverSnapshot);
}
