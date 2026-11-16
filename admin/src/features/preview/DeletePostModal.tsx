/*
 * Modal of the delete flow (confirm, deleting, result). Rendered by PostPreviewPanel from
 * the state returned by useDeletePost.
 */
import AppModal from "../../components/AppModal";
import { useI18n } from "../../i18n";
import type { DeleteModalState, DeleteResult } from "./useDeletePost";

/** Props of DeletePostModal. */
type DeletePostModalProps = {
  /** Step of the flow to show; nothing is rendered when closed. */
  state: DeleteModalState;
  /** Outcome shown in the `result` step. */
  result: DeleteResult | null;
  /** Closes the confirmation. */
  onCancel: () => void;
  /** Deletes the post. */
  onConfirm: () => void;
  /** Closes the result. */
  onAcknowledge: () => void;
};

/**
 * Modal for the current step of the delete flow.
 *
 * @param props - Component props.
 * @returns The modal, or `null` while the flow is closed.
 */
export default function DeletePostModal({ state, result, onCancel, onConfirm, onAcknowledge }: DeletePostModalProps) {
  const { t } = useI18n();

  if (state === "closed") {
    return null;
  }

  if (state === "confirming") {
    return (
      <AppModal title={t("preview.deleteConfirmTitle")} onClose={onCancel}>
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
    <AppModal title={result?.title || t("preview.deleteErrorTitle")} onClose={onAcknowledge}>
      {result?.message ? <p className="app-modal-text">{result.message}</p> : null}
      {result?.details ? <p className="app-modal-text">{result.details}</p> : null}
      <div className="app-modal-buttons">
        <button type="button" className="post-dropdown-item-action-button" onClick={onAcknowledge}>{t("preview.ok")}</button>
      </div>
    </AppModal>
  );
}
