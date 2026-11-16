import { usePostDraft } from "../../app/postDraft/postDraftContext";
import { useAdminAuth } from "../../auth/authContext";
import { getConfig } from "../../config/env";
import { useI18n } from "../../i18n";
import { buildPreviewMarkdown } from "../../utils/draft";
import ClearingModal from "./ClearingModal";
import EditorToolbar from "./EditorToolbar";
import ReplaceContentModal from "./ReplaceContentModal";
import SavePostModal from "./SavePostModal";
import { useClearForm } from "./useClearForm";
import { useMarkdownHelp } from "./useMarkdownHelp";
import { useSavePost } from "./useSavePost";
import { useUnsavedChangesGuard } from "./useUnsavedChangesGuard";
import "./EditorPanel.css";

export default function EditorPanel() {
  const { draft, editSession, setContentMarkdown, setPreviewMarkdown } = usePostDraft();
  const { t } = useI18n();
  const { lock } = useAdminAuth();
  const { siteUrl } = getConfig();
  useUnsavedChangesGuard();
  const clearForm = useClearForm();
  const help = useMarkdownHelp();
  const save = useSavePost();

  return (
    <div className="editor-panel">
      <div className="editor-panel-header">
        {editSession ? (
          <>
            <span className="editor-panel-header-prefix">{t("editor.editing")}</span>
            <div className="editor-panel-header-title" title={editSession.postTitle}>
              <span className="editor-panel-header-title-text">{editSession.postTitle}</span>
            </div>
          </>
        ) : t("editor.newPost")}
      </div>

      <textarea
        className="editor-panel-area"
        value={draft.content_markdown}
        onChange={(event) => setContentMarkdown(event.target.value)}
      ></textarea>

      <EditorToolbar
        isEditing={Boolean(editSession)}
        siteUrl={siteUrl}
        onSave={save.open}
        onCancelEdit={() => void clearForm.cancelEdit()}
        onPreview={() => setPreviewMarkdown(buildPreviewMarkdown(draft.content_markdown, draft.tempImages))}
        onHelp={help.request}
        onClear={() => void clearForm.clearAll()}
        onLock={lock}
      />

      {help.isConfirmOpen ? <ReplaceContentModal onCancel={help.cancel} onContinue={help.confirm} /> : null}
      {clearForm.isClearing || clearForm.error ? (
        <ClearingModal error={clearForm.error} onDismiss={clearForm.dismissError} />
      ) : null}
      <SavePostModal
        state={save.state}
        result={save.result}
        isEditing={save.isEditing}
        onCancel={save.close}
        onConfirm={() => void save.confirm()}
        onAcknowledge={save.acknowledge}
      />
    </div>
  );
}
