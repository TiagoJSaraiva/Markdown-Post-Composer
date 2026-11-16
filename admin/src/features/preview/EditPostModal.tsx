import AppModal from "../../components/AppModal";
import { useI18n } from "../../i18n";

type EditPostModalProps = {
  isPreparing: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function EditPostModal({ isPreparing, errorMessage, onCancel, onConfirm }: EditPostModalProps) {
  const { t } = useI18n();

  if (isPreparing) {
    return (
      <AppModal title={t("preview.preparingTitle")}>
        <p className="app-modal-text">{t("preview.loading")}</p>
      </AppModal>
    );
  }

  return (
    <AppModal title={t("preview.editConfirmTitle")}>
      <p className="app-modal-text">{t("preview.editConfirmText")}</p>
      {errorMessage ? <p className="app-modal-text">{errorMessage}</p> : null}
      <div className="app-modal-buttons">
        <button type="button" className="post-dropdown-item-action-button" onClick={onCancel}>{t("preview.no")}</button>
        <button type="button" className="post-dropdown-item-action-button" onClick={onConfirm}>{t("preview.yes")}</button>
      </div>
    </AppModal>
  );
}
