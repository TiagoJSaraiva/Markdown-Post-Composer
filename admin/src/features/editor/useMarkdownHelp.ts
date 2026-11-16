import { useState } from "react";
import { usePostDraft } from "../../app/postDraft/postDraftContext";
import { useI18n } from "../../i18n";

/** Inserts the markdown tutorial, asking first when it would replace existing text. */
export function useMarkdownHelp() {
  const { draft, setContentMarkdown, setPreviewMarkdown } = usePostDraft();
  const { t } = useI18n();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  function applyTemplate() {
    setContentMarkdown(t("editor.markdownHelpTemplate"));
    setPreviewMarkdown("");
  }

  function request() {
    if (draft.content_markdown.trim()) {
      setIsConfirmOpen(true);
      return;
    }

    applyTemplate();
  }

  function confirm() {
    applyTemplate();
    setIsConfirmOpen(false);
  }

  function cancel() {
    setIsConfirmOpen(false);
  }

  return { isConfirmOpen, request, confirm, cancel };
}
