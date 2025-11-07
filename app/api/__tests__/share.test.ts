import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "../share/route";
import { prisma } from "@/lib/prisma";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    share: {
      create: vi.fn(),
    },
  },
}));

describe("POST /api/share", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a share with valid data", async () => {
    const mockShare = {
      id: "test123",
      destLat: 37.774931,
      destLng: -122.419412,
      encodedPolyline: "_p~iF~ps|U_ulLnnqC",
      note: "Test note",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.share.create).mockResolvedValue(mockShare);

    const request = new Request("http://localhost/api/share", {
      method: "POST",
      body: JSON.stringify({
        destLat: 37.774931,
        destLng: -122.419412,
        encodedPolyline: "_p~iF~ps|U_ulLnnqC",
        note: "Test note",
      }),
    });

    const response = await POST(request as never);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe("test123");
    expect(data.url).toBe("/r/test123");
    expect(data.expiresAt).toBeDefined();
  });

  it("should reject invalid coordinates", async () => {
    const request = new Request("http://localhost/api/share", {
      method: "POST",
      body: JSON.stringify({
        destLat: "invalid",
        destLng: -122.419412,
        encodedPolyline: "_p~iF~ps|U_ulLnnqC",
      }),
    });

    const response = await POST(request as never);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("must be numbers");
  });

  it("should reject invalid polyline", async () => {
    const request = new Request("http://localhost/api/share", {
      method: "POST",
      body: JSON.stringify({
        destLat: 37.774931,
        destLng: -122.419412,
        encodedPolyline: "invalid123!@#",
      }),
    });

    const response = await POST(request as never);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid encoded polyline");
  });

  it("should reject note over 500 chars", async () => {
    const request = new Request("http://localhost/api/share", {
      method: "POST",
      body: JSON.stringify({
        destLat: 37.774931,
        destLng: -122.419412,
        encodedPolyline: "_p~iF~ps|U_ulLnnqC",
        note: "a".repeat(501),
      }),
    });

    const response = await POST(request as never);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("500 characters or less");
  });

  it("should clamp coordinates to 6 decimals", async () => {
    const mockShare = {
      id: "test123",
      destLat: 37.774931,
      destLng: -122.419412,
      encodedPolyline: "_p~iF~ps|U_ulLnnqC",
      note: null,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.share.create).mockResolvedValue(mockShare);

    const request = new Request("http://localhost/api/share", {
      method: "POST",
      body: JSON.stringify({
        destLat: 37.77493123456789,
        destLng: -122.41941234567,
        encodedPolyline: "_p~iF~ps|U_ulLnnqC",
      }),
    });

    await POST(request as never);

    expect(prisma.share.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          destLat: 37.774931,
          destLng: -122.419412,
        }),
      })
    );
  });
});

