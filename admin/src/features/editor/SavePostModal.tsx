import AppModal from "../../components/AppModal";
import { useI18n } from "../../i18n";
import type { SaveModalState, SaveResult } from "./useSavePost";

type SavePostModalProps = {
  state: SaveModalState;
  result: SaveResult | null;
  isEditing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onAcknowledge: () => void;
};

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
