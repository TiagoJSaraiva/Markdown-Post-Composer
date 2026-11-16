/*
 * One row of the post dropdown: banner, title, status and the edit and delete buttons.
 */
import { useI18n } from "../../i18n";
import "./PostDropdownItem.css";

/** Props of PostDropdownItem. */
type PostDropdownItemProps = {
  /** Post id, passed back to the callbacks. */
  id: string;
  title: string;
  /** Public URL of the card image; nothing is shown when empty. */
  bannerUrl: string;
  /** Whether the post is published (visible to readers). */
  isActive: boolean;
  /** Disables both buttons. */
  isActionsDisabled?: boolean;
  /** Delete requested. */
  onDelete: (id: string) => void;
  /** Edit requested. */
  onEdit: (id: string) => void;
};

/**
 * A row of the post dropdown.
 *
 * @param props - Component props.
 * @returns The row.
 */
export default function PostDropdownItem({
  id,
  title,
  bannerUrl,
  isActive,
  isActionsDisabled = false,
  onDelete,
  onEdit
}: PostDropdownItemProps) {
  const { t } = useI18n();

  return (
    <div className="post-dropdown-item" data-post-id={id}>
      <div className="post-dropdown-item-image-frame">
        {bannerUrl ? (
          <img className="post-dropdown-item-image" src={bannerUrl} alt={title} loading="lazy" />
        ) : null}
      </div>

      <div className="post-dropdown-item-title" title={title}>
        <span className="post-dropdown-item-title-text">{title}</span>
      </div>

      <div className="post-dropdown-item-actions">
        <div className="post-dropdown-item-actions-buttons">
          <button
            type="button"
            className="post-dropdown-item-action-button"
            onClick={() => onDelete(id)}
            aria-label={`${t("post.delete")}: ${title}`}
            disabled={isActionsDisabled}
          >
            {t("post.delete")}
          </button>
          <button
            type="button"
            className="post-dropdown-item-action-button"
            disabled={isActionsDisabled}
            aria-label={`${t("post.edit")}: ${title}`}
            onClick={() => onEdit(id)}
          >
            {t("post.edit")}
          </button>
        </div>

        <span className={`post-dropdown-item-status ${isActive ? "is-active" : "is-inactive"}`}>
          {isActive ? t("post.active") : t("post.inactive")}
        </span>
      </div>
    </div>
  );
}
