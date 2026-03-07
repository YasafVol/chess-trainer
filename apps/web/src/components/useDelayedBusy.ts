import { useEffect, useRef, useState } from "react";

type DelayedBusyOptions = {
  delayMs?: number;
  minVisibleMs?: number;
};

export function useDelayedBusy(isBusy: boolean, options: DelayedBusyOptions = {}) {
  const delayMs = options.delayMs ?? 200;
  const minVisibleMs = options.minVisibleMs ?? 400;
  const [visible, setVisible] = useState(false);
  const shownAtRef = useRef<number | null>(null);
  const showTimeoutRef = useRef<number | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (showTimeoutRef.current !== null) {
        window.clearTimeout(showTimeoutRef.current);
      }
      if (hideTimeoutRef.current !== null) {
        window.clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (showTimeoutRef.current !== null) {
      window.clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }

    if (hideTimeoutRef.current !== null) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    if (isBusy) {
      if (!visible) {
        showTimeoutRef.current = window.setTimeout(() => {
          shownAtRef.current = Date.now();
          setVisible(true);
          showTimeoutRef.current = null;
        }, delayMs);
      }
      return;
    }

    if (!visible) {
      return;
    }

    const shownAt = shownAtRef.current ?? Date.now();
    const elapsed = Date.now() - shownAt;
    const remaining = Math.max(0, minVisibleMs - elapsed);

    hideTimeoutRef.current = window.setTimeout(() => {
      shownAtRef.current = null;
      setVisible(false);
      hideTimeoutRef.current = null;
    }, remaining);
  }, [delayMs, isBusy, minVisibleMs, visible]);

  return visible;
}
