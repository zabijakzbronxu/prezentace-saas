import { describe, it, expect } from "vitest";
import {
  isValidDocumentPath,
  formatFileSize,
  sniffDocumentType,
} from "../documents";

const USER = "11111111-1111-4111-8111-111111111111";
const PRES = "22222222-2222-4222-8222-222222222222";
const FILE = "33333333-3333-4333-8333-333333333333";

describe("isValidDocumentPath", () => {
  it("přijme správný tvar cesty s povolenou příponou", () => {
    expect(isValidDocumentPath(`${USER}/${PRES}/${FILE}.pdf`, USER, PRES)).toBe(true);
    expect(isValidDocumentPath(`${USER}/${PRES}/${FILE}.png`, USER, PRES)).toBe(true);
  });

  it("odmítne cizí složku, špatnou příponu a vloženou cestu", () => {
    // cizí uživatel ve složce
    expect(isValidDocumentPath(`${PRES}/${PRES}/${FILE}.pdf`, USER, PRES)).toBe(false);
    // nepovolená přípona (spustitelný soubor)
    expect(isValidDocumentPath(`${USER}/${PRES}/${FILE}.exe`, USER, PRES)).toBe(false);
    // název souboru není uuid
    expect(isValidDocumentPath(`${USER}/${PRES}/dokument.pdf`, USER, PRES)).toBe(false);
    // pokus o vnořenou cestu
    expect(isValidDocumentPath(`${USER}/${PRES}/../x.pdf`, USER, PRES)).toBe(false);
  });
});

describe("formatFileSize", () => {
  it("formátuje bajty, kilobajty a megabajty", () => {
    expect(formatFileSize(500)).toBe("500 B");
    expect(formatFileSize(2048)).toBe("2 kB");
    expect(formatFileSize(1_572_864)).toBe("1,5 MB");
  });
  it("null / nesmysl vrací null", () => {
    expect(formatFileSize(null)).toBeNull();
    expect(formatFileSize(-1)).toBeNull();
  });
});

describe("sniffDocumentType (magic bytes)", () => {
  it("pozná PDF podle hlavičky %PDF-", () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
    expect(sniffDocumentType(pdf)).toBe("application/pdf");
  });
  it("pozná PNG", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(sniffDocumentType(png)).toBe("image/png");
  });
  it("odmítne neznámý obsah", () => {
    expect(sniffDocumentType(new Uint8Array([0x00, 0x01, 0x02, 0x03]))).toBeNull();
  });
});
