import { useEffect, useRef, useState } from "react";
import { Globe, Lock } from "lucide-react";
import broomIcon from "../assets/img/broom.png";
import { usePostDraft, type PostDraftState } from "../app/postDraftContext";
import { ApiError } from "../lib/apiError";
import { useAdminAuth, useAdminPassword } from "../auth/authContext";
import { getConfig } from "../config/env";
import { useI18n, type Translate } from "../i18n";
import { describeError, describeServiceFailure } from "../i18n/errors";
import AppModal from "./AppModal";
import {
  clearTempImages,
  deleteTempImage,
  downloadTempImageAsFile
} from "../services/tempImages";
import uploadPostService from "../services/uploadPost";
import updatePostService from "../services/updatePost";
import "../assets/css/EditorPanel.css";

type SaveModalState = "closed" | "confirming" | "submitting" | "result";
const IMAGE_NAME_ALLOWED = /^[A-Za-z0-9]+$/;
type MarkdownImageRef = {
  raw: string;
  normalized: string;
  normalizedNoExt: string;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getFileNameFromPath(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? "";
}

function stripExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0) {
    return fileName;
  }

  return fileName.slice(0, dotIndex);
}

function normalizeRefName(raw: string): string {
  const trimmed = raw.trim().replace(/^['"]|['"]$/g, "");
  const withoutHash = trimmed.split("#")[0] ?? "";
  const withoutQuery = withoutHash.split("?")[0] ?? "";
  const lastSegment = withoutQuery.split("/").filter(Boolean).pop() ?? withoutQuery;

  return lastSegment.trim();
}

function isAbsoluteOrSpecialUrl(url: string): boolean {
  return /^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(url) ||
    url.startsWith("data:") ||
    url.startsWith("blob:") ||
    url.startsWith("mailto:") ||
    url.startsWith("tel:") ||
    url.startsWith("#");
}

function getMarkdownImageReferences(markdown: string): MarkdownImageRef[] {
  const refs: MarkdownImageRef[] = [];
  const regex = /!\[[^\]]*\]\(([^)]+)\)/g;

  for (const match of markdown.matchAll(regex)) {
    const rawTarget = (match[1] ?? "").trim();
    const mainTarget = rawTarget.split(/\s+/)[0] ?? "";

    if (!mainTarget || isAbsoluteOrSpecialUrl(mainTarget)) {
      continue;
    }

    const normalized = normalizeRefName(mainTarget);
    if (!normalized) {
      continue;
    }

    refs.push({
      raw: normalized,
      normalized,
      normalizedNoExt: stripExtension(normalized)
    });
  }

  return refs;
}

function getImageAliases(item: PostDraftState["tempImages"][number]): string[] {
  const names = [item.pendingName, item.name]
    .map((value) => value.trim())
    .filter(Boolean);

  if (item.storagePath) {
    const fileName = getFileNameFromPath(item.storagePath).trim();
    if (fileName) {
      names.push(fileName, stripExtension(fileName));
    }
  }

  return Array.from(new Set(names));
}

function validateDraftBeforeSave(draft: PostDraftState, isEditing: boolean, t: Translate): string[] {
  const errors = new Set<string>();

  if (!draft.content_markdown.trim()) {
    errors.add(t("editor.validation.contentEmpty"));
  }

  if (!draft.title.trim()) {
    errors.add(t("editor.validation.titleEmpty"));
  }

  if (!isEditing && !draft.banner) {
    errors.add(t("editor.validation.bannerEmpty"));
  }

  if (!draft.preview.trim()) {
    errors.add(t("editor.validation.previewEmpty"));
  }

  const markdownImageRefs = getMarkdownImageReferences(draft.content_markdown);
  const markdownRefsSet = new Set(markdownImageRefs.map((ref) => ref.normalized));
  const markdownRefsNoExtSet = new Set(markdownImageRefs.map((ref) => ref.normalizedNoExt));
  const activeImages = draft.tempImages.filter((item) => Boolean(item.storagePath));

  const imageAliasSet = new Set<string>();
  const imageAliasNoExtSet = new Set<string>();

  for (const item of activeImages) {
    const aliases = getImageAliases(item);
    const displayName = (item.pendingName || item.name).trim();

    if (displayName && !IMAGE_NAME_ALLOWED.test(displayName)) {
      errors.add(t("editor.validation.imageBadChars", { name: displayName }));
    }

    for (const alias of aliases) {
      imageAliasSet.add(alias);
      imageAliasNoExtSet.add(stripExtension(alias));
    }

    const used = aliases.some((alias) => markdownRefsSet.has(alias) || markdownRefsNoExtSet.has(stripExtension(alias)));

    if (!used) {
      errors.add(t("editor.validation.imageUnused", { name: displayName || aliases[0] || t("editor.unnamedImage") }));
    }
  }

  for (const ref of markdownImageRefs) {
    if (!IMAGE_NAME_ALLOWED.test(ref.normalizedNoExt)) {
      errors.add(t("editor.validation.imageBadChars", { name: ref.raw }));
    }

    const exists = imageAliasSet.has(ref.normalized) || imageAliasNoExtSet.has(ref.normalizedNoExt);

    if (!exists) {
      errors.add(t("editor.validation.imageMissing", { name: ref.raw }));
    }
  }

  return Array.from(errors);
}

function hasPendingDraftChanges(draft: PostDraftState, isEditing: boolean, defaultCategory: string): boolean {
  if (isEditing) {
    return true;
  }

  if (draft.category !== defaultCategory) {
    return true;
  }

  if (!draft.active) {
    return true;
  }

  if (draft.title.trim() || draft.preview.trim() || draft.content_markdown.trim()) {
    return true;
  }

  if (draft.banner) {
    return true;
  }

  return draft.tempImages.some((item) => Boolean(item.storagePath));
}

function buildPreviewMarkdown(
  contentMarkdown: string,
  tempImages: Array<{
    name: string;
    pendingName: string;
    storagePath: string | null;
    publicUrl: string | null;
  }>
): string {
  let result = contentMarkdown;

  for (const item of tempImages) {
    if (!item.storagePath || !item.publicUrl) {
      continue;
    }

    const fullFileName = getFileNameFromPath(item.storagePath);
    const aliases = [item.name, item.pendingName, fullFileName]
      .map((value) => value.trim())
      .filter(Boolean);

    for (const alias of aliases) {
      const safeAlias = escapeRegExp(alias);
      const regex = new RegExp(`\\(${safeAlias}\\)`, "g");
      result = result.replace(regex, `(${item.publicUrl})`);
    }
  }

  return result;
}

export default function EditorPanel() {
  const {
    draft,
    editSession,
    setContentMarkdown,
    setPreviewMarkdown,
    setDraftValues,
    requestTempReload
  } = usePostDraft();
  const { t } = useI18n();
  const password = useAdminPassword();
  const { lock, lockIfUnauthorized } = useAdminAuth();
  const { defaultCategory, siteUrl } = getConfig();
  const [saveModalState, setSaveModalState] = useState<SaveModalState>("closed");
  const [saveResultTitle, setSaveResultTitle] = useState("");
  const [saveResultMessage, setSaveResultMessage] = useState("");
  const [saveErrorList, setSaveErrorList] = useState<string[]>([]);
  const [saveSucceeded, setSaveSucceeded] = useState(false);
  const [isHelpConfirmOpen, setIsHelpConfirmOpen] = useState(false);
  const [isClearingForm, setIsClearingForm] = useState(false);
  const skipUnloadWarningRef = useRef(false);

  useEffect(() => {
    const shouldWarn = hasPendingDraftChanges(draft, Boolean(editSession), defaultCategory);

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (skipUnloadWarningRef.current) {
        return;
      }

      if (!shouldWarn) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    const handlePageHide = () => {
      if (skipUnloadWarningRef.current) {
        return;
      }

      if (!shouldWarn) {
        return;
      }

      // Best effort cleanup when user really leaves/reloads the page.
      void clearTempImages(password, { keepalive: true }).catch(() => undefined);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [draft, editSession, defaultCategory, password]);

  function openSaveModal() {
    const validationErrors = validateDraftBeforeSave(draft, Boolean(editSession), t);

    if (validationErrors.length > 0) {
      setSaveSucceeded(false);
      setSaveResultTitle(t("editor.errorTitle"));
      setSaveResultMessage("");
      setSaveErrorList(validationErrors);
      setSaveModalState("result");
      return;
    }

    setSaveResultTitle("");
    setSaveResultMessage("");
    setSaveErrorList([]);
    setSaveSucceeded(false);
    setSaveModalState("confirming");
  }

  function closeSaveModal() {
    setSaveModalState("closed");
  }

  async function handleConfirmSave() {
    if (!editSession && !draft.banner) {
      setSaveSucceeded(false);
      setSaveResultTitle(t("editor.errorTitle"));
      setSaveResultMessage(t("editor.bannerRequired"));
      setSaveErrorList([]);
      setSaveModalState("result");
      return;
    }

    setSaveModalState("submitting");

    try {
      const validTempImages = draft.tempImages.filter(
        (item) => item.storagePath && item.publicUrl && !item.isBusy
      );

      const downloadedImages = await Promise.all(
        validTempImages.map(async (item) => {
          const file = await downloadTempImageAsFile(item.publicUrl as string, item.pendingName || item.name);

          return {
            file,
            name: file.name
          };
        })
      );

      const basePayload = {
        category: draft.category.toUpperCase(),
        title: draft.title,
        preview: draft.preview,
        content_markdown: draft.content_markdown,
        active: draft.active,
        banner: draft.banner,
        images: downloadedImages,
        password
      };

      const result = editSession
        ? await updatePostService({ id: editSession.postId, ...basePayload })
        : await uploadPostService(basePayload);

      if (lockIfUnauthorized(result.status)) {
        return;
      }

      if (result.status >= 200 && result.status < 300) {
        const cleanupTargets = validTempImages
          .map((item) => item.storagePath)
          .filter((path): path is string => Boolean(path));

        await Promise.allSettled(cleanupTargets.map((path) => deleteTempImage(password, path)));
        await clearTempImages(password);

        setSaveSucceeded(true);
        setSaveResultTitle(t("editor.successTitle"));
        setSaveResultMessage(t("editor.successMessage"));
        setSaveErrorList([]);
        setSaveModalState("result");
        return;
      }

      setSaveSucceeded(false);
      setSaveResultTitle(t("editor.errorTitle"));
      setSaveResultMessage(t("editor.failureStatus", { status: result.status }));
      const failure = describeServiceFailure(t, result.status, result.data);
      setSaveErrorList(failure ? [failure] : []);
      setSaveModalState("result");
    } catch (error: unknown) {
      if (lockIfUnauthorized(error)) {
        return;
      }

      setSaveSucceeded(false);
      setSaveResultTitle(t("editor.errorTitle"));
      setSaveResultMessage(error instanceof ApiError ? describeError(t, error) : t("editor.unexpectedError"));
      setSaveErrorList([]);
      setSaveModalState("result");
    }
  }

  function handleResultOk() {
    if (saveSucceeded) {
      skipUnloadWarningRef.current = true;
      window.location.reload();
      return;
    }

    closeSaveModal();
  }

  function handlePreview() {
    const generated = buildPreviewMarkdown(draft.content_markdown, draft.tempImages);
    setPreviewMarkdown(generated);
  }

  async function handleCancelEdit() {
    try {
      await clearTempImages(password);
    } catch {
      // Best effort: the page reloads either way.
    } finally {
      window.location.reload();
    }
  }

  function applyMarkdownHelpTemplate() {
    setContentMarkdown(t("editor.markdownHelpTemplate"));
    setPreviewMarkdown("");
  }

  function handleHelpClick() {
    if (draft.content_markdown.trim()) {
      setIsHelpConfirmOpen(true);
      return;
    }

    applyMarkdownHelpTemplate();
  }

  function handleHelpConfirmContinue() {
    applyMarkdownHelpTemplate();
    setIsHelpConfirmOpen(false);
  }

  function handleHelpConfirmCancel() {
    setIsHelpConfirmOpen(false);
  }

  async function handleClearAll() {
    setIsClearingForm(true);

    try {
      await clearTempImages(password);

      setDraftValues({
        category: defaultCategory,
        title: "",
        preview: "",
        content_markdown: "",
        active: true,
        banner: null,
        tempImages: []
      });

      setPreviewMarkdown("");
      requestTempReload();
    } catch (error: unknown) {
      lockIfUnauthorized(error);
    } finally {
      setIsClearingForm(false);
    }
  }

  function handleOpenWebsite() {
    window.open(siteUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="editor-panel">
      <div className="editor-panel-header">
        {editSession ? (
          <>
            <span className="editor-panel-header-prefix">{t("editor.editing")}</span>
            <div className="editor-panel-header-title" title={editSession.postTitle}>
              <span className="editor-panel-header-title-text">{editSession.postTitle}</span>
            </div>
          </>
        ) : t("editor.newPost")}
      </div>

      <textarea
        className="editor-panel-area"
        value={draft.content_markdown}
        onChange={(event) => setContentMarkdown(event.target.value)}
      ></textarea>

      <div className="editor-panel-buttons">
        <div className="editor-panel-buttons-left">
          <button className="editor-panel-button" onClick={openSaveModal}>{t("editor.save")}</button>
          {editSession ? (
            <button className="editor-panel-button" onClick={handleCancelEdit}>{t("editor.cancel")}</button>
          ) : null}
          <button className="editor-panel-button" onClick={handlePreview}>{t("editor.preview")}</button>
        </div>

        <div className="editor-panel-buttons-right">
          <button
            type="button"
            className="editor-panel-button editor-panel-icon-button"
            aria-label={t("editor.markdownHelp")}
            onClick={handleHelpClick}
          >
            ?
          </button>
          <button
            type="button"
            className="editor-panel-button editor-panel-icon-button"
            aria-label={t("editor.clear")}
            onClick={() => void handleClearAll()}
          >
            <img src={broomIcon} alt={t("editor.clear")} className="editor-panel-icon-image" />
          </button>
          {siteUrl ? (
            <button
              type="button"
              className="editor-panel-button editor-panel-icon-button"
              aria-label={t("editor.website")}
              onClick={handleOpenWebsite}
            >
              <Globe size={16} />
            </button>
          ) : null}
          <button
            type="button"
            className="editor-panel-button editor-panel-icon-button"
            aria-label={t("editor.lock")}
            title={t("editor.lock")}
            onClick={lock}
          >
            <Lock size={16} />
          </button>
        </div>
      </div>

      {isHelpConfirmOpen ? (
        <AppModal>
          <div className="editor-panel-modal" role="dialog" aria-modal="true">
            <h3 className="editor-panel-modal-title">{t("editor.replaceTitle")}</h3>
            <p className="editor-panel-modal-text">{t("editor.replaceText")}            </p>
            <div className="editor-panel-modal-buttons">
              <button className="editor-panel-button" onClick={handleHelpConfirmCancel}>{t("editor.cancel")}</button>
              <button className="editor-panel-button" onClick={handleHelpConfirmContinue}>{t("editor.continue")}</button>
            </div>
          </div>
        </AppModal>
      ) : null}

      {isClearingForm ? (
        <AppModal>
          <div className="editor-panel-modal" role="dialog" aria-modal="true">
            <h3 className="editor-panel-modal-title">{t("editor.clearingTitle")}</h3>
            <p className="editor-panel-modal-text">{t("editor.clearingText")}</p>
          </div>
        </AppModal>
      ) : null}

      {saveModalState !== "closed" ? (
        <AppModal>
          <div className="editor-panel-modal" role="dialog" aria-modal="true">
            {saveModalState === "confirming" ? (
              <>
                <h3 className="editor-panel-modal-title">{t("editor.saveConfirmTitle")}</h3>
                <p className="editor-panel-modal-text">
                  {editSession ? t("editor.saveConfirmEdit") : t("editor.saveConfirmCreate")}
                </p>
                <div className="editor-panel-modal-buttons">
                  <button className="editor-panel-button" onClick={closeSaveModal}>{t("editor.cancel")}</button>
                  <button className="editor-panel-button" onClick={handleConfirmSave} autoFocus>{t("editor.ok")}</button>
                </div>
              </>
            ) : null}

            {saveModalState === "submitting" ? (
              <>
                <h3 className="editor-panel-modal-title">{t("editor.savingTitle")}</h3>
                <p className="editor-panel-modal-text">{t("editor.savingText")}</p>
              </>
            ) : null}

            {saveModalState === "result" ? (
              <>
                <h3 className="editor-panel-modal-title">
                  {saveResultTitle || (saveSucceeded ? t("editor.successTitle") : t("editor.errorTitle"))}
                </h3>
                {saveResultMessage ? (
                  <p className="editor-panel-modal-text">{saveResultMessage}</p>
                ) : null}
                {saveErrorList.length > 0 ? (
                  <ul className="editor-panel-modal-error-list">
                    {saveErrorList.map((error) => (
                      <li key={error} className="editor-panel-modal-text">{error}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="editor-panel-modal-buttons">
                  <button className="editor-panel-button" onClick={handleResultOk}>{t("editor.ok")}</button>
                </div>
              </>
            ) : null}
          </div>
        </AppModal>
      ) : null}
    </div>
  );
}
