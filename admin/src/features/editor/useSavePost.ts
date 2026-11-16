import { useState } from "react";
import { usePostDraft } from "../../app/postDraft/postDraftContext";
import { useAdminAuth, useAdminPassword } from "../../auth/authContext";
import { useI18n, type Translate } from "../../i18n";
import { describeError, describeServiceFailure } from "../../i18n/errors";
import { ApiError } from "../../lib/apiError";
import {
  clearTempImages,
  downloadTempImageAsFile
} from "../../services/tempImages";
import updatePostService from "../../services/updatePost";
import uploadPostService from "../../services/uploadPost";
import { validateDraftBeforeSave, type DraftIssue } from "../../utils/draft";

export type SaveModalState = "closed" | "confirming" | "submitting" | "result";

export type SaveResult = {
  succeeded: boolean;
  title: string;
  message: string;
  errors: string[];
};

function describeIssue(t: Translate, issue: DraftIssue): string {
  switch (issue.code) {
    case "contentEmpty":
      return t("editor.validation.contentEmpty");
    case "titleEmpty":
      return t("editor.validation.titleEmpty");
    case "bannerEmpty":
      return t("editor.validation.bannerEmpty");
    case "previewEmpty":
      return t("editor.validation.previewEmpty");
    case "imageBusy":
      return t("editor.validation.imageBusy");
    case "imageBadChars":
      return t("editor.validation.imageBadChars", { name: issue.name });
    case "imageMissing":
      return t("editor.validation.imageMissing", { name: issue.name });
    case "imageUnused":
      return t("editor.validation.imageUnused", { name: issue.name || t("editor.unnamedImage") });
  }
}

/** Save flow of the editor: validation, confirmation, upload and the resulting modal states. */
export function useSavePost() {
  const { draft, editSession, resetDraft, notifyPostsChanged } = usePostDraft();
  const { t } = useI18n();
  const password = useAdminPassword();
  const { lockIfUnauthorized } = useAdminAuth();
  const [state, setState] = useState<SaveModalState>("closed");
  const [result, setResult] = useState<SaveResult | null>(null);

  function showFailure(message: string, errors: string[] = []) {
    setResult({ succeeded: false, title: t("editor.errorTitle"), message, errors });
    setState("result");
  }

  function open() {
    const issues = validateDraftBeforeSave(draft, Boolean(editSession));

    if (issues.length > 0) {
      showFailure("", issues.map((issue) => describeIssue(t, issue)));
      return;
    }

    setResult(null);
    setState("confirming");
  }

  function close() {
    setState("closed");
  }

  async function confirm() {
    if (!editSession && !draft.banner) {
      showFailure(t("editor.bannerRequired"));
      return;
    }

    setState("submitting");

    try {
      const validTempImages = draft.tempImages.filter(
        (item) => item.storagePath && item.publicUrl && !item.isBusy
      );

      const downloadedImages = await Promise.all(
        validTempImages.map(async (item) => {
          const file = await downloadTempImageAsFile(item.publicUrl as string, item.pendingName || item.name);

          return {
            file,
            name: file.name
          };
        })
      );

      const basePayload = {
        category: draft.category.toUpperCase(),
        title: draft.title,
        preview: draft.preview,
        content_markdown: draft.content_markdown,
        active: draft.active,
        banner: draft.banner,
        images: downloadedImages,
        password
      };

      const response = editSession
        ? await updatePostService({ id: editSession.postId, ...basePayload })
        : await uploadPostService(basePayload);

      if (lockIfUnauthorized(response.status)) {
        return;
      }

      if (response.status >= 200 && response.status < 300) {
        notifyPostsChanged();

        // The post is saved: failing to empty the temp storage must not turn this into an error.
        await clearTempImages(password).catch(() => undefined);

        setResult({
          succeeded: true,
          title: t("editor.successTitle"),
          message: t("editor.successMessage"),
          errors: []
        });
        setState("result");
        return;
      }

      const failure = describeServiceFailure(t, response.status, response.data);
      showFailure(t("editor.failureStatus", { status: response.status }), failure ? [failure] : []);
    } catch (error: unknown) {
      if (lockIfUnauthorized(error)) {
        return;
      }

      showFailure(error instanceof ApiError ? describeError(t, error) : t("editor.unexpectedError"));
    }
  }

  function acknowledge() {
    if (result?.succeeded) {
      resetDraft();
    }

    close();
  }

  return { state, result, isEditing: Boolean(editSession), open, close, confirm, acknowledge };
}
