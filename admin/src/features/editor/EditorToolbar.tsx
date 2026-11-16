/*
 * Button row under the editor (save, cancel edit, preview, help, clear, website, lock).
 * Purely presentational; EditorPanel wires the actions.
 */
import { Globe, Lock } from "lucide-react";
import broomIcon from "../../assets/img/broom.png";
import { useI18n } from "../../i18n";

/** Props of EditorToolbar. */
type EditorToolbarProps = {
  /** Shows the cancel-edit button while an existing post is being edited. */
  isEditing: boolean;
  /** Public website URL; the website button is hidden when empty. */
  siteUrl: string;
  /** Starts the save flow. */
  onSave: () => void;
  /** Abandons the current edit session. */
  onCancelEdit: () => void;
  /** Renders the markdown in the preview panel. */
  onPreview: () => void;
  /** Inserts the markdown tutorial. */
  onHelp: () => void;
  /** Empties the form. */
  onClear: () => void;
  /** Forgets the password and shows the unlock screen. */
  onLock: () => void;
};

/**
 * Toolbar of the editor panel.
 *
 * @param props - Component props.
 * @returns The button row.
 */
export default function EditorToolbar({
  isEditing,
  siteUrl,
  onSave,
  onCancelEdit,
  onPreview,
  onHelp,
  onClear,
  onLock
}: EditorToolbarProps) {
  const { t } = useI18n();

  return (
    <div className="editor-panel-buttons">
      <div className="editor-panel-buttons-left">
        <button type="button" className="editor-panel-button" onClick={onSave}>{t("editor.save")}</button>
        {isEditing ? (
          <button type="button" className="editor-panel-button" onClick={onCancelEdit}>{t("editor.cancel")}</button>
        ) : null}
        <button type="button" className="editor-panel-button" onClick={onPreview}>{t("editor.preview")}</button>
      </div>

      <div className="editor-panel-buttons-right">
        <button
          type="button"
          className="editor-panel-button editor-panel-icon-button"
          aria-label={t("editor.markdownHelp")}
          onClick={onHelp}
        >
          ?
        </button>
        <button
          type="button"
          className="editor-panel-button editor-panel-icon-button"
          aria-label={t("editor.clear")}
          onClick={onClear}
        >
          <img src={broomIcon} alt="" className="editor-panel-icon-image" />
        </button>
        {siteUrl ? (
          <button
            type="button"
            className="editor-panel-button editor-panel-icon-button"
            aria-label={t("editor.website")}
            onClick={() => window.open(siteUrl, "_blank", "noopener,noreferrer")}
          >
            <Globe size={16} />
          </button>
        ) : null}
        <button
          type="button"
          className="editor-panel-button editor-panel-icon-button"
          aria-label={t("editor.lock")}
          title={t("editor.lock")}
          onClick={onLock}
        >
          <Lock size={16} />
        </button>
      </div>
    </div>
  );
}
