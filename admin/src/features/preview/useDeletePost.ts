/*
 * Hook with the delete-post flow (confirm, request, result). Used by PostPreviewPanel.
 */
import { useState } from "react";
import { useAdminAuth, useAdminPassword } from "../../auth/authContext";
import { useI18n } from "../../i18n";
import { describeServiceFailure } from "../../i18n/errors";
import deletePostService from "../../services/deletePost";

/** Steps of the delete modal. */
export type DeleteModalState = "closed" | "confirming" | "submitting" | "result";

/** What the result step of the delete modal shows. */
export type DeleteResult = {
  /** Whether the post was deleted. */
  succeeded: boolean;
  title: string;
  message: string;
  /** Translated backend error, if any. */
  details: string | null;
};

/**
 * Delete flow of a post from the dropdown: confirmation, request and result modal states.
 * A 401 locks the app instead of showing an error.
 *
 * @param onDeleted - Called with the post id once a successful result is acknowledged.
 * @returns `state` and `result` (modal data), `isSubmitting`, and the actions `open` (ask to
 * delete a post id), `close`, `confirm` (send the request) and `acknowledge` (close the result).
 */
export function useDeletePost(onDeleted: (postId: string) => void) {
  const { t } = useI18n();
  const password = useAdminPassword();
  const { lockIfUnauthorized } = useAdminAuth();
  const [state, setState] = useState<DeleteModalState>("closed");
  const [targetId, setTargetId] = useState<string | null>(null);
  const [result, setResult] = useState<DeleteResult | null>(null);

  function showResult(next: DeleteResult) {
    setResult(next);
    setState("result");
  }

  function showFailure(message: string, details: string | null = null) {
    showResult({ succeeded: false, title: t("preview.deleteErrorTitle"), message, details });
  }

  function open(postId: string) {
    setTargetId(postId);
    setResult(null);
    setState("confirming");
  }

  function close() {
    setState("closed");
  }

  async function confirm() {
    if (!targetId) {
      showFailure(t("preview.deleteNoTarget"));
      return;
    }

    setState("submitting");

    try {
      const response = await deletePostService(targetId, password);

      if (lockIfUnauthorized(response.status)) {
        return;
      }

      if (response.status >= 200 && response.status < 300) {
        showResult({
          succeeded: true,
          title: t("preview.deleteSuccessTitle"),
          message: t("preview.deleteSuccessMessage"),
          details: null
        });
        return;
      }

      showFailure(
        t("preview.deleteFailureStatus", { status: response.status }),
        describeServiceFailure(t, response.status, response.data)
      );
    } catch {
      showFailure(t("preview.deleteUnexpected"));
    }
  }

  function acknowledge() {
    if (result?.succeeded && targetId) {
      onDeleted(targetId);
    }

    close();
  }

  return { state, result, isSubmitting: state === "submitting", open, close, confirm, acknowledge };
}
