/*
 * Confirmation shown before the markdown tutorial replaces the text already written.
 * Rendered by EditorPanel, driven by useMarkdownHelp.
 */
import AppModal from "../../components/AppModal";
import { useI18n } from "../../i18n";

/** Props of ReplaceContentModal. */
type ReplaceContentModalProps = {
  /** Keeps the current text. */
  onCancel: () => void;
  /** Replaces the text with the tutorial. */
  onContinue: () => void;
};

/**
 * Asks before the markdown tutorial replaces the text already written.
 *
 * @param props - Component props.
 * @param props.onCancel - Keeps the current text.
 * @param props.onContinue - Replaces the text with the tutorial.
 * @returns The modal.
 */
export default function ReplaceContentModal({ onCancel, onContinue }: ReplaceContentModalProps) {
  const { t } = useI18n();

  return (
    <AppModal title={t("editor.replaceTitle")} onClose={onCancel}>
      <p className="app-modal-text">{t("editor.replaceText")}</p>
      <div className="app-modal-buttons">
        <button type="button" className="editor-panel-button" onClick={onCancel}>{t("editor.cancel")}</button>
        <button type="button" className="editor-panel-button" onClick={onContinue}>{t("editor.continue")}</button>
      </div>
    </AppModal>
  );
}
