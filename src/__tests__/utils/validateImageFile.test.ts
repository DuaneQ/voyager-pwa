import { validateImageFile, MAX_IMAGE_SIZE_MB, ALLOWED_IMAGE_TYPES } from "../../utils/validateImageFile";

describe("validateImageFile", () => {
  function makeFile(type: string, sizeBytes: number): File {
    return new File([new ArrayBuffer(sizeBytes)], "testfile", { type });
  }

  it("returns null for valid JPG image under size limit", () => {
    const file = makeFile("image/jpeg", 1024 * 1024); // 1MB
    expect(validateImageFile(file)).toBeNull();
  });

  it("returns null for valid PNG image under size limit", () => {
    const file = makeFile("image/png", 1024 * 1024); // 1MB
    expect(validateImageFile(file)).toBeNull();
  });

  it("returns error for invalid file type (PDF)", () => {
    const file = makeFile("application/pdf", 1024 * 1024);
    expect(validateImageFile(file)).toMatch(/only.*jpg.*png.*webp/i);
  });

  it("returns error for file over size limit", () => {
    const file = makeFile("image/jpeg", (MAX_IMAGE_SIZE_MB + 1) * 1024 * 1024);
    expect(validateImageFile(file)).toMatch(/smaller than/i);
  });

  it("returns error for valid type but not in allowed list", () => {
    const file = makeFile("image/gif", 1024 * 1024);
    expect(validateImageFile(file)).toMatch(/only.*jpg.*png.*webp/i);
  });

  it("returns null for valid WEBP image under size limit", () => {
    const file = makeFile("image/webp", 1024 * 1024);
    expect(validateImageFile(file)).toBeNull();
  });
});
