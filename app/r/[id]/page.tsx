import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ShareView from "./ShareView";

interface SharePageProps {
  params: Promise<{ id: string }>;
}

/**
 * Server-rendered share page
 */
export default async function SharePage({ params }: SharePageProps) {
  const { id } = await params;

  const share = await prisma.share.findUnique({
    where: { id },
  });

  if (!share) {
    notFound();
  }

  // Check if expired
  const isExpired = new Date() > share.expiresAt;

  return (
    <ShareView
      share={{
        id: share.id,
        routeType: share.routeType,
        destLat: share.destLat,
        destLng: share.destLng,
        encodedPolyline: share.encodedPolyline,
        xLat: share.xLat || undefined,
        xLng: share.xLng || undefined,
        yLat: share.yLat || undefined,
        yLng: share.yLng || undefined,
        encodedXY: share.encodedXY || undefined,
        note: share.note || undefined,
        ttlHours: share.ttlHours,
        expiresAt: share.expiresAt.toISOString(),
        createdAt: share.createdAt.toISOString(),
      }}
      isExpired={isExpired}
    />
  );
}

