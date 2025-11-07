import { decode, encode } from "@googlemaps/polyline-codec";

/**
 * Polyline encoding/decoding utilities using Google's library
 */

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Encodes an array of coordinates into a polyline string
 */
export function encodePolyline(path: LatLng[]): string {
  const tuples: [number, number][] = path.map((p) => [p.lat, p.lng]);
  return encode(tuples, 5);
}

/**
 * Decodes a polyline string into an array of coordinates
 */
export function decodePolyline(encoded: string): LatLng[] {
  const tuples = decode(encoded, 5);
  return tuples.map(([lat, lng]) => ({ lat, lng }));
}

/**
 * Snaps a path to roads using Google Roads API
 */
export async function snapToRoads(path: LatLng[]): Promise<LatLng[]> {
  const apiKey = typeof window !== "undefined"
  ? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  : process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY not configured");
  }

  // Limit to 100 points per request (Roads API limit)
  const maxPoints = 100;
  if (path.length > maxPoints) {
    // Sample points evenly
    const step = Math.ceil(path.length / maxPoints);
    path = path.filter((_, i) => i % step === 0);
  }

  const pathString = path.map((p) => `${p.lat},${p.lng}`).join("|");
  const url = `https://roads.googleapis.com/v1/snapToRoads?path=${pathString}&interpolate=true&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Roads API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.snappedPoints || data.snappedPoints.length === 0) {
    throw new Error("Roads API returned no snapped points");
  }

  return data.snappedPoints.map((point: { location: { latitude: number; longitude: number } }) => ({
    lat: point.location.latitude,
    lng: point.location.longitude,
  }));
}

