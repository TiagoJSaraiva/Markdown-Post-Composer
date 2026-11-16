import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { MarkdownRenderer } from "@mdpc/shared/react";
import { usePostDraft } from "../../app/postDraft/postDraftContext";
import { useI18n } from "../../i18n";
import { getPostsClient } from "../../lib/postsClient";
import DeletePostModal from "./DeletePostModal";
import EditPostModal from "./EditPostModal";
import PostDropdown from "./PostDropdown";
import { useDeletePost } from "./useDeletePost";
import { useEditPost } from "./useEditPost";
import { usePostList } from "./usePostList";
import "./PostPreviewPanel.css";

export default function PostPreviewPanel() {
  const { previewMarkdown, editSession } = usePostDraft();
  const { t } = useI18n();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const postList = usePostList(isDropdownOpen);
  const editPost = useEditPost(postList.posts, () => setIsDropdownOpen(false));
  const deletePost = useDeletePost(postList.removePost);

  const visiblePosts = postList.posts.filter((post) => post.id !== editSession?.postId);
  const isActionsDisabled = deletePost.isSubmitting || editPost.isPreparing;

  return (
    <div className={`post-preview-panel${isDropdownOpen ? " is-dropdown-open" : ""}`}>
      <button
        type="button"
        className="post-preview-panel-cards cards_dropdown"
        aria-expanded={isDropdownOpen}
        onClick={() => setIsDropdownOpen((prev) => !prev)}
      >
        <span>{t("preview.viewPosts")}</span>
        <ChevronDown className={`post-preview-panel-dropdown-icon${isDropdownOpen ? " is-open" : ""}`} size={34} />
      </button>

      {isDropdownOpen ? (
        <PostDropdown
          posts={visiblePosts}
          isLoading={postList.isLoading}
          error={postList.error}
          isActionsDisabled={isActionsDisabled}
          onDelete={deletePost.open}
          onEdit={editPost.request}
        />
      ) : (
        <div className="post-preview-panel-content post_preview">
          {previewMarkdown.trim() ? (
            <MarkdownRenderer
              markdown={previewMarkdown}
              className="post-preview-panel-markdown"
              client={getPostsClient()}
            />
          ) : (
            <div>{t("preview.placeholder")}</div>
          )}
        </div>
      )}

      {editPost.target ? (
        <EditPostModal
          isPreparing={editPost.isPreparing}
          errorMessage={editPost.errorMessage}
          onCancel={editPost.cancel}
          onConfirm={() => void editPost.confirm()}
        />
      ) : null}

      <DeletePostModal
        state={deletePost.state}
        result={deletePost.result}
        onCancel={deletePost.close}
        onConfirm={() => void deletePost.confirm()}
        onAcknowledge={deletePost.acknowledge}
      />
    </div>
  );
}
