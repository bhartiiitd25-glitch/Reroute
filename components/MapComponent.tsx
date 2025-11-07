"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LatLng } from "@/lib/polyline";

interface MapComponentProps {
  mode: "create" | "view";
  destination?: LatLng;
  encodedPath?: string;
  searchOrigin?: { lat: number; lng: number; address: string };
  searchDestination?: { lat: number; lng: number; address: string };
  waypoints?: Array<{ lat: number; lng: number; address: string }>;
  isDrawingCustomRoute?: boolean;
  onDestinationChange?: (dest: LatLng) => void;
  onPathChange?: (path: LatLng[]) => void;
  onCustomDrawComplete?: () => void;
}

/**
 * Google Maps component for creating or viewing routes
 */
export default function MapComponent({
  mode,
  destination,
  encodedPath,
  searchOrigin,
  searchDestination,
  waypoints = [],
  isDrawingCustomRoute,
  onDestinationChange,
  onPathChange,
  onCustomDrawComplete,
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const [polyline, setPolyline] = useState<google.maps.Polyline | null>(null);
  const [drawingPath, setDrawingPath] = useState<LatLng[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [waitingForStart, setWaitingForStart] = useState(false);
  const [originMarker, setOriginMarker] = useState<google.maps.Marker | null>(null);
  const [destMarker, setDestMarker] = useState<google.maps.Marker | null>(null);
  const [isMapStable, setIsMapStable] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || map) return;

    const newMap = new google.maps.Map(mapRef.current, {
      center: { lat: 37.7749, lng: -122.4194 }, // San Francisco default
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    // Wait for map to be idle (stable) before allowing drawing
    const idleListener = newMap.addListener("idle", () => {
      setIsMapStable(true);
    });

    setMap(newMap);

    return () => {
      google.maps.event.removeListener(idleListener);
    };
  }, [map]);

  // Handle origin search location
  useEffect(() => {
    if (!map || !searchOrigin) return;

    // Remove old origin marker
    const currentOriginMarker = originMarker;
    if (currentOriginMarker) {
      currentOriginMarker.setMap(null);
    }

    // Create new origin marker
    const newOriginMarker = new google.maps.Marker({
      position: { lat: searchOrigin.lat, lng: searchOrigin.lng },
      map,
      title: "Origin: " + searchOrigin.address,
      label: {
        text: "A",
        color: "white",
        fontWeight: "bold",
      },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#4285F4",
        fillOpacity: 1,
        strokeColor: "white",
        strokeWeight: 2,
      },
    });

    setOriginMarker(newOriginMarker);
    map.setCenter({ lat: searchOrigin.lat, lng: searchOrigin.lng });
    map.setZoom(15);

    return () => {
      newOriginMarker.setMap(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, searchOrigin]);

  // Handle destination search location
  useEffect(() => {
    if (!map || !searchDestination) return;

    // Remove old destination marker
    const currentDestMarker = destMarker;
    if (currentDestMarker) {
      currentDestMarker.setMap(null);
    }

    // Create new destination marker
    const newDestMarker = new google.maps.Marker({
      position: { lat: searchDestination.lat, lng: searchDestination.lng },
      map,
      title: "Destination: " + searchDestination.address,
      label: {
        text: "B",
        color: "white",
        fontWeight: "bold",
      },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#EA4335",
        fillOpacity: 1,
        strokeColor: "white",
        strokeWeight: 2,
      },
    });

    setDestMarker(newDestMarker);

    // If both origin and destination exist, fit bounds to show both
    if (searchOrigin) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: searchOrigin.lat, lng: searchOrigin.lng });
      bounds.extend({ lat: searchDestination.lat, lng: searchDestination.lng });
      map.fitBounds(bounds);
    }

    return () => {
      newDestMarker.setMap(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, searchDestination, searchOrigin]);

  // Set destination when searchDestination changes
  useEffect(() => {
    if (searchDestination && onDestinationChange) {
      onDestinationChange({
        lat: searchDestination.lat,
        lng: searchDestination.lng,
      });
    }
  }, [searchDestination, onDestinationChange]);

  // View mode: Display destination and path
  useEffect(() => {
    if (!map || mode !== "view" || !destination) return;

    // Set destination marker
    const newMarker = new google.maps.Marker({
      position: destination,
      map,
      title: "Destination",
    });
    setMarker(newMarker);
    map.setCenter(destination);

    // Decode and display path
    if (encodedPath) {
      const google = window.google;
      const path = google.maps.geometry.encoding.decodePath(encodedPath);
      const newPolyline = new google.maps.Polyline({
        path,
        strokeColor: "#4285F4",
        strokeWeight: 4,
        map,
      });
      setPolyline(newPolyline);

      // Fit bounds to show entire route
      const bounds = new google.maps.LatLngBounds();
      path.forEach((p: google.maps.LatLng) => bounds.extend(p));
      map.fitBounds(bounds);
    }

    return () => {
      newMarker.setMap(null);
      if (polyline) polyline.setMap(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, mode, destination, encodedPath]);

  // Create mode: Handle destination selection
  useEffect(() => {
    if (!map || mode !== "create") return;

    const clickListener = map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;

      const lat = e.latLng.lat();
      const lng = e.latLng.lng();

      // Update destination marker
      if (marker) {
        marker.setPosition({ lat, lng });
      } else {
        const newMarker = new google.maps.Marker({
          position: { lat, lng },
          map,
          title: "Destination",
        });
        setMarker(newMarker);
      }

      onDestinationChange?.({ lat, lng });
    });

    return () => {
      google.maps.event.removeListener(clickListener);
    };
  }, [map, mode, marker, onDestinationChange]);

  const snapPathToRoads = useCallback(async (path: LatLng[]) => {
    try {
      const response = await fetch("/api/snap-to-roads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });

      if (!response.ok) throw new Error("Failed to snap to roads");

      const data = await response.json();
      const snappedPath = data.path;

      // Update polyline with snapped path
      if (polyline) {
        polyline.setPath(snappedPath);
      }

      setDrawingPath(snappedPath);
      onPathChange?.(snappedPath);

      // Zoom out to show the full route
      if (map && snappedPath.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        snappedPath.forEach((point: LatLng) => {
          bounds.extend({ lat: point.lat, lng: point.lng });
        });
        map.fitBounds(bounds);
      }
    } catch (error) {
      console.error("Error snapping to roads:", error);
      // Fall back to original path
      onPathChange?.(path);

      // Still zoom out to show the route even if snapping fails
      if (map && path.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        path.forEach((point: LatLng) => {
          bounds.extend({ lat: point.lat, lng: point.lng });
        });
        map.fitBounds(bounds);
      }
    }
  }, [polyline, onPathChange, map]);

  // Handle custom drawing mode activation - change cursor to pencil immediately
  useEffect(() => {
    if (!map || !isDrawingCustomRoute || !isMapStable) {
      // Reset cursor when not drawing
      if (map && !isDrawingCustomRoute) {
        map.setOptions({ draggable: true });
        // Remove cursor style from map container and all children
        if (mapRef.current) {
          mapRef.current.style.cursor = "";
          const mapDiv = map.getDiv();
          if (mapDiv) {
            mapDiv.style.cursor = "";
            // Remove cursor from all child elements
            const allElements = mapDiv.querySelectorAll("*");
            allElements.forEach((el: Element) => {
              (el as HTMLElement).style.cursor = "";
            });
          }
        }
      }
      return;
    }
    
    // Clear any existing polyline
    if (polyline) {
      polyline.setMap(null);
      setPolyline(null);
    }
    
    // Disable map dragging and set cursor
    map.setOptions({ draggable: false });
    
    // Function to apply crosshair cursor to all elements
    const applyCrosshairCursor = () => {
      if (!mapRef.current) return;
      const mapDiv = map.getDiv();
      if (mapDiv) {
        mapDiv.style.cursor = "crosshair";
        mapDiv.style.setProperty("cursor", "crosshair", "important");
        // Set cursor on all child elements (especially the canvas)
        const allElements = mapDiv.querySelectorAll("*");
        allElements.forEach((el: Element) => {
          const htmlEl = el as HTMLElement;
          htmlEl.style.cursor = "crosshair";
          htmlEl.style.setProperty("cursor", "crosshair", "important");
        });
      }
    };
    
    // Apply cursor immediately
    applyCrosshairCursor();
    
    // Continuously reapply cursor (Google Maps might reset it)
    const cursorInterval = setInterval(applyCrosshairCursor, 100);
    
    // Also apply on mouse move (most reliable)
    const cursorMouseMove = map.addListener("mousemove", applyCrosshairCursor);
    
    // Start the drawing process - wait for user to click on map
    setWaitingForStart(true);
    setIsDrawing(false);
    setDrawingPath([]);
    
    return () => {
      clearInterval(cursorInterval);
      google.maps.event.removeListener(cursorMouseMove);
    };
  }, [map, isDrawingCustomRoute, isMapStable, polyline]);

  // Handle waiting for start point - user clicks on map to start drawing
  useEffect(() => {
    if (!map || mode !== "create" || !waitingForStart || !isMapStable || !isDrawingCustomRoute) {
      return;
    }

    const clickListener = map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      
      // Set start point immediately
      setDrawingPath([{ lat, lng }]);
      setWaitingForStart(false);
      setIsDrawing(true);
      
      // Create polyline
      const newPolyline = new google.maps.Polyline({
        path: [{ lat, lng }],
        strokeColor: "#4285F4",
        strokeWeight: 4,
        map,
      });
      setPolyline(newPolyline);
    });

    return () => {
      google.maps.event.removeListener(clickListener);
    };
  }, [map, mode, waitingForStart, isMapStable, isDrawingCustomRoute]);

  // Create mode: Handle route drawing
  useEffect(() => {
    if (!map || mode !== "create" || !isDrawing) return;

    // Disable map dragging
    map.setOptions({ draggable: false });
    
    // Force cursor to crosshair on map and all child elements
    if (mapRef.current) {
      const mapDiv = map.getDiv();
      if (mapDiv) {
        mapDiv.style.cursor = "crosshair";
        mapDiv.style.setProperty("cursor", "crosshair", "important");
        // Set cursor on all child elements (especially the canvas)
        const allElements = mapDiv.querySelectorAll("*");
        allElements.forEach((el: Element) => {
          const htmlEl = el as HTMLElement;
          htmlEl.style.cursor = "crosshair";
          htmlEl.style.setProperty("cursor", "crosshair", "important");
        });
      }
    }

    const moveListener = map.addListener("mousemove", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      
      // Pan map to follow cursor (keep cursor centered)
      const mapDiv = map.getDiv();
      const bounds = map.getBounds();
      if (bounds) {
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        const latRange = ne.lat() - sw.lat();
        const lngRange = ne.lng() - sw.lng();
        
        // Define a buffer zone - if cursor gets within 20% of edge, pan the map
        const bufferLat = latRange * 0.2;
        const bufferLng = lngRange * 0.2;
        
        const center = map.getCenter();
        if (center) {
          let needsPan = false;
          let newLat = center.lat();
          let newLng = center.lng();
          
          if (lat > ne.lat() - bufferLat) {
            newLat = lat + bufferLat;
            needsPan = true;
          } else if (lat < sw.lat() + bufferLat) {
            newLat = lat - bufferLat;
            needsPan = true;
          }
          
          if (lng > ne.lng() - bufferLng) {
            newLng = lng + bufferLng;
            needsPan = true;
          } else if (lng < sw.lng() + bufferLng) {
            newLng = lng - bufferLng;
            needsPan = true;
          }
          
          if (needsPan) {
            map.panTo({ lat: newLat, lng: newLng });
          }
        }
      }
      
      setDrawingPath((prev) => {
        const newPath = [...prev, { lat, lng }];
        
        // Update polyline
        if (polyline) {
          polyline.setPath(newPath);
        }
        
        return newPath;
      });
    });

    const clickListener = map.addListener("click", () => {
      // Stop drawing
      setIsDrawing(false);
      map.setOptions({ draggable: true });
      
      // Reset cursor on map container and all child elements
      if (mapRef.current) {
        mapRef.current.style.cursor = "";
        const mapDiv = map.getDiv();
        if (mapDiv) {
          mapDiv.style.cursor = "";
          // Reset cursor on all child elements
          const allElements = mapDiv.querySelectorAll("*");
          allElements.forEach((el: Element) => {
            (el as HTMLElement).style.cursor = "";
          });
        }
      }
      
      // Snap to roads and update
      if (drawingPath.length > 1) {
        snapPathToRoads(drawingPath);
      }
      
      // Notify parent that custom drawing is complete
      if (onCustomDrawComplete) {
        onCustomDrawComplete();
      }
    });

    return () => {
      google.maps.event.removeListener(moveListener);
      google.maps.event.removeListener(clickListener);
      map.setOptions({ draggable: true });
      if (mapRef.current) {
        mapRef.current.style.cursor = "";
        const mapDiv = map.getDiv();
        if (mapDiv) {
          mapDiv.style.cursor = "";
          const allElements = mapDiv.querySelectorAll("*");
          allElements.forEach((el: Element) => {
            (el as HTMLElement).style.cursor = "";
          });
        }
      }
    };
  }, [map, mode, isDrawing, polyline, drawingPath, snapPathToRoads, onCustomDrawComplete]);

  const resetDrawing = () => {
    setIsDrawing(false);
    setWaitingForStart(false);
    setDrawingPath([]);
    
    if (map) {
      map.setOptions({ draggable: true });
      const mapDiv = map.getDiv();
      if (mapDiv) {
        mapDiv.style.cursor = "";
        // Reset cursor on all child elements
        const allElements = mapDiv.querySelectorAll("*");
        allElements.forEach((el: Element) => {
          (el as HTMLElement).style.cursor = "";
        });
      }
    }
    
    // Reset cursor on map container
    if (mapRef.current) {
      mapRef.current.style.cursor = "";
    }
    
    if (polyline) {
      polyline.setMap(null);
      setPolyline(null);
    }
    
    if (marker) {
      marker.setMap(null);
      setMarker(null);
    }

    // Clear search markers
    if (originMarker) {
      originMarker.setMap(null);
      setOriginMarker(null);
    }

    if (destMarker) {
      destMarker.setMap(null);
      setDestMarker(null);
    }
    
    onPathChange?.([]);
    if (onDestinationChange) {
      onDestinationChange({ lat: 0, lng: 0 });
    }
  };

  return (
    <div className="relative h-full w-full">
      <div 
        ref={mapRef} 
        className="h-full w-full"
        style={{
          cursor: (isDrawingCustomRoute && (waitingForStart || isDrawing)) ? "crosshair !important" : "default"
        } as React.CSSProperties}
      />
      {mode === "create" && isDrawingCustomRoute && (waitingForStart || isDrawing) && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          <div className="rounded-lg bg-white px-6 py-3 shadow-lg">
            <p className="text-sm font-medium text-gray-900">
              {waitingForStart
                ? "🎯 Click on map to start drawing..."
                : "✏️ Drawing... click again to finish"}
            </p>
          </div>
          <button
            onClick={resetDrawing}
            className="rounded-lg bg-gray-600 px-4 py-2 text-white shadow-lg hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

