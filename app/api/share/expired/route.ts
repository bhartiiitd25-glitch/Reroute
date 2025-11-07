import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/share/expired
 * Hard deletes expired shares (cron/admin route)
 */
export async function DELETE() {
  try {
    const result = await prisma.share.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return NextResponse.json({
      deleted: result.count,
      message: `Deleted ${result.count} expired share(s)`,
    });
  } catch (error) {
    console.error("Error deleting expired shares:", error);
    return NextResponse.json(
      { error: "Failed to delete expired shares" },
      { status: 500 }
    );
  }
}

