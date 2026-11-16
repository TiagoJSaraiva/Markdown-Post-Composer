import { useCallback, useEffect, useRef } from "react";
import { usePostDraft } from "../../app/postDraft/postDraftContext";
import { useAdminPassword } from "../../auth/authContext";
import { getConfig } from "../../config/env";
import { clearTempImages } from "../../services/tempImages";
import { hasPendingDraftChanges } from "../../utils/draft";

/**
 * Warns before the page is closed while the draft has unsaved work and, when
 * the page really goes away, cleans the temp images of the backend.
 * Returns a function that disables the guard (used right before a reload).
 */
export function useUnsavedChangesGuard(): () => void {
  const { draft, editSession } = usePostDraft();
  const password = useAdminPassword();
  const { defaultCategory } = getConfig();
  const skipUnloadWarningRef = useRef(false);

  useEffect(() => {
    const shouldWarn = hasPendingDraftChanges(draft, Boolean(editSession), defaultCategory);

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (skipUnloadWarningRef.current) {
        return;
      }

      if (!shouldWarn) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    const handlePageHide = () => {
      if (skipUnloadWarningRef.current) {
        return;
      }

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

  return useCallback(() => {
    skipUnloadWarningRef.current = true;
  }, []);
}
