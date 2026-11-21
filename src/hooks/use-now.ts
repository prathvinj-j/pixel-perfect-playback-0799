import { useSyncExternalStore } from "react";

// One shared 1s ticker for every countdown on the page.
let serverOffset = 0; // serverTime - localClientTime
let now = Date.now() + serverOffset;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

export function setServerOffset(offsetMs: number) {
  serverOffset = offsetMs;
  now = Date.now() + serverOffset;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!timer) {
    now = Date.now() + serverOffset;
    timer = setInterval(() => {
      now = Date.now() + serverOffset;
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

/** Current time in ms (calibrated to server time if offset known), re-rendering every second. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, () => now, serverSnapshot);
}
