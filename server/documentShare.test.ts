import { describe, expect, it } from "vitest";
import { buildWhatsAppUrl, normalizeSriLankanPhone } from "../client/src/lib/documentShare";

describe("WhatsApp download-and-redirect helpers", () => {
  it("normalizes Sri Lankan mobile numbers", () => {
    expect(normalizeSriLankanPhone("077 123 4567")).toBe("94771234567");
    expect(normalizeSriLankanPhone("+94 77 123 4567")).toBe("94771234567");
    expect(normalizeSriLankanPhone("0094 77 123 4567")).toBe("94771234567");
  });

  it("encodes the manual-attachment message in the wa.me URL", () => {
    const message = "Hello, please find your document attached.";
    const url = buildWhatsAppUrl("0771234567", message);
    expect(url).toBe(`https://wa.me/94771234567?text=${encodeURIComponent(message)}`);
  });
});
