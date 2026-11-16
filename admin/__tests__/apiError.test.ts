import { describe, expect, it } from "vitest";
import { ApiError, isUnauthorizedError, isUnauthorizedStatus, parseErrorBody } from "../src/lib/apiError";

describe("parseErrorBody", () => {
  it.each([
    ["null", null, {}],
    ["string", "boom", {}],
    ["array", [1], {}],
    ["empty object", {}, { code: undefined, details: undefined }],
    ["code only", { error: "WRONG_PASSWORD" }, { code: "WRONG_PASSWORD", details: undefined }],
    ["empty code", { error: "" }, { code: undefined, details: undefined }],
    ["non-string code", { error: 42 }, { code: undefined, details: undefined }],
    [
      "code and details",
      { error: "IMAGE_TOO_LARGE", details: { file: "a.png", maxMb: 5 } },
      { code: "IMAGE_TOO_LARGE", details: { file: "a.png", maxMb: 5 } },
    ],
    ["array details are dropped", { error: "X", details: ["a"] }, { code: "X", details: undefined }],
    ["primitive details are dropped", { error: "X", details: "a" }, { code: "X", details: undefined }],
  ])("%s", (_label, body, expected) => {
    expect(parseErrorBody(body)).toEqual(expected);
  });
});

describe("unauthorized helpers", () => {
  it("detects 401 statuses only", () => {
    expect(isUnauthorizedStatus(401)).toBe(true);
    expect(isUnauthorizedStatus(403)).toBe(false);
  });

  it("detects 401 ApiErrors only", () => {
    expect(isUnauthorizedError(new ApiError(401, "WRONG_PASSWORD"))).toBe(true);
    expect(isUnauthorizedError(new ApiError(500, "INTERNAL_ERROR"))).toBe(false);
    expect(isUnauthorizedError(new Error("401"))).toBe(false);
    expect(isUnauthorizedError({ status: 401 })).toBe(false);
  });
});

describe("ApiError", () => {
  it("carries status, code and details", () => {
    const error = new ApiError(400, "INVALID_ID", { id: "x" });

    expect(error).toMatchObject({
      name: "ApiError",
      message: "INVALID_ID",
      status: 400,
      code: "INVALID_ID",
      details: { id: "x" },
    });
  });
});
