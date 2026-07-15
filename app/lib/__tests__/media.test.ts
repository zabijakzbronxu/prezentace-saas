import { describe, it, expect } from "vitest";
import { isValidMediaPath, ALLOWED_MEDIA_TYPES, MEDIA_BUCKET } from "../media";

const USER = "11111111-1111-4111-8111-111111111111";
const PRES = "22222222-2222-4222-8222-222222222222";
const FILE = "33333333-3333-4333-8333-333333333333";

describe("isValidMediaPath", () => {
  it("přijme obrázek ve správné složce", () => {
    expect(isValidMediaPath(`${USER}/${PRES}/${FILE}.jpg`, USER, PRES)).toBe(true);
    expect(isValidMediaPath(`${USER}/${PRES}/${FILE}.webp`, USER, PRES)).toBe(true);
  });

  it("odmítne cizí složku, ne-obrázek a nevalidní jméno", () => {
    expect(isValidMediaPath(`${PRES}/${PRES}/${FILE}.jpg`, USER, PRES)).toBe(false); // cizí uživatel
    expect(isValidMediaPath(`${USER}/${PRES}/${FILE}.pdf`, USER, PRES)).toBe(false); // PDF sem nepatří
    expect(isValidMediaPath(`${USER}/${PRES}/plan.jpg`, USER, PRES)).toBe(false); // jméno není uuid
    expect(isValidMediaPath(`${USER}/${PRES}/../x.jpg`, USER, PRES)).toBe(false); // vnořená cesta
  });
});

describe("media konstanty", () => {
  it("bucket a povolené typy", () => {
    expect(MEDIA_BUCKET).toBe("presentation-media");
    expect(Object.keys(ALLOWED_MEDIA_TYPES).sort()).toEqual([
      "image/jpeg", "image/png", "image/webp",
    ]);
  });
});
