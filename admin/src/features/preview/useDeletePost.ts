import { useState } from "react";
import { useAdminAuth, useAdminPassword } from "../../auth/authContext";
import { useI18n } from "../../i18n";
import { describeServiceFailure } from "../../i18n/errors";
import deletePostService from "../../services/deletePost";

export type DeleteModalState = "closed" | "confirming" | "submitting" | "result";

export type DeleteResult = {
  succeeded: boolean;
  title: string;
  message: string;
  details: string | null;
};

/** Delete flow of a post from the dropdown: confirmation, request and result modal states. */
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
