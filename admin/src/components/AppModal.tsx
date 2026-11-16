import { type ReactNode, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import "./AppModal.css";

let openModalCount = 0;

type AppModalProps = {
  title: string;
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
export default function AppModal({ title, children }: AppModalProps) {
  const titleId = useId();

  useEffect(() => {
    openModalCount += 1;

    if (openModalCount === 1) {
      applyAppLock();
    }

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    return () => {
      openModalCount = Math.max(0, openModalCount - 1);

      if (openModalCount === 0) {
        removeAppLock();
      }
    };
  }, []);

  const root = document.getElementById("app-modal-root") ?? document.body;

  return createPortal(
    <div className="app-modal-backdrop">
      <div className="app-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h3 id={titleId} className="app-modal-title">{title}</h3>
        {children}
      </div>
    </div>,
    root
  );
}
