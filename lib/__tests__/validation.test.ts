import { describe, it, expect } from "vitest";
import {
  clampLat,
  clampLng,
  isValidEncodedPolyline,
  isValidNote,
  createExpirationDate,
} from "../validation";

describe("validation", () => {
  describe("clampLat", () => {
    it("should clamp to 6 decimal places", () => {
      expect(clampLat(37.77493123456789)).toBe(37.774931);
    });

    it("should clamp values above 90", () => {
      expect(clampLat(95)).toBe(90);
    });

    it("should clamp values below -90", () => {
      expect(clampLat(-95)).toBe(-90);
    });

    it("should handle valid values", () => {
      expect(clampLat(45.5)).toBe(45.5);
    });
  });

  describe("clampLng", () => {
    it("should clamp to 6 decimal places", () => {
      expect(clampLng(-122.41941234567)).toBe(-122.419412);
    });

    it("should clamp values above 180", () => {
      expect(clampLng(185)).toBe(180);
    });

    it("should clamp values below -180", () => {
      expect(clampLng(-185)).toBe(-180);
    });

    it("should handle valid values", () => {
      expect(clampLng(-120.5)).toBe(-120.5);
    });
  });

  describe("isValidEncodedPolyline", () => {
    it("should accept valid polyline strings", () => {
      expect(isValidEncodedPolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@")).toBe(true);
    });

    it("should reject empty strings", () => {
      expect(isValidEncodedPolyline("")).toBe(false);
    });

    it("should reject non-string values", () => {
      expect(isValidEncodedPolyline(null as never)).toBe(false);
      expect(isValidEncodedPolyline(undefined as never)).toBe(false);
      expect(isValidEncodedPolyline(123 as never)).toBe(false);
    });

    it("should reject invalid characters", () => {
      expect(isValidEncodedPolyline("invalid!@#$%")).toBe(false);
      expect(isValidEncodedPolyline("abc123")).toBe(false);
    });
  });

  describe("isValidNote", () => {
    it("should accept undefined", () => {
      expect(isValidNote(undefined)).toBe(true);
    });

    it("should accept empty string", () => {
      expect(isValidNote("")).toBe(true);
    });

    it("should accept valid notes", () => {
      expect(isValidNote("This is a valid note")).toBe(true);
    });

    it("should accept notes up to 500 chars", () => {
      expect(isValidNote("a".repeat(500))).toBe(true);
    });

    it("should reject notes over 500 chars", () => {
      expect(isValidNote("a".repeat(501))).toBe(false);
    });
  });

  describe("createExpirationDate", () => {
    it("should create date 24 hours in future by default", () => {
      const now = new Date();
      const expiry = createExpirationDate();
      const diff = expiry.getTime() - now.getTime();
      
      // Should be approximately 24 hours (allow 1 second tolerance)
      expect(diff).toBeGreaterThan(24 * 60 * 60 * 1000 - 1000);
      expect(diff).toBeLessThan(24 * 60 * 60 * 1000 + 1000);
    });

    it("should create date with custom hours", () => {
      const now = new Date();
      const expiry = createExpirationDate(48);
      const diff = expiry.getTime() - now.getTime();
      
      // Should be approximately 48 hours
      expect(diff).toBeGreaterThan(48 * 60 * 60 * 1000 - 1000);
      expect(diff).toBeLessThan(48 * 60 * 60 * 1000 + 1000);
    });
  });
});

