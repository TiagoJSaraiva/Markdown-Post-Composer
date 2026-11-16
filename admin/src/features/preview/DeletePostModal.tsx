import AppModal from "../../components/AppModal";
import { useI18n } from "../../i18n";
import type { DeleteModalState, DeleteResult } from "./useDeletePost";

type DeletePostModalProps = {
  state: DeleteModalState;
  result: DeleteResult | null;
  onCancel: () => void;
  onConfirm: () => void;
  onAcknowledge: () => void;
};

export default function DeletePostModal({ state, result, onCancel, onConfirm, onAcknowledge }: DeletePostModalProps) {
  const { t } = useI18n();

  if (state === "closed") {
    return null;
  }

  if (state === "confirming") {
    return (
      <AppModal title={t("preview.deleteConfirmTitle")}>
        <p className="app-modal-text">{t("preview.deleteConfirmText")}</p>
        <div className="app-modal-buttons">
          <button type="button" className="post-dropdown-item-action-button" onClick={onCancel}>{t("preview.cancel")}</button>
          <button type="button" className="post-dropdown-item-action-button" onClick={onConfirm}>{t("preview.ok")}</button>
        </div>
      </AppModal>
    );
  }

  if (state === "submitting") {
    return (
      <AppModal title={t("preview.deletingTitle")}>
        <p className="app-modal-text">{t("preview.loading")}</p>
      </AppModal>
    );
  }

  return (
    <AppModal title={result?.title || t("preview.deleteErrorTitle")}>
      {result?.message ? <p className="app-modal-text">{result.message}</p> : null}
      {result?.details ? <p className="app-modal-text">{result.details}</p> : null}
      <div className="app-modal-buttons">
        <button type="button" className="post-dropdown-item-action-button" onClick={onAcknowledge}>{t("preview.ok")}</button>
      </div>
    </AppModal>
  );
}
