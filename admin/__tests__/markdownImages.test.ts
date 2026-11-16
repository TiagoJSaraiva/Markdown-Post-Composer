/*
 * Tests of the markdown image helpers: reference parsing, storage path
 * extraction and the reverse rewrite used when a post is loaded for editing.
 */
import { describe, expect, it } from "vitest";
import {
  extractRelativeImagePathsFromMarkdown,
  getMarkdownImageReferences,
  isAbsoluteOrSpecialUrl,
  normalizeRefName,
  reverseMarkdownImagePaths,
} from "../src/utils/markdownImages";

describe("isAbsoluteOrSpecialUrl", () => {
  it.each([
    ["https://x.com/a.png", true],
    ["HTTP://x.com/a.png", true],
    ["//cdn.x.com/a.png", true],
    ["data:image/png;base64,AAA", true],
    ["blob:abc", true],
    ["mailto:a@b.c", true],
    ["tel:123", true],
    ["#anchor", true],
    ["photo", false],
    ["abc/photo.jpg", false],
    ["./photo.jpg", false],
  ])("%s -> %s", (url, expected) => {
    expect(isAbsoluteOrSpecialUrl(url)).toBe(expected);
  });
});

describe("normalizeRefName", () => {
  it.each([
    ["photo", "photo"],
    ["  photo  ", "photo"],
    ["./photo.jpg", "photo.jpg"],
    // Kept as written so validation reports them (the server would not rewrite them).
    ["photo.jpg?v=1#x", "photo.jpg?v=1#x"],
    // Storage paths are not local references.
    ["dir/sub/photo.jpg", ""],
    ["./dir/photo.jpg", ""],
  ])("%s -> %s", (raw, expected) => {
    expect(normalizeRefName(raw)).toBe(expected);
  });
});

describe("getMarkdownImageReferences", () => {
  it("returns local references with and without extension", () => {
    const md = '![a](photo) text ![b](./cat.jpg "title") ![](  dog.png ) ![c](id/stored.jpg)';

    expect(getMarkdownImageReferences(md)).toEqual([
      { raw: "photo", normalized: "photo", normalizedNoExt: "photo" },
      { raw: "cat.jpg", normalized: "cat.jpg", normalizedNoExt: "cat" },
      { raw: "dog.png", normalized: "dog.png", normalizedNoExt: "dog" },
    ]);
  });

  it("ignores absolute and special URLs, links and empty targets", () => {
    const md = [
      "![a](https://x.com/a.png)",
      "![b](//cdn/b.png)",
      "![c](data:image/png;base64,AAA)",
      "[link](local)",
      "![d]()",
      "![e](#frag)",
    ].join("\n");

    expect(getMarkdownImageReferences(md)).toEqual([]);
  });

  it("returns duplicates as written", () => {
    expect(getMarkdownImageReferences("![a](x) ![b](x)")).toHaveLength(2);
  });
});

describe("extractRelativeImagePathsFromMarkdown", () => {
  it("returns only unique paths that contain a slash", () => {
    const md = '![a](id1/a.jpg) ![b](id1/a.jpg) ![c](shortname) ![d](id2/b.png "t") ![e](https://x/y/z.png)';

    expect(extractRelativeImagePathsFromMarkdown(md)).toEqual(["id1/a.jpg", "id2/b.png"]);
  });

  it("returns an empty list when there are no images", () => {
    expect(extractRelativeImagePathsFromMarkdown("just text")).toEqual([]);
  });
});

describe("reverseMarkdownImagePaths", () => {
  it("rewrites each storage path to the extension-less file name", () => {
    const md = "![a](id1/cat.jpg) and ![b](id2/dog.png) and ![c](id1/cat.jpg)";

    expect(reverseMarkdownImagePaths(md, ["id1/cat.jpg", "id2/dog.png"])).toBe(
      "![a](cat) and ![b](dog) and ![c](cat)",
    );
  });

  it.each([
    ["names with $ patterns", "id/a$&b.jpg", "a$&b"],
    ["regex metacharacters", "id/a.b(1)+[x].png", "a.b(1)+[x]"],
  ])("handles %s literally", (_label, path, short) => {
    expect(reverseMarkdownImagePaths(`![x](${path})`, [path])).toBe(`![x](${short})`);
  });

  it("does not match a path that is only a substring of another target", () => {
    const md = "![x](id/cat.jpg.bak) ![y](other/id/cat.jpg)";

    expect(reverseMarkdownImagePaths(md, ["id/cat.jpg"])).toBe(md);
  });

  it("leaves absolute and special URLs untouched", () => {
    const md = "![a](https://x.com/id/cat.jpg) ![b](data:image/png;base64,AAA) ![c](id/cat.jpg)";

    expect(reverseMarkdownImagePaths(md, ["id/cat.jpg"])).toBe(
      "![a](https://x.com/id/cat.jpg) ![b](data:image/png;base64,AAA) ![c](cat)",
    );
  });

  it("returns the markdown unchanged without paths", () => {
    expect(reverseMarkdownImagePaths("![a](id/cat.jpg)", [])).toBe("![a](id/cat.jpg)");
  });
});
