import { escapeRegExp } from "./escapeRegExp";
import { getFileNameFromPath, stripExtension } from "./fileNames";
import { getMarkdownImageReferences } from "./markdownImages";

export type TempImageItem = {
  id: number;
  name: string;
  pendingName: string;
  storagePath: string | null;
  publicUrl: string | null;
  isBusy: boolean;
  error: string | null;
};

export type PostDraftState = {
  category: string;
  title: string;
  preview: string;
  content_markdown: string;
  active: boolean;
  banner: File | null;
  tempImages: TempImageItem[];
};

export type DraftIssue =
  | { code: "contentEmpty" | "titleEmpty" | "bannerEmpty" | "previewEmpty" | "imageBusy" }
  | { code: "imageBadChars" | "imageUnused" | "imageMissing"; name: string };

/** Image names are limited to letters and digits (the backend normalizes anything else away). */
export const IMAGE_NAME_ALLOWED = /^[A-Za-z0-9]+$/;

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

/** Every name a markdown reference may use to point at this image. */
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

/** True when the typed name differs from the stored one and can be sent as a rename. */
export function canConfirmImageName(item: Pick<TempImageItem, "name" | "pendingName" | "storagePath">): boolean {
  return Boolean(item.storagePath) && item.pendingName.trim().length > 0 && item.pendingName !== item.name;
}

/** Everything that prevents saving the draft, in display order and without duplicates. */
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

/** Whether leaving the page would lose work (anything differing from a fresh draft). */
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

/** Replaces `(<local image name>)` with `(<public temp URL>)` so the preview can show the images. */
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
