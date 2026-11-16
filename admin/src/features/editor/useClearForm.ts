import { useState } from "react";
import { usePostDraft } from "../../app/postDraft/postDraftContext";
import { useAdminAuth, useAdminPassword } from "../../auth/authContext";
import { getConfig } from "../../config/env";
import { clearTempImages } from "../../services/tempImages";
import { createEmptyDraft } from "../../utils/draft";

/** Empties the form and the backend temp images; also used to leave an edit session. */
export function useClearForm() {
  const { setDraftValues, setPreviewMarkdown, requestTempReload } = usePostDraft();
  const password = useAdminPassword();
  const { lockIfUnauthorized } = useAdminAuth();
  const { defaultCategory } = getConfig();
  const [isClearing, setIsClearing] = useState(false);

  async function clearAll() {
    setIsClearing(true);

    try {
      await clearTempImages(password);

      setDraftValues(createEmptyDraft(defaultCategory));
      setPreviewMarkdown("");
      requestTempReload();
    } catch (error: unknown) {
      lockIfUnauthorized(error);
    } finally {
      setIsClearing(false);
    }
  }

  async function cancelEdit() {
    try {
      await clearTempImages(password);
    } catch {
      // Best effort: the page reloads either way.
    } finally {
      window.location.reload();
    }
  }

  return { isClearing, clearAll, cancelEdit };
}
