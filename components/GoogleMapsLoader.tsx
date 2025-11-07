"use client";

import { useEffect, useState } from "react";

/**
 * Loads the Google Maps JavaScript SDK
 */
export default function GoogleMapsLoader({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      setError("Google Maps API key not configured");
      return;
    }

    // Check if already loaded
    if (window.google?.maps) {
      setLoaded(true);
      return;
    }

    // Load script
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => setLoaded(true);
    script.onerror = () => setError("Failed to load Google Maps");
    
    document.head.appendChild(script);

    return () => {
      // Cleanup handled by React
    };
  }, []);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="rounded-lg bg-red-50 p-6 text-red-800">
          <h2 className="text-lg font-semibold">Error loading maps</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-600">Loading maps...</div>
      </div>
    );
  }

  return <>{children}</>;
}

