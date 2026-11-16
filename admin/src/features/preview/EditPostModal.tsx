/*
 * Modal of the edit-from-dropdown flow (confirmation, preparing, error). Rendered by
 * PostPreviewPanel from the state returned by useEditPost.
 */
import AppModal from "../../components/AppModal";
import { useI18n } from "../../i18n";

/** Props of EditPostModal. */
type EditPostModalProps = {
  /** True while the post is being loaded; shows progress instead of the question. */
  isPreparing: boolean;
  /** Translated failure message of the last attempt. */
  errorMessage: string | null;
  /** Closes the modal. */
  onCancel: () => void;
  /** Starts preparing the post for editing. */
  onConfirm: () => void;
};

/**
 * Asks to edit a post (discarding the current draft) or shows the preparation progress.
 *
 * @param props - Component props.
 * @returns The modal.
 */
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
    <AppModal title={t("preview.editConfirmTitle")} onClose={onCancel}>
      <p className="app-modal-text">{t("preview.editConfirmText")}</p>
      {errorMessage ? <p className="app-modal-text">{errorMessage}</p> : null}
      <div className="app-modal-buttons">
        <button type="button" className="post-dropdown-item-action-button" onClick={onCancel}>{t("preview.no")}</button>
        <button type="button" className="post-dropdown-item-action-button" onClick={onConfirm}>{t("preview.yes")}</button>
      </div>
    </AppModal>
  );
}
