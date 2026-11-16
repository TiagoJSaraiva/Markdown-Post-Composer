/*
 * Modal of the save flow (confirm, saving, result). Rendered by EditorPanel from the
 * state returned by useSavePost.
 */
import AppModal from "../../components/AppModal";
import { useI18n } from "../../i18n";
import type { SaveModalState, SaveResult } from "./useSavePost";

/** Props of SavePostModal. */
type SavePostModalProps = {
  /** Step of the flow to show; nothing is rendered when closed. */
  state: SaveModalState;
  /** Outcome shown in the `result` step. */
  result: SaveResult | null;
  /** Selects the confirmation text for updating instead of creating. */
  isEditing: boolean;
  /** Closes the confirmation. */
  onCancel: () => void;
  /** Sends the post. */
  onConfirm: () => void;
  /** Closes the result. */
  onAcknowledge: () => void;
};

/**
 * Modal for the current step of the save flow.
 *
 * @param props - Component props.
 * @returns The modal, or `null` while the flow is closed.
 */
export default function SavePostModal({
  state,
  result,
  isEditing,
  onCancel,
  onConfirm,
  onAcknowledge
}: SavePostModalProps) {
  const { t } = useI18n();

  if (state === "closed") {
    return null;
  }

  if (state === "confirming") {
    return (
      <AppModal title={t("editor.saveConfirmTitle")} onClose={onCancel}>
        <p className="app-modal-text">
          {isEditing ? t("editor.saveConfirmEdit") : t("editor.saveConfirmCreate")}
        </p>
        <div className="app-modal-buttons">
          <button type="button" className="editor-panel-button" onClick={onCancel}>{t("editor.cancel")}</button>
          <button type="button" className="editor-panel-button" onClick={onConfirm} autoFocus>{t("editor.ok")}</button>
        </div>
      </AppModal>
    );
  }

  if (state === "submitting") {
    return (
      <AppModal title={t("editor.savingTitle")}>
        <p className="app-modal-text">{t("editor.savingText")}</p>
      </AppModal>
    );
  }

  const succeeded = result?.succeeded ?? false;
  const title = result?.title || (succeeded ? t("editor.successTitle") : t("editor.errorTitle"));

  return (
    <AppModal title={title} onClose={onAcknowledge}>
      {result?.message ? <p className="app-modal-text">{result.message}</p> : null}
      {result && result.errors.length > 0 ? (
        <ul className="app-modal-error-list">
          {result.errors.map((error) => (
            <li key={error} className="app-modal-text">{error}</li>
          ))}
        </ul>
      ) : null}
      <div className="app-modal-buttons">
        <button type="button" className="editor-panel-button" onClick={onAcknowledge}>{t("editor.ok")}</button>
      </div>
    </AppModal>
  );
}
