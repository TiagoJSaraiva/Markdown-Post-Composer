/*
 * Draft model and its pure rules: image naming, pre-save validation, unsaved-changes
 * detection and preview markdown. Used by the draft context, the editor and the form panel.
 */
import { escapeRegExp } from "./escapeRegExp";
import { getFileNameFromPath, stripExtension } from "./fileNames";
import { getMarkdownImageReferences } from "./markdownImages";

/** An image slot of the form: a staged upload or an empty slot waiting for a file. */
export type TempImageItem = {
  /** Local slot id (list key); unrelated to the storage object. */
  id: number;
  /** Name confirmed with the backend (what the markdown refers to). */
  name: string;
  /** Name typed in the input; becomes `name` once the rename is confirmed. */
  pendingName: string;
  /** Object path in temp storage; `null` while no file was uploaded. */
  storagePath: string | null;
  /** Public URL used for the preview and to download the file on save. */
  publicUrl: string | null;
  /** True while a request for this slot is in flight. */
  isBusy: boolean;
  /** Translated message of the last failure for this slot. */
  error: string | null;
};

/** The post being composed, as edited by the three panels. */
export type PostDraftState = {
  /** Post category (one of the configured categories). */
  category: string;
  title: string;
  /** Excerpt shown on the post card. */
  preview: string;
  /** Markdown body (snake_case matches the backend field). */
  content_markdown: string;
  /** Whether the post is visible to readers. */
  active: boolean;
  /** Card image; `null` until chosen (not loaded back when editing). */
  banner: File | null;
  /** Image slots referenced by the markdown. */
  tempImages: TempImageItem[];
};

/** A reason the draft cannot be saved yet; `name` identifies the offending image. */
export type DraftIssue =
  | { code: "contentEmpty" | "titleEmpty" | "bannerEmpty" | "previewEmpty" | "imageBusy" }
  | { code: "imageBadChars" | "imageUnused" | "imageMissing"; name: string };

/**
 * Image names accepted by the admin: letters and digits only. Stricter than the backend,
 * which keeps `_` and `-` and lower-cases the name.
 */
export const IMAGE_NAME_ALLOWED = /^[A-Za-z0-9]+$/;

/**
 * Creates a blank draft for a new post.
 *
 * @param defaultCategory - Category to preselect.
 * @returns The empty draft (active, no banner, no images).
 */
export function createEmptyDraft(defaultCategory: string): PostDraftState {
  return {
    category: defaultCategory,
    title: "",
    preview: "",
    content_markdown: "",
    active: true,
    banner: null,
    tempImages: []
  };
}

/**
 * Every name a markdown reference may use to point at this image.
 *
 * @param item - Image slot.
 * @returns The distinct non-empty names: typed name, confirmed name, stored file name and that
 * file name without extension.
 */
export function getImageAliases(item: Pick<TempImageItem, "name" | "pendingName" | "storagePath">): string[] {
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

/**
 * True when the typed name differs from the stored one and can be sent as a rename.
 *
 * @param item - Image slot.
 * @returns `true` for an uploaded image with a new, non-blank name.
 */
export function canConfirmImageName(item: Pick<TempImageItem, "name" | "pendingName" | "storagePath">): boolean {
  return Boolean(item.storagePath) && item.pendingName.trim().length > 0 && item.pendingName !== item.name;
}

/**
 * Everything that prevents saving the draft, in display order and without duplicates.
 *
 * @param draft - Draft to check.
 * @param isEditing - True when updating an existing post (the banner is then optional).
 * @returns The issues; empty when the draft can be saved.
 */
export function validateDraftBeforeSave(draft: PostDraftState, isEditing: boolean): DraftIssue[] {
  const issues: DraftIssue[] = [];
  const seen = new Set<string>();

  function add(issue: DraftIssue) {
    const key = "name" in issue ? `${issue.code}:${issue.name}` : issue.code;

    if (!seen.has(key)) {
      seen.add(key);
      issues.push(issue);
    }
  }

  if (!draft.content_markdown.trim()) {
    add({ code: "contentEmpty" });
  }

  if (!draft.title.trim()) {
    add({ code: "titleEmpty" });
  }

  if (!isEditing && !draft.banner) {
    add({ code: "bannerEmpty" });
  }

  if (!draft.preview.trim()) {
    add({ code: "previewEmpty" });
  }

  if (draft.tempImages.some((item) => item.isBusy)) {
    add({ code: "imageBusy" });
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
      add({ code: "imageBadChars", name: displayName });
    }

    for (const alias of aliases) {
      imageAliasSet.add(alias);
      imageAliasNoExtSet.add(stripExtension(alias));
    }

    const used = aliases.some((alias) => markdownRefsSet.has(alias) || markdownRefsNoExtSet.has(stripExtension(alias)));

    if (!used) {
      add({ code: "imageUnused", name: displayName || aliases[0] || "" });
    }
  }

  for (const ref of markdownImageRefs) {
    if (!IMAGE_NAME_ALLOWED.test(ref.normalizedNoExt)) {
      add({ code: "imageBadChars", name: ref.raw });
    }

    const exists = imageAliasSet.has(ref.normalized) || imageAliasNoExtSet.has(ref.normalizedNoExt);

    if (!exists) {
      add({ code: "imageMissing", name: ref.raw });
    }
  }

  return issues;
}

/**
 * Whether leaving the page would lose work (anything differing from a fresh draft).
 *
 * @param draft - Current draft.
 * @param isEditing - True during an edit session, which always counts as pending.
 * @param defaultCategory - Category of a fresh draft.
 * @returns `true` when there is something to lose.
 */
export function hasPendingDraftChanges(draft: PostDraftState, isEditing: boolean, defaultCategory: string): boolean {
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

/**
 * Replaces `(<local image name>)` with `(<public temp URL>)` so the preview can show the images.
 *
 * @param contentMarkdown - Post body.
 * @param tempImages - Image slots; those without an upload are skipped.
 * @returns The markdown for the preview panel.
 */
export function buildPreviewMarkdown(
  contentMarkdown: string,
  tempImages: Array<Pick<TempImageItem, "name" | "pendingName" | "storagePath" | "publicUrl">>
): string {
  let result = contentMarkdown;

  for (const item of tempImages) {
    if (!item.storagePath || !item.publicUrl) {
      continue;
    }

    const publicUrl = item.publicUrl;
    const aliases = [item.name, item.pendingName, getFileNameFromPath(item.storagePath)]
      .map((value) => value.trim())
      .filter(Boolean);

    for (const alias of aliases) {
      const regex = new RegExp(`\\(${escapeRegExp(alias)}\\)`, "g");
      result = result.replace(regex, () => `(${publicUrl})`);
    }
  }

  return result;
}
