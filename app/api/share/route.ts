import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clampLat, clampLng, isValidEncodedPolyline, isValidNote, createExpirationDate } from "@/lib/validation";

/**
 * POST /api/share
 * Creates a new shareable route (general or micro-route)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { routeType = "general" } = body;

    if (routeType === "microroute") {
      // X→Y Micro-route
      const { xLat, xLng, yLat, yLng, encodedXY, note, ttlHours = 24 } = body;

      // Validate required fields
      if (
        typeof xLat !== "number" ||
        typeof xLng !== "number" ||
        typeof yLat !== "number" ||
        typeof yLng !== "number"
      ) {
        return NextResponse.json(
          { error: "xLat, xLng, yLat, yLng must be numbers" },
          { status: 400 }
        );
      }

      if (!isValidEncodedPolyline(encodedXY)) {
        return NextResponse.json(
          { error: "Invalid encoded X→Y polyline" },
          { status: 400 }
        );
      }

      if (!isValidNote(note)) {
        return NextResponse.json(
          { error: "Note must be 500 characters or less" },
          { status: 400 }
        );
      }

      // Validate TTL (1-72 hours)
      const validTtl = Math.max(1, Math.min(72, ttlHours));

      // Clamp coordinates
      const share = await prisma.share.create({
        data: {
          routeType: "microroute",
          destLat: clampLat(yLat), // Y is the final destination
          destLng: clampLng(yLng),
          encodedPolyline: encodedXY,
          xLat: clampLat(xLat),
          xLng: clampLng(xLng),
          yLat: clampLat(yLat),
          yLng: clampLng(yLng),
          encodedXY,
          note: note || null,
          ttlHours: validTtl,
          expiresAt: createExpirationDate(validTtl),
        },
      });

      return NextResponse.json(
        {
          id: share.id,
          url: `/r/${share.id}`,
          expiresAt: share.expiresAt.toISOString(),
        },
        { status: 201 }
      );
    } else {
      // General route
      const { destLat, destLng, encodedPolyline, note } = body;

      // Validate required fields
      if (typeof destLat !== "number" || typeof destLng !== "number") {
        return NextResponse.json(
          { error: "destLat and destLng must be numbers" },
          { status: 400 }
        );
      }

      if (!isValidEncodedPolyline(encodedPolyline)) {
        return NextResponse.json(
          { error: "Invalid encoded polyline" },
          { status: 400 }
        );
      }

      if (!isValidNote(note)) {
        return NextResponse.json(
          { error: "Note must be 500 characters or less" },
          { status: 400 }
        );
      }

      // Create share with 24h expiration
      const share = await prisma.share.create({
        data: {
          routeType: "general",
          destLat: clampLat(destLat),
          destLng: clampLng(destLng),
          encodedPolyline,
          note: note || null,
          expiresAt: createExpirationDate(24),
        },
      });

      return NextResponse.json(
        {
          id: share.id,
          url: `/r/${share.id}`,
          expiresAt: share.expiresAt.toISOString(),
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("Error creating share:", error);
    return NextResponse.json(
      { error: "Failed to create share" },
      { status: 500 }
    );
  }
}

