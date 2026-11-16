/*
 * Dropdown listing the published posts with their edit and delete actions.
 * Rendered by PostPreviewPanel; data comes from usePostList.
 */
import { useI18n } from "../../i18n";
import PostDropdownItem from "./PostDropdownItem";
import type { DropdownPost } from "./usePostList";

/** Props of PostDropdown. */
type PostDropdownProps = {
  /** Posts to list. */
  posts: DropdownPost[];
  /** Shows the loading message instead of the list. */
  isLoading: boolean;
  /** Translated load failure; shown instead of the list. */
  error: string | null;
  /** Disables every item action (a delete or edit is in progress). */
  isActionsDisabled: boolean;
  /** Delete requested for a post id. */
  onDelete: (id: string) => void;
  /** Edit requested for a post id. */
  onEdit: (id: string) => void;
};

/**
 * List of posts, or its loading and error state.
 *
 * @param props - Component props.
 * @returns The dropdown.
 */
export default function PostDropdown({ posts, isLoading, error, isActionsDisabled, onDelete, onEdit }: PostDropdownProps) {
  const { t } = useI18n();

  return (
    <div className="post-preview-panel-dropdown">
      {isLoading ? (
        <div className="post-preview-panel-dropdown-message">{t("preview.loading")}</div>
      ) : null}

      {!isLoading && error ? (
        <div className="post-preview-panel-dropdown-message">{error}</div>
      ) : null}

      {!isLoading && !error ? (
        <div className="post-preview-panel-dropdown-list">
          {posts.map((post) => (
            <PostDropdownItem
              key={post.id}
              id={post.id}
              title={post.title}
              bannerUrl={post.bannerUrl}
              isActive={post.active}
              isActionsDisabled={isActionsDisabled}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
