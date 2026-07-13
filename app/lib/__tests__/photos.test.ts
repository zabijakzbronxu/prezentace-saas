import { describe, it, expect } from "vitest";
import { sniffImageType, isValidPhotoPath } from "../photos";

const USER = "123e4567-e89b-12d3-a456-426614174000";
const PRES = "223e4567-e89b-12d3-a456-426614174000";
const FILE = "323e4567-e89b-12d3-a456-426614174000";

describe("sniffImageType", () => {
  it("pozná JPEG podle magic bytes", () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
  });

  it("pozná PNG", () => {
    expect(
      sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ).toBe("image/png");
  });

  it("pozná WebP (RIFF….WEBP)", () => {
    const bytes = new Uint8Array(12);
    bytes.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
    bytes.set([0x57, 0x45, 0x42, 0x50], 8); // WEBP
    expect(sniffImageType(bytes)).toBe("image/webp");
  });

  it("odmítne cizí obsah (PDF, text, prázdno)", () => {
    expect(sniffImageType(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBeNull(); // %PDF
    expect(sniffImageType(new TextEncoder().encode("hello"))).toBeNull();
    expect(sniffImageType(new Uint8Array([]))).toBeNull();
  });
});

describe("isValidPhotoPath", () => {
  it("projde správný tvar <user>/<prezentace>/<uuid>.<pripona>", () => {
    expect(isValidPhotoPath(`${USER}/${PRES}/${FILE}.jpg`, USER, PRES)).toBe(true);
    expect(isValidPhotoPath(`${USER}/${PRES}/${FILE}.webp`, USER, PRES)).toBe(true);
  });

  it("odmítne cestu jiného uživatele nebo jiné prezentace", () => {
    expect(isValidPhotoPath(`${PRES}/${PRES}/${FILE}.jpg`, USER, PRES)).toBe(false);
    expect(isValidPhotoPath(`${USER}/${USER}/${FILE}.jpg`, USER, PRES)).toBe(false);
  });

  it("odmítne nepovolenou příponu a útoky na cestu", () => {
    expect(isValidPhotoPath(`${USER}/${PRES}/${FILE}.gif`, USER, PRES)).toBe(false);
    expect(isValidPhotoPath(`${USER}/${PRES}/../${FILE}.jpg`, USER, PRES)).toBe(false);
    expect(isValidPhotoPath(`${USER}/${PRES}/muj-soubor.jpg`, USER, PRES)).toBe(false);
  });

  it("odmítne odkaz do CIZÍ složky (revize 2026-07: stejné pravidlo hlídá i DB trigger)", () => {
    // Útočník s vlastní prezentací zkusí zaregistrovat cestu mířící do
    // složky oběti. Aplikace i DB (enforce_photo_path) to musí odmítnout.
    const VICTIM = "999e4567-e89b-12d3-a456-426614174000";
    expect(isValidPhotoPath(`${VICTIM}/${PRES}/${FILE}.jpg`, USER, PRES)).toBe(false);
    expect(isValidPhotoPath(`${USER}/${PRES}/${FILE}.svg`, USER, PRES)).toBe(false); // ani „obrázkový" SVG
  });
});
