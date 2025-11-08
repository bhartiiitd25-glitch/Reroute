"use client";

import { useState } from "react";
import GoogleMapsLoader from "@/components/GoogleMapsLoader";
import MapComponent from "@/components/MapComponent";
import SearchBox from "@/components/SearchBox";
import { encodePolyline, type LatLng } from "@/lib/polyline";

export default function HomePage() {
  
  // General route state
  const [destination, setDestination] = useState<LatLng | null>(null);
  const [path, setPath] = useState<LatLng[]>([]);
  const [note, setNote] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchOrigin, setSearchOrigin] = useState<{ lat: number; lng: number; address: string } | undefined>();
  const [searchDestination, setSearchDestination] = useState<{ lat: number; lng: number; address: string } | undefined>();
  const [waypoints, setWaypoints] = useState<Array<{ lat: number; lng: number; address: string }>>([]);
  const [isDrawingCustomRoute, setIsDrawingCustomRoute] = useState(false);

  const handleShare = async () => {
    if (!destination || path.length < 2) {
      setError("Please select origin, destination and draw a route");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const encodedPolyline = encodePolyline(path);
      const body = {
        routeType: "general",
        destLat: destination.lat,
        destLng: destination.lng,
        encodedPolyline,
        note: note || undefined,
      };
      
      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create share");
      }

      const data = await response.json();
      const fullUrl = `${window.location.origin}${data.url}`;
      setShareUrl(fullUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create share");
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
    }
  };

  const reset = () => {
    setDestination(null);
    setPath([]);
    setNote("");
    setShareUrl(null);
    setError(null);
    setSearchOrigin(undefined);
    setSearchDestination(undefined);
    setWaypoints([]);
    setIsDrawingCustomRoute(false);
  };

  const removeWaypoint = (index: number) => {
    setWaypoints(waypoints.filter((_, i) => i !== index));
  };

  const startDrawing = () => {
    if (!searchOrigin || !searchDestination) {
      setError("Please set both starting point (A) and destination (B) before drawing a custom route.");
      return;
    }

    setError(null);
    setIsDrawingCustomRoute(true);
    setDestination({ lat: searchDestination.lat, lng: searchDestination.lng });
    setPath([]); // Clear any existing path
  };

  const drawDirectRoute = () => {
    if (!searchOrigin || !searchDestination) return;
    
    // Create a simple path from origin to destination
    // This will be a straight line, but you can also use Directions API for road routes
    const directPath = [
      { lat: searchOrigin.lat, lng: searchOrigin.lng },
      { lat: searchDestination.lat, lng: searchDestination.lng }
    ];
    
    setPath(directPath);
    setDestination({ lat: searchDestination.lat, lng: searchDestination.lng });
  };

  const drawRouteWithDirections = async () => {
    if (!searchOrigin || !searchDestination) return;
    
    // Check if Google Maps is loaded
    if (typeof window === "undefined" || !window.google || !window.google.maps) {
      console.error("Google Maps not loaded");
      drawDirectRoute();
      return;
    }
    
    try {
      // Use Google Directions API to get a route that follows roads
      const directionsService = new window.google.maps.DirectionsService();
      
      await new Promise<void>((resolve, reject) => {
        directionsService.route(
          {
            origin: { lat: searchOrigin.lat, lng: searchOrigin.lng },
            destination: { lat: searchDestination.lat, lng: searchDestination.lng },
            travelMode: window.google.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === window.google.maps.DirectionsStatus.OK && result) {
              const route = result.routes[0];
              const path: LatLng[] = [];
              
              // Extract path from the route
              route.legs.forEach((leg) => {
                leg.steps.forEach((step) => {
                  step.path.forEach((point) => {
                    path.push({ lat: point.lat(), lng: point.lng() });
                  });
                });
              });

              setPath(path);
              setDestination({ lat: searchDestination.lat, lng: searchDestination.lng });
              resolve();
            } else {
              console.error("Directions request failed:", status);
              reject(new Error(`Directions request failed: ${status}`));
            }
          }
        );
      });
    } catch (error) {
      console.error("Error getting directions:", error);
      // Fallback to direct line if Directions API fails
      drawDirectRoute();
    }
  };

  return (
    <GoogleMapsLoader>
      <div className="flex h-screen flex-col">
        <header className="border-b bg-white px-6 py-4 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">PathShare</h1>
            <p className="text-sm text-gray-600">Share your custom routes with anyone</p>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Map */}
          <div className="flex-1">
            <MapComponent
              mode="create"
              searchOrigin={searchOrigin}
              searchDestination={searchDestination}
              waypoints={waypoints}
              isDrawingCustomRoute={isDrawingCustomRoute}
              currentPath={path}
              onDestinationChange={setDestination}
              onPathChange={setPath}
              onCustomDrawComplete={() => setIsDrawingCustomRoute(false)}
            />
          </div>

          {/* Sidebar */}
          <div className="w-96 overflow-y-auto border-l bg-white p-6">
            <div className="space-y-6">
              <div>
                <h2 className="mb-3 text-lg font-semibold">Route Planner</h2>
                
                {/* Origin Search */}
                <div className="mb-3">
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    🟢 Starting Point
                  </label>
                  <SearchBox
                    onPlaceSelect={(place) => {
                      setSearchOrigin(place);
                    }}
                  />
                </div>

                {/* Destination Search */}
                <div className="mb-3">
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    🔴 Destination
                  </label>
                  <SearchBox
                    onPlaceSelect={(place) => {
                      setSearchDestination(place);
                    }}
                  />
                </div>

                {/* Waypoints Section */}
                {searchOrigin && searchDestination && (
                  <div className="mb-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-gray-700">
                        🔵 Waypoints (Optional)
                      </label>
                      <button
                        onClick={() => setWaypoints([...waypoints, { lat: 0, lng: 0, address: "" }])}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        + Add Waypoint
                      </button>
                    </div>
                    {waypoints.map((waypoint, index) => (
                      <div key={index} className="flex gap-2">
                        <div className="flex-1">
                          <SearchBox
                            onPlaceSelect={(place) => {
                              const newWaypoints = [...waypoints];
                              newWaypoints[index] = place;
                              setWaypoints(newWaypoints);
                            }}
                          />
                        </div>
                        <button
                          onClick={() => removeWaypoint(index)}
                          className="rounded bg-red-100 px-2 text-red-600 hover:bg-red-200"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
        </div>
                )}

                {/* Route Drawing Buttons */}
                {searchOrigin && searchDestination && !isDrawingCustomRoute && (
                  <div className="space-y-2">
                    <button
                      onClick={drawRouteWithDirections}
                      className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      🗺️ Draw Route (A to B)
                    </button>
                    <button
                      onClick={drawDirectRoute}
                      className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                    >
                      📏 Draw Straight Line (A to B)
                    </button>
                    <button
                      onClick={startDrawing}
                      className="w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
                    >
                      ✏️ Draw Custom Route
                    </button>
                  </div>
                )}
              </div>

              {!searchOrigin || !searchDestination ? (
                <div className="rounded-lg bg-blue-50 p-4">
                  <p className="text-sm font-medium text-blue-900">How to use:</p>
                  <ol className="mt-2 space-y-1 text-xs text-blue-800">
                    <li>1. Search for your starting point (A)</li>
                    <li>2. Search for your destination (B)</li>
                    <li>3. Click &quot;Draw Route (A to B)&quot; for automatic route</li>
                    <li>4. Or click &quot;Draw Straight Line&quot; for direct line</li>
                    <li>5. Or click &quot;Draw Custom Route&quot; to draw manually</li>
                    <li>6. Add note and share!</li>
                  </ol>
                </div>
              ) : null}

              {/* Status */}
              <div className="rounded-lg bg-gray-50 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Origin:</span>
                  <span className={searchOrigin ? "text-green-600" : "text-gray-400"}>
                    {searchOrigin ? "✓ Set" : "Not set"}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-gray-700">Destination:</span>
                  <span className={searchDestination ? "text-green-600" : "text-gray-400"}>
                    {searchDestination ? "✓ Set" : "Not set"}
                  </span>
                </div>
                {waypoints.length > 0 && (
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-gray-700">Waypoints:</span>
                    <span className="text-blue-600">
                      {waypoints.length}
                    </span>
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-gray-700">Route:</span>
                  <span className={path.length > 1 ? "text-green-600" : "text-gray-400"}>
                    {path.length > 1 
                      ? `✓ ${path.length} pts`
                      : isDrawingCustomRoute ? "✏️ Drawing..." : "Not ready"}
                  </span>
                </div>
              </div>

              {/* Note */}
              <div>
                <label htmlFor="note" className="mb-2 block text-sm font-medium text-gray-700">
                  Note (optional)
                </label>
                <textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  placeholder="Add context for your route..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows={3}
                />
                <p className="mt-1 text-xs text-gray-500">{note.length}/500 characters</p>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              {/* Share URL */}
              {shareUrl && (
                <div className="rounded-lg bg-green-50 p-4">
                  <p className="mb-2 text-sm font-medium text-green-900">Share link created!</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-1 rounded border border-green-300 bg-white px-3 py-2 text-sm"
                    />
                    <button
                      onClick={copyToClipboard}
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
                    >
                      Copy
                    </button>
                  </div>
                  <button
                    onClick={reset}
                    className="mt-3 w-full rounded-lg bg-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-700"
                  >
                    Create Another
                  </button>
                </div>
              )}

              {/* Share Button */}
              {!shareUrl && (
                <button
                  onClick={handleShare}
                  disabled={isCreating || !destination || path.length < 2}
                  className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreating ? "Creating..." : "Share"}
                </button>
              )}
            </div>
          </div>
        </div>
    </div>
    </GoogleMapsLoader>
  );
}
