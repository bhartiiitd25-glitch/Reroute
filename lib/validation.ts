/**
 * Validation utilities for PathShare
 */

/**
 * Clamps latitude to 6 decimal places (precision ~11cm)
 * and ensures it's within valid range [-90, 90]
 */
export function clampLat(lat: number): number {
  const clamped = Math.max(-90, Math.min(90, lat));
  return Number(clamped.toFixed(6));
}

/**
 * Clamps longitude to 6 decimal places (precision ~11cm)
 * and ensures it's within valid range [-180, 180]
 */
export function clampLng(lng: number): number {
  const clamped = Math.max(-180, Math.min(180, lng));
  return Number(clamped.toFixed(6));
}

/**
 * Validates that a string is a valid encoded polyline
 * Basic validation: must be non-empty and contain only valid polyline characters
 */
export function isValidEncodedPolyline(polyline: string): boolean {
  if (!polyline || typeof polyline !== "string") return false;
  // Polyline encoding uses characters in the range 63-126 (ASCII)
  return /^[?@A-Z[\\\]^_`a-z{|}~]+$/.test(polyline);
}

/**
 * Validates note length (max 500 chars)
 */
export function isValidNote(note: string | undefined): boolean {
  if (!note) return true;
  return typeof note === "string" && note.length <= 500;
}

/**
 * Creates an expiration date (default 24 hours from now)
 */
export function createExpirationDate(hoursFromNow: number = 24): Date {
  const date = new Date();
  date.setHours(date.getHours() + hoursFromNow);
  return date;
}

