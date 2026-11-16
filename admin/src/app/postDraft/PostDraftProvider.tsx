/*
 * Holds the post draft state and provides it through PostDraftContext.
 * Mounted by App above the auth gate so locking the app keeps the draft.
 */
import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getConfig } from "../../config/env";
import { createEmptyDraft } from "../../utils/draft";
import {
  PostDraftContext,
  type EditSession,
  type PostDraftContextValue,
  type PostDraftState,
  type TempImageItem
} from "./postDraftContext";

/**
 * Provides the post draft and its actions to the tree below.
 *
 * @param props - Component props.
 * @param props.children - Subtree that consumes the draft.
 * @returns The context provider.
 */
export function PostDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<PostDraftState>(() => createEmptyDraft(getConfig().defaultCategory));
  const [previewMarkdown, setPreviewMarkdown] = useState("");
  const [editSession, setEditSession] = useState<EditSession | null>(null);
  const [tempReloadToken, setTempReloadToken] = useState(0);
  const [postListVersion, setPostListVersion] = useState(0);

  const setCategory = useCallback((category: string) => {
    setDraft((prev) => ({ ...prev, category }));
  }, []);

  const setTitle = useCallback((title: string) => {
    setDraft((prev) => ({ ...prev, title }));
  }, []);

  const setPreview = useCallback((preview: string) => {
    setDraft((prev) => ({ ...prev, preview }));
  }, []);

  const setContentMarkdown = useCallback((content_markdown: string) => {
    setDraft((prev) => ({ ...prev, content_markdown }));
  }, []);

  const setActive = useCallback((active: boolean) => {
    setDraft((prev) => ({ ...prev, active }));
  }, []);

  const setBanner = useCallback((banner: File | null) => {
    setDraft((prev) => ({ ...prev, banner }));
  }, []);

  const updateTempImages = useCallback((update: (items: TempImageItem[]) => TempImageItem[]) => {
    setDraft((prev) => ({ ...prev, tempImages: update(prev.tempImages) }));
  }, []);

  const setDraftValues = useCallback((values: Partial<PostDraftState>) => {
    setDraft((prev) => ({ ...prev, ...values }));
  }, []);

  const startEditSession = useCallback((postId: string, postTitle: string) => {
    setEditSession({ postId, postTitle });
  }, []);

  const clearEditSession = useCallback(() => {
    setEditSession(null);
  }, []);

  const requestTempReload = useCallback(() => {
    setTempReloadToken((prev) => prev + 1);
  }, []);

  const notifyPostsChanged = useCallback(() => {
    setPostListVersion((prev) => prev + 1);
  }, []);

  const resetDraft = useCallback(() => {
    setDraft(createEmptyDraft(getConfig().defaultCategory));
    setPreviewMarkdown("");
    setEditSession(null);
    setTempReloadToken((prev) => prev + 1);
  }, []);

  const value = useMemo<PostDraftContextValue>(() => ({
    draft,
    previewMarkdown,
    editSession,
    tempReloadToken,
    postListVersion,
    setCategory,
    setTitle,
    setPreview,
    setContentMarkdown,
    setActive,
    setBanner,
    updateTempImages,
    setPreviewMarkdown,
    setDraftValues,
    startEditSession,
    clearEditSession,
    requestTempReload,
    resetDraft,
    notifyPostsChanged
  }), [
    draft,
    previewMarkdown,
    editSession,
    tempReloadToken,
    postListVersion,
    setCategory,
    setTitle,
    setPreview,
    setContentMarkdown,
    setActive,
    setBanner,
    updateTempImages,
    setPreviewMarkdown,
    setDraftValues,
    startEditSession,
    clearEditSession,
    requestTempReload,
    resetDraft,
    notifyPostsChanged
  ]);

  return (
    <PostDraftContext.Provider value={value}>
      {children}
    </PostDraftContext.Provider>
  );
}
