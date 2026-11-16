/*
 * Modal shown while the form is being cleared, or with the reason clearing failed.
 * Rendered by EditorPanel.
 */
import AppModal from "../../components/AppModal";
import { useI18n } from "../../i18n";

/** Props of ClearingModal. */
type ClearingModalProps = {
  /** Translated failure message; `null` while clearing is in progress. */
  error: string | null;
  /** Closes the error message. */
  onDismiss: () => void;
};

/**
 * Progress of clearing the form, or the reason it failed.
 *
 * @param props - Component props.
 * @param props.error - Failure message, if any.
 * @param props.onDismiss - Closes the error message.
 * @returns The modal.
 */
export default function ClearingModal({ error, onDismiss }: ClearingModalProps) {
  const { t } = useI18n();

  if (error) {
    return (
      <AppModal title={t("editor.clearErrorTitle")} onClose={onDismiss}>
        <p className="app-modal-text">{error}</p>
        <div className="app-modal-buttons">
          <button type="button" className="editor-panel-button" onClick={onDismiss}>{t("editor.ok")}</button>
        </div>
      </AppModal>
    );
  }

  return (
    <AppModal title={t("editor.clearingTitle")}>
      <p className="app-modal-text">{t("editor.clearingText")}</p>
    </AppModal>
  );
}
