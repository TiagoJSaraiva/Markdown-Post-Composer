import { useI18n } from "../../i18n";
import PostDropdownItem from "./PostDropdownItem";
import type { DropdownPost } from "./usePostList";

type PostDropdownProps = {
  posts: DropdownPost[];
  isLoading: boolean;
  error: string | null;
  isActionsDisabled: boolean;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
};

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
