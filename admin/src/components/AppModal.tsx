import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import "./AppModal.css";

let openModalCount = 0;

type AppModalProps = {
  title: string;
  /** Called on Escape. Leave it out for a modal that cannot be dismissed (work in progress). */
  onClose?: () => void;
  children: ReactNode;
};

function applyAppLock() {
  document.body.classList.add("app-has-modal");

  const appContainer = document.querySelector(".app-container");
  if (appContainer) {
    appContainer.setAttribute("inert", "");
    appContainer.setAttribute("aria-hidden", "true");
  }
}

function removeAppLock() {
  document.body.classList.remove("app-has-modal");

  const appContainer = document.querySelector(".app-container");
  if (appContainer) {
    appContainer.removeAttribute("inert");
    appContainer.removeAttribute("aria-hidden");
  }
}

/** Modal dialog rendered in `#app-modal-root`; locks the rest of the app while any modal is open. */
export default function AppModal({ title, onClose, children }: AppModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    openModalCount += 1;

    if (openModalCount === 1) {
      applyAppLock();
    }

    return () => {
      openModalCount = Math.max(0, openModalCount - 1);

      if (openModalCount === 0) {
        removeAppLock();
      }

      // Give focus back to whatever opened the dialog, if it is still there.
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, []);

  // The content changes with the state of the flow (the focused button may disappear):
  // whenever focus is not inside the dialog, move it to the dialog itself.
  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog && !dialog.contains(document.activeElement)) {
      dialog.focus();
    }
  });

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape" && onClose) {
      event.stopPropagation();
      onClose();
    }
  }

  const root = document.getElementById("app-modal-root") ?? document.body;

  return createPortal(
    <div className="app-modal-backdrop">
      <div
        ref={dialogRef}
        className="app-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <h3 id={titleId} className="app-modal-title">{title}</h3>
        {children}
      </div>
    </div>,
    root
  );
}
