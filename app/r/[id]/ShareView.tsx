"use client";

import GoogleMapsLoader from "@/components/GoogleMapsLoader";
import MapComponent from "@/components/MapComponent";
import Link from "next/link";
import { useState } from "react";

interface ShareData {
  id: string;
  routeType: string;
  destLat: number;
  destLng: number;
  encodedPolyline: string;
  xLat?: number;
  xLng?: number;
  yLat?: number;
  yLng?: number;
  encodedXY?: string;
  note?: string;
  ttlHours: number;
  expiresAt: string;
  createdAt: string;
}

interface ShareViewProps {
  share: ShareData;
  isExpired: boolean;
}

/**
 * Client component for viewing shared routes
 */
export default function ShareView({ share, isExpired }: ShareViewProps) {
  const [copied, setCopied] = useState(false);
  const isMicroRoute = share.routeType === "microroute";

  // For general routes: navigate to destination
  // For micro-routes: navigate to X (mid-point)
  const navigationLat = isMicroRoute ? share.xLat : share.destLat;
  const navigationLng = isMicroRoute ? share.xLng : share.destLng;
  
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${navigationLat},${navigationLng}`;
  const appleMapsUrl = `http://maps.apple.com/?daddr=${navigationLat},${navigationLng}`;

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (isExpired) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
          <div className="mb-4 text-6xl">⏰</div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Share Expired</h1>
          <p className="mb-6 text-gray-600">
            This route share expired on {formatDate(share.expiresAt)}.
          </p>
          <Link
            href="/"
            className="inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Create Your Own Share
          </Link>
        </div>
      </div>
    );
  }

  return (
    <GoogleMapsLoader>
      <div className="flex h-screen flex-col">
        <header className="border-b bg-white px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">PathShare</h1>
              <p className="text-sm text-gray-600">Shared route</p>
            </div>
            <Link
              href="/"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Create Your Own
            </Link>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Map */}
          <div className="flex-1">
            <MapComponent
              mode="view"
              destination={{ lat: share.destLat, lng: share.destLng }}
              encodedPath={share.encodedPolyline}
            />
          </div>

          {/* Sidebar */}
          <div className="w-96 overflow-y-auto border-l bg-white p-6">
            <div className="space-y-6">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <h2 className="text-lg font-semibold">
                    {isMicroRoute ? "X→Y Micro-Route" : "Route Details"}
                  </h2>
                  {isMicroRoute && (
                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                      Last-Mile
                    </span>
                  )}
                </div>
                
                {isMicroRoute && (
                  <div className="mb-3 rounded-lg bg-purple-50 p-3 text-sm text-purple-900">
                    <p className="font-medium">📍 How to use this micro-route:</p>
                    <ol className="mt-2 space-y-1 text-xs">
                      <li>1. Navigate to <strong>X (Mid Point)</strong> using the buttons below</li>
                      <li>2. Once near X, follow the <strong>highlighted path</strong> to reach Y</li>
                      <li>3. Y is your final destination (doorstep/entrance)</li>
                    </ol>
                  </div>
                )}
                
                {share.note && (
                  <div className="mt-3 rounded-lg bg-gray-50 p-4">
                    <p className="text-xs font-medium text-gray-500">Note:</p>
                    <p className="mt-1 text-sm text-gray-700">{share.note}</p>
                  </div>
                )}
              </div>

              {/* Expiration Warning */}
              <div className="rounded-lg bg-yellow-50 p-4">
                <p className="text-sm text-yellow-900">
                  <strong>⏰ Expires:</strong> {formatDate(share.expiresAt)}
                  {isMicroRoute && (
                    <span className="mt-1 block text-xs">
                      ({share.ttlHours}h TTL)
                    </span>
                  )}
                </p>
              </div>

              {/* Location Info */}
              {isMicroRoute ? (
                <div className="space-y-2">
                  <div className="rounded-lg bg-purple-50 p-4 text-sm">
                    <p className="font-medium text-purple-900">
                      📍 X - Mid Point
                    </p>
                    <p className="mt-1 font-mono text-xs text-purple-700">
                      {share.xLat?.toFixed(6)}, {share.xLng?.toFixed(6)}
                    </p>
                    <p className="mt-1 text-xs text-purple-600">
                      Easy to reach via standard navigation
                    </p>
                  </div>
                  <div className="rounded-lg bg-red-50 p-4 text-sm">
                    <p className="font-medium text-red-900">
                      🎯 Y - Final Destination
                    </p>
                    <p className="mt-1 font-mono text-xs text-red-700">
                      {share.yLat?.toFixed(6)}, {share.yLng?.toFixed(6)}
                    </p>
                    <p className="mt-1 text-xs text-red-600">
                      Follow micro-route from X to reach here
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-gray-50 p-4 text-sm">
                  <p className="text-gray-700">
                    <strong>Destination:</strong>
                  </p>
                  <p className="mt-1 font-mono text-xs text-gray-600">
                    {share.destLat.toFixed(6)}, {share.destLng.toFixed(6)}
                  </p>
                </div>
              )}

              {/* Navigation Actions */}
              <div className="space-y-3">
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
                >
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                  {isMicroRoute ? "Navigate to X in Google Maps" : "Open in Google Maps"}
                </a>

                {isMicroRoute && (
                  <a
                    href={appleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                    Navigate to X in Apple Maps
                  </a>
                )}

                <button
                  onClick={copyLink}
                  className="w-full rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
                >
                  {copied ? "✓ Copied!" : "Copy Share Link"}
                </button>
              </div>

              <p className="text-center text-xs text-gray-500">
                Created {formatDate(share.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </GoogleMapsLoader>
  );
}

