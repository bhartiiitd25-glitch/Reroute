import { describe, it, expect } from "vitest";
import { encodePolyline, decodePolyline, type LatLng } from "../polyline";

describe("polyline", () => {
  const testPath: LatLng[] = [
    { lat: 38.5, lng: -120.2 },
    { lat: 40.7, lng: -120.95 },
    { lat: 43.252, lng: -126.453 },
  ];

  describe("encodePolyline", () => {
    it("should encode coordinates to polyline string", () => {
      const encoded = encodePolyline(testPath);
      expect(typeof encoded).toBe("string");
      expect(encoded.length).toBeGreaterThan(0);
    });

    it("should handle single point", () => {
      const encoded = encodePolyline([{ lat: 0, lng: 0 }]);
      expect(typeof encoded).toBe("string");
    });

    it("should handle empty array", () => {
      const encoded = encodePolyline([]);
      expect(encoded).toBe("");
    });
  });

  describe("decodePolyline", () => {
    it("should decode polyline string to coordinates", () => {
      const encoded = encodePolyline(testPath);
      const decoded = decodePolyline(encoded);
      
      expect(decoded).toHaveLength(testPath.length);
      expect(decoded[0].lat).toBeCloseTo(testPath[0].lat, 5);
      expect(decoded[0].lng).toBeCloseTo(testPath[0].lng, 5);
    });

    it("should be reversible", () => {
      const encoded = encodePolyline(testPath);
      const decoded = decodePolyline(encoded);
      const reencoded = encodePolyline(decoded);
      
      expect(reencoded).toBe(encoded);
    });
  });
});

