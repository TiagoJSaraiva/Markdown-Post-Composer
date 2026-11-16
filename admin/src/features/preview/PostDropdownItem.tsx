import { useI18n } from "../../i18n";
import "./PostDropdownItem.css";

type PostDropdownItemProps = {
  id: string;
  title: string;
  bannerUrl: string;
  isActive: boolean;
  isActionsDisabled?: boolean;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
};

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
            disabled={isActionsDisabled}
          >
            {t("post.delete")}
          </button>
          <button
            type="button"
            className="post-dropdown-item-action-button"
            disabled={isActionsDisabled}
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
