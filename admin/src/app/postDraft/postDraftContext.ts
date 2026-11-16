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
};

export const PostDraftContext = createContext<PostDraftContextValue | null>(null);

export function usePostDraft() {
  const context = useContext(PostDraftContext);

  if (!context) {
    throw new Error("usePostDraft must be used within PostDraftProvider");
  }

  return context;
}
