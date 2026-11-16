import { describe, expect, it } from "vitest";
import { getFileNameFromPath, stripExtension } from "../src/utils/fileNames";

describe("stripExtension", () => {
  it.each([
    ["photo.jpg", "photo"],
    ["a.b.png", "a.b"],
    ["photo", "photo"],
    [".hidden", ".hidden"],
    ["trailing.", "trailing."],
    ["", ""],
  ])("%j -> %j", (input, expected) => {
    expect(stripExtension(input)).toBe(expected);
  });
});

describe("getFileNameFromPath", () => {
  it.each([
    ["id/photo.jpg", "photo.jpg"],
    ["a/b/c.png", "c.png"],
    ["photo.jpg", "photo.jpg"],
    ["dir/", ""],
    ["", ""],
  ])("%j -> %j", (input, expected) => {
    expect(getFileNameFromPath(input)).toBe(expected);
  });
});
