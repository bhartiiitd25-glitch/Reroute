import { NextRequest, NextResponse } from "next/server";
import { snapToRoads } from "@/lib/polyline";

/**
 * POST /api/snap-to-roads
 * Snaps a path to roads using Google Roads API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path } = body;

    if (!Array.isArray(path) || path.length < 2) {
      return NextResponse.json(
        { error: "Path must be an array of at least 2 coordinates" },
        { status: 400 }
      );
    }

    // Validate path coordinates
    for (const point of path) {
      if (typeof point.lat !== "number" || typeof point.lng !== "number") {
        return NextResponse.json(
          { error: "Invalid coordinates in path" },
          { status: 400 }
        );
      }
    }

    const snappedPath = await snapToRoads(path);

    return NextResponse.json({ path: snappedPath });
  } catch (error) {
    console.error("Error snapping to roads:", error);
    return NextResponse.json(
      { error: "Failed to snap to roads" },
      { status: 500 }
    );
  }
}

