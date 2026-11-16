/*
 * Hook with the edit-from-dropdown flow: loads a published post into the draft.
 * Used by PostPreviewPanel.
 */
import { useState } from "react";
import type { PostDetails } from "@mdpc/shared/contracts/loadPost.ts";
import { usePostDraft } from "../../app/postDraft/postDraftContext";
import { useAdminAuth, useAdminPassword } from "../../auth/authContext";
import { useI18n } from "../../i18n";
import { describeError } from "../../i18n/errors";
import { ApiError } from "../../lib/apiError";
import loadPostService from "../../services/loadPost";
import { clearTempImages, importPostImageToTemp } from "../../services/tempImages";
import { extractRelativeImagePathsFromMarkdown, reverseMarkdownImagePaths } from "../../utils/markdownImages";
import type { DropdownPost } from "./usePostList";

/**
 * Edit-from-dropdown flow: confirms, discards the current temp images, loads the
 * post, imports its images to temp and fills the draft with local image names.
 *
 * @param posts - Posts of the dropdown, used to find the one requested.
 * @param onPrepared - Called after the draft was filled, e.g. to close the dropdown.
 * @returns `target` (post awaiting confirmation), `isPreparing`, `errorMessage`, and the actions
 * `request` (ask to edit a post id), `cancel` and `confirm` (load the post into the draft).
 */
export function useEditPost(posts: DropdownPost[], onPrepared: () => void) {
  const { setPreviewMarkdown, setDraftValues, startEditSession, requestTempReload } = usePostDraft();
  const { t } = useI18n();
  const password = useAdminPassword();
  const { lockIfUnauthorized } = useAdminAuth();
  const [target, setTarget] = useState<DropdownPost | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function request(postId: string) {
    setTarget(posts.find((post) => post.id === postId) ?? null);
    setErrorMessage(null);
  }

  function cancel() {
    if (isPreparing) {
      return;
    }

    setTarget(null);
    setErrorMessage(null);
  }

  async function confirm() {
    if (!target) {
      return;
    }

    setIsPreparing(true);
    setErrorMessage(null);

    try {
      await clearTempImages(password);

      const postResult = await loadPostService(target.id, password);

      if (!postResult.ok) {
        throw new ApiError(postResult.status, postResult.error, postResult.details);
      }

      const postData: PostDetails = {
        ...postResult.data,
        image_paths: postResult.data.image_paths.length > 0
          ? postResult.data.image_paths
          : extractRelativeImagePathsFromMarkdown(postResult.data.content_markdown)
      };

      await Promise.all(postData.image_paths.map((path) => importPostImageToTemp(password, path)));

      setDraftValues({
        category: postData.post_type,
        title: postData.title,
        preview: postData.preview,
        content_markdown: reverseMarkdownImagePaths(postData.content_markdown, postData.image_paths),
        active: postData.active,
        banner: null
      });

      setPreviewMarkdown("");
      startEditSession(postData.id, postData.title);
      requestTempReload();

      onPrepared();
      setTarget(null);
    } catch (error: unknown) {
      if (lockIfUnauthorized(error)) {
        return;
      }

      // The temp storage may already have been emptied: resync the image list with it.
      requestTempReload();
      setErrorMessage(error instanceof ApiError ? describeError(t, error) : t("preview.prepareUnexpected"));
    } finally {
      setIsPreparing(false);
    }
  }

  return { target, isPreparing, errorMessage, request, cancel, confirm };
}
