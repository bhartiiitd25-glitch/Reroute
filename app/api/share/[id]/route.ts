import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/share/[id]
 * Retrieves a share by ID (if not expired)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const share = await prisma.share.findUnique({
      where: { id },
    });

    if (!share) {
      return NextResponse.json(
        { error: "Share not found" },
        { status: 404 }
      );
    }

    // Check if expired
    if (new Date() > share.expiresAt) {
      return NextResponse.json(
        { error: "Share has expired", expired: true },
        { status: 410 }
      );
    }

    return NextResponse.json({
      id: share.id,
      destLat: share.destLat,
      destLng: share.destLng,
      encodedPolyline: share.encodedPolyline,
      note: share.note,
      expiresAt: share.expiresAt.toISOString(),
      createdAt: share.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching share:", error);
    return NextResponse.json(
      { error: "Failed to fetch share" },
      { status: 500 }
    );
  }
}

