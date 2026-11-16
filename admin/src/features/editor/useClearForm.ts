/*
 * Hook behind the clear and cancel-edit buttons: empties the backend temp images and
 * resets the draft. Used by EditorPanel.
 */
import { useState } from "react";
import { usePostDraft } from "../../app/postDraft/postDraftContext";
import { useAdminAuth, useAdminPassword } from "../../auth/authContext";
import { useI18n } from "../../i18n";
import { describeError } from "../../i18n/errors";
import { getConfig } from "../../config/env";
import { clearTempImages } from "../../services/tempImages";
import { createEmptyDraft } from "../../utils/draft";

/**
 * Empties the form and the backend temp images; also used to leave an edit session.
 *
 * @returns `isClearing` (request in flight), `error` (translated failure message or `null`),
 * `dismissError`, `clearAll` (empties the draft, keeping the edit session untouched) and
 * `cancelEdit` (clears temp images and resets to a new post).
 */
export function useClearForm() {
  const { setDraftValues, setPreviewMarkdown, requestTempReload, resetDraft } = usePostDraft();
  const password = useAdminPassword();
  const { lockIfUnauthorized } = useAdminAuth();
  const { defaultCategory } = getConfig();
  const { t } = useI18n();
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function clearAll() {
    setIsClearing(true);
    setError(null);

    try {
      await clearTempImages(password);

      setDraftValues(createEmptyDraft(defaultCategory));
      setPreviewMarkdown("");
      requestTempReload();
    } catch (error: unknown) {
      if (!lockIfUnauthorized(error)) {
        setError(describeError(t, error));
      }
    } finally {
      setIsClearing(false);
    }
  }

  async function cancelEdit() {
    try {
      await clearTempImages(password);
    } catch (error: unknown) {
      // Anything else is not fatal: the reset below reloads whatever is left in temp storage.
      if (lockIfUnauthorized(error)) {
        return;
      }
    }

    resetDraft();
  }

  return { isClearing, error, dismissError: () => setError(null), clearAll, cancelEdit };
}
