import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { PostCard } from "@mdpc/shared/contracts/loadCards.ts";
import type { PostDetails } from "@mdpc/shared/contracts/loadPost.ts";
import { MarkdownRenderer } from "@mdpc/shared/react";
import loadCardsService from "../services/loadCards";
import deletePostService from "../services/deletePost";
import loadPostService from "../services/loadPost";
import PostDropdownItem from "./PostDropdownItem";
import { usePostDraft } from "../app/postDraftContext";
import { useAdminAuth, useAdminPassword } from "../auth/authContext";
import { ApiError } from "../lib/apiError";
import { getPostsClient } from "../lib/postsClient";
import { useI18n } from "../i18n";
import { describeClientFailure, describeError, describeServiceFailure } from "../i18n/errors";
import AppModal from "./AppModal";
import { clearTempImages, importPostImageToTemp } from "../services/tempImages";
import "../assets/css/PostPreviewPanel.css";

type DropdownPost = {
  id: string;
  title: string;
  bannerUrl: string;
  active: boolean;
  preview?: string;
  postType?: string;
};

type DeleteModalState = "closed" | "confirming" | "submitting" | "result";

function stripExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0) {
    return fileName;
  }

  return fileName.slice(0, dotIndex);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getFileNameFromPath(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? "";
}

function reverseMarkdownImagePaths(markdown: string, imagePaths: string[]): string {
  let result = markdown;

  for (const path of imagePaths) {
    const fileName = getFileNameFromPath(path);
    const shortName = stripExtension(fileName);

    if (!shortName) {
      continue;
    }

    const escapedPath = escapeRegExp(path);
    const regex = new RegExp(`\\(${escapedPath}\\)`, "g");
    result = result.replace(regex, `(${shortName})`);
  }

  return result;
}

function extractRelativeImagePathsFromMarkdown(markdown: string): string[] {
  const paths = new Set<string>();
  const regex = /!\[[^\]]*\]\(([^)]+)\)/g;

  for (const match of markdown.matchAll(regex)) {
    const rawTarget = (match[1] ?? "").trim();
    const target = rawTarget.split(/\s+/)[0] ?? "";

    if (!target) {
      continue;
    }

    // Keep only relative storage-like paths (e.g. <id>/imagem.jpg).
    if (/^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(target) || target.startsWith("data:") || target.startsWith("blob:")) {
      continue;
    }

    if (target.includes("/")) {
      paths.add(target);
    }
  }

  return Array.from(paths);
}

function mapCardsToDropdownPosts(cards: PostCard[]): DropdownPost[] {
  return cards.map((card) => ({
    id: card.id,
    title: card.title,
    bannerUrl: card.banner_url,
    active: card.active,
    preview: card.preview,
    postType: card.post_type,
  }));
}

export default function PostPreviewPanel() {
  const {
    previewMarkdown,
    editSession,
    setPreviewMarkdown,
    setDraftValues,
    startEditSession,
    requestTempReload
  } = usePostDraft();
  const { t } = useI18n();
  const password = useAdminPassword();
  const { lockIfUnauthorized } = useAdminAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [hasLoadedCards, setHasLoadedCards] = useState(false);
  const [cardsError, setCardsError] = useState<string | null>(null);
  const [dropdownPosts, setDropdownPosts] = useState<DropdownPost[]>([]);
  const [deleteModalState, setDeleteModalState] = useState<DeleteModalState>("closed");
  const [deleteTargetPostId, setDeleteTargetPostId] = useState<string | null>(null);
  const [deleteResultTitle, setDeleteResultTitle] = useState("");
  const [deleteResultMessage, setDeleteResultMessage] = useState("");
  const [deleteResultDetails, setDeleteResultDetails] = useState<string | null>(null);
  const [deleteSucceeded, setDeleteSucceeded] = useState(false);
  const [editTargetPost, setEditTargetPost] = useState<DropdownPost | null>(null);
  const [isPreparingEdit, setIsPreparingEdit] = useState(false);
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);

  function handleToggleDropdown() {
    setIsDropdownOpen((prev) => !prev);
  }

  function openEditConfirm(postId: string) {
    const target = dropdownPosts.find((post) => post.id === postId) ?? null;
    setEditTargetPost(target);
    setEditErrorMessage(null);
  }

  function closeEditConfirm() {
    if (isPreparingEdit) {
      return;
    }

    setEditTargetPost(null);
    setEditErrorMessage(null);
  }

  async function handleConfirmEdit() {
    if (!editTargetPost) {
      return;
    }

    setIsPreparingEdit(true);
    setEditErrorMessage(null);

    try {
      await clearTempImages(password);

      const postResult = await loadPostService(editTargetPost.id);

      if (!postResult.ok) {
        throw new ApiError(postResult.status, postResult.error, postResult.details);
      }

      const postData: PostDetails = {
        ...postResult.data,
        image_paths: postResult.data.image_paths.length > 0
          ? postResult.data.image_paths
          : extractRelativeImagePathsFromMarkdown(postResult.data.content_markdown),
      };

      await Promise.all(postData.image_paths.map((path) => importPostImageToTemp(password, path)));

      const editableMarkdown = reverseMarkdownImagePaths(postData.content_markdown, postData.image_paths);

      setDraftValues({
        category: postData.post_type,
        title: postData.title,
        preview: postData.preview,
        content_markdown: editableMarkdown,
        active: postData.active,
        banner: null
      });

      setPreviewMarkdown("");
      startEditSession(postData.id, postData.title);
      requestTempReload();

      setIsDropdownOpen(false);
      setEditTargetPost(null);
    } catch (error: unknown) {
      if (lockIfUnauthorized(error)) {
        return;
      }

      setEditErrorMessage(error instanceof ApiError ? describeError(t, error) : t("preview.prepareUnexpected"));
    } finally {
      setIsPreparingEdit(false);
    }
  }

  useEffect(() => {
    if (!isDropdownOpen || hasLoadedCards) {
      return;
    }

    async function loadCards() {
      setIsLoadingCards(true);
      setCardsError(null);

      try {
        const result = await loadCardsService(password);

        if (!result.ok) {
          if (!lockIfUnauthorized(result.status)) {
            setCardsError(describeClientFailure(t, result));
          }
          return;
        }

        const mappedPosts = mapCardsToDropdownPosts(result.data);

        setDropdownPosts(mappedPosts);
        setHasLoadedCards(true);
      } catch {
        setCardsError(t("preview.loadPostsUnexpected"));
      } finally {
        setIsLoadingCards(false);
      }
    }

    void loadCards();
  }, [hasLoadedCards, isDropdownOpen, password, lockIfUnauthorized, t]);

  function openDeleteModal(postId: string) {
    setDeleteTargetPostId(postId);
    setDeleteResultTitle("");
    setDeleteResultMessage("");
    setDeleteResultDetails(null);
    setDeleteSucceeded(false);
    setDeleteModalState("confirming");
  }

  function closeDeleteModal() {
    setDeleteModalState("closed");
  }

  async function handleConfirmDelete() {
    if (!deleteTargetPostId) {
      setDeleteSucceeded(false);
      setDeleteResultTitle(t("preview.deleteErrorTitle"));
      setDeleteResultMessage(t("preview.deleteNoTarget"));
      setDeleteResultDetails(null);
      setDeleteModalState("result");
      return;
    }

    setDeleteModalState("submitting");

    try {
      const result = await deletePostService(deleteTargetPostId, password);

      if (lockIfUnauthorized(result.status)) {
        return;
      }

      if (result.status >= 200 && result.status < 300) {
        setDeleteSucceeded(true);
        setDeleteResultTitle(t("preview.deleteSuccessTitle"));
        setDeleteResultMessage(t("preview.deleteSuccessMessage"));
        setDeleteResultDetails(null);
        setDeleteModalState("result");
        return;
      }

      setDeleteSucceeded(false);
      setDeleteResultTitle(t("preview.deleteErrorTitle"));
      setDeleteResultMessage(t("preview.deleteFailureStatus", { status: result.status }));
      setDeleteResultDetails(describeServiceFailure(t, result.status, result.data));
      setDeleteModalState("result");
    } catch {
      setDeleteSucceeded(false);
      setDeleteResultTitle(t("preview.deleteErrorTitle"));
      setDeleteResultMessage(t("preview.deleteUnexpected"));
      setDeleteResultDetails(null);
      setDeleteModalState("result");
    }
  }

  function handleDeleteResultOk() {
    if (deleteSucceeded && deleteTargetPostId) {
      setDropdownPosts((prev) => prev.filter((post) => post.id !== deleteTargetPostId));
    }

    closeDeleteModal();
  }

  const visibleDropdownPosts = dropdownPosts.filter((post) => post.id !== editSession?.postId);
  const isActionsDisabled = deleteModalState === "submitting" || isPreparingEdit;

  return (
    <div className={`post-preview-panel${isDropdownOpen ? " is-dropdown-open" : ""}`}>
      <button
        type="button"
        className="post-preview-panel-cards cards_dropdown"
        aria-expanded={isDropdownOpen}
        onClick={handleToggleDropdown}
      >
        <span>{t("preview.viewPosts")}</span>
        <ChevronDown className={`post-preview-panel-dropdown-icon${isDropdownOpen ? " is-open" : ""}`} size={34} />
      </button>

      {isDropdownOpen ? (
        <div className="post-preview-panel-dropdown">
          {isLoadingCards ? (
            <div className="post-preview-panel-dropdown-message">{t("preview.loading")}</div>
          ) : null}

          {!isLoadingCards && cardsError ? (
            <div className="post-preview-panel-dropdown-message">{cardsError}</div>
          ) : null}

          {!isLoadingCards && !cardsError ? (
            <div className="post-preview-panel-dropdown-list">
              {visibleDropdownPosts.map((post) => (
                <PostDropdownItem
                  key={post.id}
                  id={post.id}
                  title={post.title}
                  bannerUrl={post.bannerUrl}
                  isActive={post.active}
                  isActionsDisabled={isActionsDisabled}
                  onDelete={openDeleteModal}
                  onEdit={openEditConfirm}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {!isDropdownOpen ? (
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
      ) : null}

      {editTargetPost ? (
        <AppModal>
          <div className="post-preview-panel-modal" role="dialog" aria-modal="true">
            {!isPreparingEdit ? (
              <>
                <h3 className="post-preview-panel-modal-title">{t("preview.editConfirmTitle")}</h3>
                <p className="post-preview-panel-modal-text">{t("preview.editConfirmText")}                </p>
                {editErrorMessage ? (
                  <p className="post-preview-panel-modal-text">{editErrorMessage}</p>
                ) : null}
                <div className="post-preview-panel-modal-buttons">
                  <button className="post-dropdown-item-action-button" onClick={closeEditConfirm}>{t("preview.no")}</button>
                  <button className="post-dropdown-item-action-button" onClick={() => void handleConfirmEdit()}>{t("preview.yes")}</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="post-preview-panel-modal-title">{t("preview.preparingTitle")}</h3>
                <p className="post-preview-panel-modal-text">{t("preview.loading")}</p>
              </>
            )}
          </div>
        </AppModal>
      ) : null}

      {deleteModalState !== "closed" ? (
        <AppModal>
          <div className="post-preview-panel-modal" role="dialog" aria-modal="true">
            {deleteModalState === "confirming" ? (
              <>
                <h3 className="post-preview-panel-modal-title">{t("preview.deleteConfirmTitle")}</h3>
                <p className="post-preview-panel-modal-text">{t("preview.deleteConfirmText")}</p>
                <div className="post-preview-panel-modal-buttons">
                  <button className="post-dropdown-item-action-button" onClick={closeDeleteModal}>{t("preview.cancel")}</button>
                  <button className="post-dropdown-item-action-button" onClick={handleConfirmDelete}>{t("preview.ok")}</button>
                </div>
              </>
            ) : null}

            {deleteModalState === "submitting" ? (
              <>
                <h3 className="post-preview-panel-modal-title">{t("preview.deletingTitle")}</h3>
                <p className="post-preview-panel-modal-text">{t("preview.loading")}</p>
              </>
            ) : null}

            {deleteModalState === "result" ? (
              <>
                <h3 className="post-preview-panel-modal-title">{deleteResultTitle || t("preview.deleteErrorTitle")}</h3>
                {deleteResultMessage ? (
                  <p className="post-preview-panel-modal-text">{deleteResultMessage}</p>
                ) : null}
                {deleteResultDetails ? (
                  <p className="post-preview-panel-modal-text">{deleteResultDetails}</p>
                ) : null}
                <div className="post-preview-panel-modal-buttons">
                  <button className="post-dropdown-item-action-button" onClick={handleDeleteResultOk}>{t("preview.ok")}</button>
                </div>
              </>
            ) : null}
          </div>
        </AppModal>
      ) : null}
    </div>
  );
}
