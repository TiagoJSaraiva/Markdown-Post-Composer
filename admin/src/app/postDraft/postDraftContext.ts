/*
 * Context, value type and consumer hook of the post draft. The draft is shared by the
 * editor, form and preview panels; PostDraftProvider supplies the value.
 */
import { createContext, useContext } from "react";
import type { PostDraftState, TempImageItem } from "../../utils/draft";

/** Re-exported so consumers import the draft types from the context module. */
export type { PostDraftState, TempImageItem };

/** Identifies the published post that is currently being edited. */
export type EditSession = {
  postId: string;
  postTitle: string;
};

/** Everything the draft context exposes: state plus the actions that change it. */
export type PostDraftContextValue = {
  /** The post being composed. */
  draft: PostDraftState;
  /** Markdown shown in the preview panel (images already mapped to public URLs); empty hides it. */
  previewMarkdown: string;
  /** Set while an existing post is being edited, `null` when composing a new one. */
  editSession: EditSession | null;
  /** Changes whenever the temp image list must be reloaded from the backend. */
  tempReloadToken: number;
  /** Changes whenever the list of published posts is known to be stale. */
  postListVersion: number;
  /** Sets the post category. */
  setCategory: (category: string) => void;
  /** Sets the post title. */
  setTitle: (title: string) => void;
  /** Sets the excerpt shown on the post card. */
  setPreview: (preview: string) => void;
  /** Sets the markdown body. */
  setContentMarkdown: (content: string) => void;
  /** Sets whether the post is published (visible to readers). */
  setActive: (active: boolean) => void;
  /** Sets the card image file, or clears it with `null`. */
  setBanner: (banner: File | null) => void;
  /** Replaces the temp image list with the result of `update`, which receives the current list. */
  updateTempImages: (update: (items: TempImageItem[]) => TempImageItem[]) => void;
  /** Sets the markdown shown in the preview panel. */
  setPreviewMarkdown: (markdown: string) => void;
  /** Merges the given fields into the draft. */
  setDraftValues: (values: Partial<PostDraftState>) => void;
  /** Marks a published post as the one being edited. */
  startEditSession: (postId: string, postTitle: string) => void;
  /** Leaves the edit session without touching the draft. */
  clearEditSession: () => void;
  /** Asks the form panel to reload the temp images from the backend. */
  requestTempReload: () => void;
  /** Back to an empty new post: draft, preview and edit session; temp images are reloaded. */
  resetDraft: () => void;
  /** Marks the published post list as stale so it is fetched again when next shown. */
  notifyPostsChanged: () => void;
};

/** Context holding the post draft; `null` outside PostDraftProvider. */
export const PostDraftContext = createContext<PostDraftContextValue | null>(null);

/**
 * Reads the post draft context.
 *
 * @returns The draft state and its actions.
 * @throws Error when used outside PostDraftProvider.
 */
export function usePostDraft() {
  const context = useContext(PostDraftContext);

  if (!context) {
    throw new Error("usePostDraft must be used within PostDraftProvider");
  }

  return context;
}
