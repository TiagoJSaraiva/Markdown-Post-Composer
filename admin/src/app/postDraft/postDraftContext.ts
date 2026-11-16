import { createContext, useContext } from "react";
import type { PostDraftState, TempImageItem } from "../../utils/draft";

export type { PostDraftState, TempImageItem };

export type EditSession = {
  postId: string;
  postTitle: string;
};

export type PostDraftContextValue = {
  draft: PostDraftState;
  previewMarkdown: string;
  editSession: EditSession | null;
  tempReloadToken: number;
  /** Changes whenever the list of published posts is known to be stale. */
  postListVersion: number;
  setCategory: (category: string) => void;
  setTitle: (title: string) => void;
  setPreview: (preview: string) => void;
  setContentMarkdown: (content: string) => void;
  setActive: (active: boolean) => void;
  setBanner: (banner: File | null) => void;
  updateTempImages: (update: (items: TempImageItem[]) => TempImageItem[]) => void;
  setPreviewMarkdown: (markdown: string) => void;
  setDraftValues: (values: Partial<PostDraftState>) => void;
  startEditSession: (postId: string, postTitle: string) => void;
  clearEditSession: () => void;
  requestTempReload: () => void;
  /** Back to an empty new post: draft, preview and edit session; temp images are reloaded. */
  resetDraft: () => void;
  notifyPostsChanged: () => void;
};

export const PostDraftContext = createContext<PostDraftContextValue | null>(null);

export function usePostDraft() {
  const context = useContext(PostDraftContext);

  if (!context) {
    throw new Error("usePostDraft must be used within PostDraftProvider");
  }

  return context;
}
