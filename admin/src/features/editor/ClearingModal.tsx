import AppModal from "../../components/AppModal";
import { useI18n } from "../../i18n";

type ClearingModalProps = {
  error: string | null;
  onDismiss: () => void;
};

/** Progress of clearing the form, or the reason it failed. */
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
