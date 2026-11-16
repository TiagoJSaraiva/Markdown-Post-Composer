/*
 * Tests of the draft helpers: pre-save validation, unsaved-changes detection,
 * preview markdown and image alias rules.
 */
import { describe, expect, it } from "vitest";
import {
  buildPreviewMarkdown,
  canConfirmImageName,
  createEmptyDraft,
  getImageAliases,
  hasPendingDraftChanges,
  validateDraftBeforeSave,
  type DraftIssue,
  type PostDraftState,
  type TempImageItem,
} from "../src/utils/draft";

function image(overrides: Partial<TempImageItem> = {}): TempImageItem {
  return {
    id: 1,
    name: "cat",
    pendingName: "cat",
    storagePath: "tmp/cat__v__1.jpg",
    publicUrl: "https://cdn/cat.jpg?v=1",
    isBusy: false,
    error: null,
    ...overrides,
  };
}

function draft(overrides: Partial<PostDraftState> = {}): PostDraftState {
  return {
    ...createEmptyDraft("BLOG"),
    title: "Title",
    preview: "Preview",
    content_markdown: "Hello",
    banner: new File(["x"], "banner.png"),
    ...overrides,
  };
}

describe("validateDraftBeforeSave", () => {
  it("accepts a complete draft", () => {
    expect(validateDraftBeforeSave(draft(), false)).toEqual([]);
  });

  it("reports empty fields in display order", () => {
    const issues = validateDraftBeforeSave(createEmptyDraft("BLOG"), false);

    expect(issues.map((i) => i.code)).toEqual(["contentEmpty", "titleEmpty", "bannerEmpty", "previewEmpty"]);
  });

  it("treats whitespace-only fields as empty", () => {
    const issues = validateDraftBeforeSave(draft({ content_markdown: "  \n", title: " ", preview: "\t" }), false);

    expect(issues.map((i) => i.code)).toEqual(["contentEmpty", "titleEmpty", "previewEmpty"]);
  });

  it("makes the banner optional when editing", () => {
    expect(validateDraftBeforeSave(draft({ banner: null }), true)).toEqual([]);
    expect(validateDraftBeforeSave(draft({ banner: null }), false)).toEqual([{ code: "bannerEmpty" }]);
  });

  it("reports imageBusy once", () => {
    const issues = validateDraftBeforeSave(
      draft({ tempImages: [image({ isBusy: true }), image({ id: 2, isBusy: true })] }),
      false,
    );

    expect(issues.filter((i) => i.code === "imageBusy")).toHaveLength(1);
  });

  it.each<[string, Partial<PostDraftState>, DraftIssue[]]>([
    [
      "image referenced by name (no extension)",
      { content_markdown: "![a](cat)", tempImages: [image()] },
      [],
    ],
    [
      "image referenced through its renamed pendingName",
      { content_markdown: "![a](dog)", tempImages: [image({ pendingName: "dog" })] },
      [],
    ],
    [
      "uploaded image never used",
      { content_markdown: "text", tempImages: [image()] },
      [{ code: "imageUnused", name: "cat" }],
    ],
    [
      "reference without a matching image",
      { content_markdown: "![a](ghost)", tempImages: [] },
      [{ code: "imageMissing", name: "ghost" }],
    ],
    [
      "bad characters in an image name",
      { content_markdown: "![a](my_cat)", tempImages: [image({ name: "my_cat", pendingName: "my_cat" })] },
      [{ code: "imageBadChars", name: "my_cat" }],
    ],
    [
      "image without storagePath is ignored",
      { content_markdown: "text", tempImages: [image({ storagePath: null })] },
      [],
    ],
  ])("%s", (_label, overrides, expected) => {
    expect(validateDraftBeforeSave(draft(overrides), false)).toEqual(expected);
  });

  it("does not duplicate the same issue", () => {
    const issues = validateDraftBeforeSave(draft({ content_markdown: "![a](ghost) ![b](ghost)" }), false);

    expect(issues).toEqual([{ code: "imageMissing", name: "ghost" }]);
  });

  it("ignores absolute image URLs", () => {
    expect(validateDraftBeforeSave(draft({ content_markdown: "![a](https://x.com/a.png)" }), false)).toEqual([]);
  });
});

describe("hasPendingDraftChanges", () => {
  it("is false for a fresh draft", () => {
    expect(hasPendingDraftChanges(createEmptyDraft("BLOG"), false, "BLOG")).toBe(false);
  });

  it.each<[string, Partial<PostDraftState>]>([
    ["category changed", { category: "NEWS" }],
    ["inactive", { active: false }],
    ["title", { title: "x" }],
    ["preview", { preview: "x" }],
    ["content", { content_markdown: "x" }],
    ["banner", { banner: new File(["x"], "b.png") }],
    ["uploaded image", { tempImages: [image()] }],
  ])("is true with %s", (_label, overrides) => {
    expect(hasPendingDraftChanges({ ...createEmptyDraft("BLOG"), ...overrides }, false, "BLOG")).toBe(true);
  });

  it("ignores whitespace-only text and images without storagePath", () => {
    const d = { ...createEmptyDraft("BLOG"), title: "  ", tempImages: [image({ storagePath: null })] };

    expect(hasPendingDraftChanges(d, false, "BLOG")).toBe(false);
  });

  it("is always true when editing", () => {
    expect(hasPendingDraftChanges(createEmptyDraft("BLOG"), true, "BLOG")).toBe(true);
  });
});

describe("buildPreviewMarkdown", () => {
  it("replaces every alias with the public URL", () => {
    const item = image({ name: "cat", pendingName: "kitty", storagePath: "tmp/cat__v__1.jpg" });
    const md = "![a](cat) ![b](kitty) ![c](cat__v__1.jpg) ![d](other)";

    expect(buildPreviewMarkdown(md, [item])).toBe(
      "![a](https://cdn/cat.jpg?v=1) ![b](https://cdn/cat.jpg?v=1) ![c](https://cdn/cat.jpg?v=1) ![d](other)",
    );
  });

  it("skips images without storagePath or publicUrl", () => {
    const md = "![a](cat)";

    expect(buildPreviewMarkdown(md, [image({ storagePath: null }), image({ publicUrl: null })])).toBe(md);
  });

  it("inserts URLs literally (no $ replacement patterns) and escapes alias metacharacters", () => {
    const item = image({ name: "a.b", pendingName: "a.b", publicUrl: "https://cdn/$&x.jpg" });

    expect(buildPreviewMarkdown("![a](a.b) ![b](aXb)", [item])).toBe("![a](https://cdn/$&x.jpg) ![b](aXb)");
  });
});

describe("getImageAliases", () => {
  it("lists pending name, name, file name and file name without extension, deduplicated", () => {
    expect(getImageAliases(image({ name: "cat", pendingName: "kitty" }))).toEqual([
      "kitty",
      "cat",
      "cat__v__1.jpg",
      "cat__v__1",
    ]);
    expect(getImageAliases(image({ name: "cat", pendingName: "cat", storagePath: null }))).toEqual(["cat"]);
  });

  it("drops blank names", () => {
    expect(getImageAliases(image({ name: " ", pendingName: "", storagePath: null }))).toEqual([]);
  });
});

describe("canConfirmImageName", () => {
  it.each([
    ["renamed and stored", { pendingName: "dog" }, true],
    ["unchanged", { pendingName: "cat" }, false],
    ["blank", { pendingName: "  " }, false],
    ["not stored yet", { pendingName: "dog", storagePath: null }, false],
  ])("%s -> %s", (_label, overrides, expected) => {
    expect(canConfirmImageName(image(overrides))).toBe(expected);
  });
});
