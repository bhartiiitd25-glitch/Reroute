"use client";

import { useEffect, useRef, useState } from "react";

interface SearchBoxProps {
  onPlaceSelect: (place: { lat: number; lng: number; address: string }) => void;
}

/**
 * Google Places search box component
 */
export default function SearchBox({ onPlaceSelect }: SearchBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!inputRef.current || autocomplete) return;

    // Initialize Google Places Autocomplete
    const autocompleteInstance = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ["formatted_address", "geometry", "name"],
      types: ["geocode", "establishment"],
    });

    autocompleteInstance.addListener("place_changed", () => {
      const place = autocompleteInstance.getPlace();

      if (place.geometry?.location) {
        onPlaceSelect({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          address: place.formatted_address || place.name || "",
        });
      }
    });

    setAutocomplete(autocompleteInstance);
  }, [autocomplete, onPlaceSelect]);

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search for a location..."
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <svg
          className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
    </div>
  );
}

