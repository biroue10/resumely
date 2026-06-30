import { useEffect } from "react";

// Accessible dialog focus management (WCAG 2.4.3 / 2.1.2):
//   • while `active`, Tab / Shift+Tab loop within `ref` (no escaping to the page)
//   • on close, focus is restored to the element that was focused before opening
// Modals keep their own "focus the first/most-relevant field on open" logic;
// this hook only adds the loop + restoration, so it composes without conflict.
const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function useFocusTrap(ref, active) {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;
    const root = ref.current;
    if (!root) return;
    const restoreTo = document.activeElement; // the trigger, before focus moves in

    const visibleFocusables = () =>
      Array.from(root.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement
      );

    const onKeyDown = (e) => {
      if (e.key !== "Tab") return;
      const f = visibleFocusables();
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      const act = document.activeElement;
      // If focus somehow left the dialog, pull it back in.
      if (!root.contains(act)) { e.preventDefault(); first.focus(); return; }
      if (e.shiftKey && act === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && act === last) { e.preventDefault(); first.focus(); }
    };

    root.addEventListener("keydown", onKeyDown);
    return () => {
      root.removeEventListener("keydown", onKeyDown);
      if (restoreTo && typeof restoreTo.focus === "function") {
        try { restoreTo.focus(); } catch { /* element gone */ }
      }
    };
  }, [active, ref]);
}
