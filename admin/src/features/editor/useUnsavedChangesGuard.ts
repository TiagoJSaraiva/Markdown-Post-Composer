/*
 * Hook that warns before the page is closed with unsaved work and cleans the temp
 * images on the way out. Used once by EditorPanel.
 */
import { useEffect } from "react";
import { usePostDraft } from "../../app/postDraft/postDraftContext";
import { useAdminPassword } from "../../auth/authContext";
import { getConfig } from "../../config/env";
import { clearTempImages } from "../../services/tempImages";
import { hasPendingDraftChanges } from "../../utils/draft";

/**
 * Warns before the page is closed while the draft has unsaved work and, when
 * the page really goes away, cleans the temp images of the backend (best effort).
 */
export function useUnsavedChangesGuard(): void {
  const { draft, editSession } = usePostDraft();
  const password = useAdminPassword();
  const { defaultCategory } = getConfig();

  useEffect(() => {
    const shouldWarn = hasPendingDraftChanges(draft, Boolean(editSession), defaultCategory);

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!shouldWarn) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    const handlePageHide = () => {
      if (!shouldWarn) {
        return;
      }

      // Best effort cleanup when user really leaves/reloads the page.
      void clearTempImages(password, { keepalive: true }).catch(() => undefined);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [draft, editSession, defaultCategory, password]);
}
