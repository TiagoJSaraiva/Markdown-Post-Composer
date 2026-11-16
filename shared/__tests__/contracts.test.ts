import { describe, expect, it } from "vitest"
import { isLoadCardsSuccessResponse, isPostCard } from "../contracts/loadCards.ts"
import { isLoadPostSuccessResponse, isPostDetails } from "../contracts/loadPost.ts"
import {
  isDeleteTempImagesRequestBody,
  isDeleteTempImagesSuccessResponse,
  isImportPostImageRequestBody,
  isListTempImagesSuccessResponse,
  isRenameTempImageRequestBody,
  isTempImage,
  isTempImageSuccessResponse
} from "../contracts/tempImages.ts"
import { card, details } from "./fixtures.ts"

const image = { name: "a", path: "a__v__1.png", publicUrl: "https://x/a.png?v=1" }

describe("loadCards guards", () => {
  it("accepts valid cards and responses (including an empty list)", () => {
    expect(isPostCard(card)).toBe(true)
    expect(isLoadCardsSuccessResponse({ success: true, data: [card, card] })).toBe(true)
    expect(isLoadCardsSuccessResponse({ success: true, data: [] })).toBe(true)
  })

  it.each([
    ["missing field", { ...card, banner_url: undefined }],
    ["wrong type", { ...card, active: "true" }],
    ["null", null],
    ["string", "card"]
  ])("rejects an invalid card: %s", (_label, value) => {
    expect(isPostCard(value)).toBe(false)
  })

  it.each([
    ["success false", { success: false, data: [card] }],
    ["data not an array", { success: true, data: card }],
    ["one bad card", { success: true, data: [card, { id: 1 }] }],
    ["error body", { error: "POST_NOT_FOUND" }],
    ["null", null]
  ])("rejects an invalid response: %s", (_label, value) => {
    expect(isLoadCardsSuccessResponse(value)).toBe(false)
  })
})

describe("loadPost guards", () => {
  it("accepts valid details", () => {
    expect(isPostDetails(details)).toBe(true)
    expect(isLoadPostSuccessResponse({ success: true, data: details })).toBe(true)
  })

  it.each([
    ["missing content", { ...details, content_markdown: undefined }],
    ["image_paths with non-string", { ...details, image_paths: ["a", 1] }],
    ["image_paths not array", { ...details, image_paths: "a" }],
    ["active as string", { ...details, active: "false" }]
  ])("rejects invalid details: %s", (_label, value) => {
    expect(isPostDetails(value)).toBe(false)
    expect(isLoadPostSuccessResponse({ success: true, data: value })).toBe(false)
  })

  it("rejects responses without success: true", () => {
    expect(isLoadPostSuccessResponse({ success: false, data: details })).toBe(false)
    expect(isLoadPostSuccessResponse({ data: details })).toBe(false)
  })
})

describe("tempImages guards", () => {
  it("accepts valid payloads", () => {
    expect(isTempImage(image)).toBe(true)
    expect(isListTempImagesSuccessResponse({ success: true, data: [image] })).toBe(true)
    expect(isTempImageSuccessResponse({ success: true, data: image })).toBe(true)
    expect(isDeleteTempImagesSuccessResponse({ success: true, data: { deleted: 0 } })).toBe(true)
  })

  it("rejects malformed payloads", () => {
    expect(isTempImage({ name: "a", path: "p" })).toBe(false)
    expect(isListTempImagesSuccessResponse({ success: true, data: [image, {}] })).toBe(false)
    expect(isTempImageSuccessResponse({ success: true, data: [image] })).toBe(false)
    expect(isDeleteTempImagesSuccessResponse({ success: true, data: { deleted: "1" } })).toBe(false)
    expect(isDeleteTempImagesSuccessResponse({ success: true })).toBe(false)
  })

  it("validates request bodies", () => {
    expect(isRenameTempImageRequestBody({ path: "a", name: "b" })).toBe(true)
    expect(isRenameTempImageRequestBody({ path: "a" })).toBe(false)
    expect(isDeleteTempImagesRequestBody({ path: "a" })).toBe(true)
    expect(isDeleteTempImagesRequestBody({ all: true })).toBe(true)
    expect(isDeleteTempImagesRequestBody({ all: false })).toBe(false)
    expect(isDeleteTempImagesRequestBody("all")).toBe(false)
    expect(isImportPostImageRequestBody({ postImagePath: "p/a.png" })).toBe(true)
    expect(isImportPostImageRequestBody({ path: "p/a.png" })).toBe(false)
  })
})
