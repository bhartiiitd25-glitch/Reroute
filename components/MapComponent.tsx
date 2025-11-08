"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LatLng } from "@/lib/polyline";

const PENCIL_ICON_URL =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
      <g filter="url(#shadow)">
        <path d="M48 88 L42 70 L54 70 Z" fill="#1d4ed8"/>
        <circle cx="48" cy="88" r="6" fill="#1d4ed8"/>
      </g>
      <g transform="translate(28 18) rotate(-35 20 20)">
        <rect x="18" y="0" width="12" height="36" rx="4" fill="#fcd34d"/>
        <rect x="18" y="0" width="12" height="12" rx="4" fill="#fbbf24"/>
        <polygon points="24,-6 16,0 32,0" fill="#f59e0b"/>
        <polygon points="24,36 16,50 24,56 32,50" fill="#4b5563"/>
        <polygon points="24,50 20,58 24,62 28,58" fill="#111827"/>
      </g>
      <defs>
        <filter id="shadow" x="32" y="64" width="32" height="32" filterUnits="userSpaceOnUse">
          <feOffset dy="2" />
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.2 0"/>
        </filter>
      </defs>
    </svg>`
  );

interface MapComponentProps {
  mode: "create" | "view";
  destination?: LatLng;
  encodedPath?: string;
  searchOrigin?: { lat: number; lng: number; address: string };
  searchDestination?: { lat: number; lng: number; address: string };
  waypoints?: Array<{ lat: number; lng: number; address: string }>;
  isDrawingCustomRoute?: boolean;
  currentPath?: LatLng[]; // Path to display on map
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
  currentPath,
  onDestinationChange,
  onPathChange,
  onCustomDrawComplete,
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const [polyline, setPolyline] = useState<google.maps.Polyline | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const [drawingPath, setDrawingPath] = useState<LatLng[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [waitingForStart, setWaitingForStart] = useState(false);
  const [originMarker, setOriginMarker] = useState<google.maps.Marker | null>(null);
  const [destMarker, setDestMarker] = useState<google.maps.Marker | null>(null);
  const [isMapStable, setIsMapStable] = useState(false);
  const pencilMarkerRef = useRef<google.maps.Marker | null>(null);

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
      title: isDrawingCustomRoute && waitingForStart 
        ? "Click here to start drawing your route!" 
        : "Origin: " + searchOrigin.address,
      label: {
        text: "A",
        color: "white",
        fontWeight: "bold",
        fontSize: isDrawingCustomRoute && waitingForStart ? "14px" : "12px",
      },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: isDrawingCustomRoute && waitingForStart ? 14 : 10, // Larger when waiting for click
        fillColor: isDrawingCustomRoute && waitingForStart ? "#1E90FF" : "#4285F4", // Brighter blue when waiting
        fillOpacity: 1,
        strokeColor: "white",
        strokeWeight: isDrawingCustomRoute && waitingForStart ? 3 : 2, // Thicker border when waiting
      },
      cursor: isDrawingCustomRoute && waitingForStart ? "pointer" : "default",
      clickable: true,
      zIndex: isDrawingCustomRoute && waitingForStart ? 1000 : undefined, // Bring to front when waiting
    });

    // Add click listener to origin marker when in drawing mode
    let markerClickListener: google.maps.MapsEventListener | null = null;
    let markerMouseDownListener: google.maps.MapsEventListener | null = null;
    if (isDrawingCustomRoute && waitingForStart) {
      markerMouseDownListener = newOriginMarker.addListener("mousedown", (e: google.maps.MapMouseEvent) => {
        e.stop(); // Prevent event propagation
        if (map && searchOrigin && searchDestination) {
          startDrawingFromOrigin(true);
        }
      });
      markerClickListener = newOriginMarker.addListener("click", (e: google.maps.MapMouseEvent) => {
        e.stop(); // Prevent event propagation
        // Start drawing from origin when marker is clicked
        if (map && searchOrigin && searchDestination) {
          startDrawingFromOrigin();
        }
      });
    }

    setOriginMarker(newOriginMarker);
    
    // Only auto-center if not in drawing mode
    if (!isDrawingCustomRoute) {
      map.setCenter({ lat: searchOrigin.lat, lng: searchOrigin.lng });
      map.setZoom(15);
    }

    return () => {
      if (markerClickListener) {
        google.maps.event.removeListener(markerClickListener);
      }
      if (markerMouseDownListener) {
        google.maps.event.removeListener(markerMouseDownListener);
      }
      newOriginMarker.setMap(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, searchOrigin, isDrawingCustomRoute, waitingForStart]);

  // Show pencil icon pointing at origin during custom draw setup
  useEffect(() => {
    if (!map) return;

    if (!isDrawingCustomRoute || !waitingForStart || !searchOrigin) {
      if (pencilMarkerRef.current) {
        pencilMarkerRef.current.setMap(null);
        pencilMarkerRef.current = null;
      }
      return;
    }

    const icon: google.maps.Icon = {
      url: PENCIL_ICON_URL,
      scaledSize: new google.maps.Size(64, 64),
      anchor: new google.maps.Point(32, 60),
    };

    if (pencilMarkerRef.current) {
      pencilMarkerRef.current.setIcon(icon);
      pencilMarkerRef.current.setPosition({ lat: searchOrigin.lat, lng: searchOrigin.lng });
      pencilMarkerRef.current.setMap(map);
      pencilMarkerRef.current.setZIndex(900);
    } else {
      pencilMarkerRef.current = new google.maps.Marker({
        position: { lat: searchOrigin.lat, lng: searchOrigin.lng },
        map,
        icon,
        clickable: false,
        zIndex: 900,
        opacity: 0.9,
        optimized: false,
      });
    }

    return () => {
      if (pencilMarkerRef.current) {
        pencilMarkerRef.current.setMap(null);
        pencilMarkerRef.current = null;
      }
    };
  }, [map, isDrawingCustomRoute, waitingForStart, searchOrigin]);

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
      polylineRef.current = newPolyline;

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

  // Create mode: Display path when currentPath is set (but not during custom drawing)
  useEffect(() => {
    // Don't interfere with custom drawing mode
    if (!map || mode !== "create" || isDrawingCustomRoute || waitingForStart || isDrawing) {
      return;
    }

    if (!currentPath || currentPath.length < 2) {
      // Clear polyline if path is invalid (but only if not drawing)
      if (polylineRef.current && (!currentPath || currentPath.length < 2)) {
        polylineRef.current.setMap(null);
        setPolyline(null);
        polylineRef.current = null;
      }
      return;
    }

    // Clear existing polyline
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    // Create new polyline with the path
    const googlePath = currentPath.map(p => new google.maps.LatLng(p.lat, p.lng));
    const newPolyline = new google.maps.Polyline({
      path: googlePath,
      strokeColor: "#4285F4",
      strokeWeight: 4,
      map,
    });

    setPolyline(newPolyline);
    polylineRef.current = newPolyline;

    // Fit bounds to show entire route
    const bounds = new google.maps.LatLngBounds();
    currentPath.forEach((point) => {
      bounds.extend({ lat: point.lat, lng: point.lng });
    });
    map.fitBounds(bounds);

    return () => {
      if (newPolyline) {
        newPolyline.setMap(null);
      }
    };
  }, [map, mode, currentPath, isDrawingCustomRoute, waitingForStart, isDrawing]);

  // Create mode: Handle destination selection (disabled when drawing custom route)
  useEffect(() => {
    if (!map || mode !== "create" || isDrawingCustomRoute) return;

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
  }, [map, mode, marker, onDestinationChange, isDrawingCustomRoute]);

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
      if (polylineRef.current) {
        polylineRef.current.setPath(snappedPath);
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
  }, [onPathChange, map]);

  // Handle custom drawing mode activation - change cursor to pencil immediately
  useEffect(() => {
    if (!map || !isDrawingCustomRoute) {
      // Reset cursor when not drawing
      if (map && !isDrawingCustomRoute) {
        map.setOptions({ draggable: true });
        // Remove cursor style from map container and all children
        if (mapRef.current) {
          mapRef.current.style.cursor = "";
          mapRef.current.classList.remove("drawing-mode");
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
      polylineRef.current = null;
    }
    
    // Disable map dragging and set cursor
    map.setOptions({ draggable: false });
    
    // Add CSS class to map container for cursor styling
    if (mapRef.current) {
      mapRef.current.classList.add("drawing-mode");
    }
    
    // Function to apply crosshair cursor to all elements
    const applyCrosshairCursor = () => {
      if (!mapRef.current) return;
      
      // Set on the map container itself first
      mapRef.current.style.cursor = "crosshair";
      mapRef.current.style.setProperty("cursor", "crosshair", "important");
      
      const mapDiv = map.getDiv();
      if (mapDiv) {
        // Force cursor on the main map div
        mapDiv.style.cursor = "crosshair";
        mapDiv.style.setProperty("cursor", "crosshair", "important");
        
        // Set cursor on all child elements (especially the canvas)
        const allElements = mapDiv.querySelectorAll("*");
        allElements.forEach((el: Element) => {
          const htmlEl = el as HTMLElement;
          if (htmlEl && htmlEl.style) {
            htmlEl.style.cursor = "crosshair";
            htmlEl.style.setProperty("cursor", "crosshair", "important");
          }
        });
        
        // Also try to find and set cursor on the canvas specifically
        const canvas = mapDiv.querySelector("canvas");
        if (canvas) {
          canvas.style.cursor = "crosshair";
          canvas.style.setProperty("cursor", "crosshair", "important");
        }
      }
    };
    
    // Apply cursor immediately
    applyCrosshairCursor();
    
    // Continuously reapply cursor (Google Maps might reset it)
    const cursorInterval = setInterval(applyCrosshairCursor, 50);
    
    // Also apply on mouse move (most reliable)
    let cursorMouseMove: google.maps.MapsEventListener | null = null;
    if (isMapStable) {
      cursorMouseMove = map.addListener("mousemove", applyCrosshairCursor);
    }
    
    // Start the drawing process - wait for user to click on map
    setWaitingForStart(true);
    setIsDrawing(false);
    setDrawingPath([]);
    
    return () => {
      clearInterval(cursorInterval);
      if (cursorMouseMove) {
        google.maps.event.removeListener(cursorMouseMove);
      }
      if (mapRef.current) {
        mapRef.current.classList.remove("drawing-mode");
      }
    };
  }, [map, isDrawingCustomRoute, isMapStable, polyline]);

  // Shared function to start drawing from origin
  const startDrawingFromOrigin = useCallback((startDragImmediately = false) => {
    if (!map || !searchOrigin || !searchDestination) return;

    setWaitingForStart(false);
    setIsDrawing(true);
    
    // Start path from origin
    const startPath = [{ lat: searchOrigin.lat, lng: searchOrigin.lng }];
    setDrawingPath(startPath);
    
    // Zoom to 70% (zoom level 15 is approximately 70% zoom)
    map.setZoom(15);
    
    // Center map on origin
    map.setCenter({ lat: searchOrigin.lat, lng: searchOrigin.lng });
    
    // Create polyline starting from origin
    const googlePath = startPath.map(p => new google.maps.LatLng(p.lat, p.lng));
    const newPolyline = new google.maps.Polyline({
      path: googlePath,
      strokeColor: "#4285F4",
      strokeWeight: 4,
      map,
    });
    setPolyline(newPolyline);
    polylineRef.current = newPolyline;

    // Set up drag listeners - start listening immediately for mousemove
    let isDragging = startDragImmediately;
    let moveListener: google.maps.MapsEventListener | null = null;
    let mouseUpListener: google.maps.MapsEventListener | null = null;
    let globalMouseUpHandler: ((e: MouseEvent) => void) | null = null;

    const finishDrawing = () => {
      // Get current path from polyline
      let currentPath: LatLng[] = [];
      if (polylineRef.current) {
        const path = polylineRef.current.getPath();
        currentPath = Array.from(path.getArray()).map((latLng: google.maps.LatLng) => ({
          lat: latLng.lat(),
          lng: latLng.lng(),
        }));
      } else {
        currentPath = drawingPath;
      }
      
      // Ensure path ends at destination
      let finalPath = currentPath.length > 0 ? currentPath : drawingPath;
      if (searchDestination && finalPath.length > 0) {
        const lastPoint = finalPath[finalPath.length - 1];
        const distanceToDest = Math.sqrt(
          Math.pow(lastPoint.lat - searchDestination.lat, 2) + 
          Math.pow(lastPoint.lng - searchDestination.lng, 2)
        );
        
        if (distanceToDest > 0.001) {
          finalPath = [...finalPath, { lat: searchDestination.lat, lng: searchDestination.lng }];
        }
      }
      
      // Ensure path starts from origin
      if (searchOrigin && finalPath.length > 0) {
        const firstPoint = finalPath[0];
        const distanceToOrigin = Math.sqrt(
          Math.pow(firstPoint.lat - searchOrigin.lat, 2) + 
          Math.pow(firstPoint.lng - searchOrigin.lng, 2)
        );
        
        if (distanceToOrigin > 0.001) {
          finalPath = [{ lat: searchOrigin.lat, lng: searchOrigin.lng }, ...finalPath];
        }
      }
      
      // Update polyline with final path
      if (polylineRef.current && finalPath.length > 0) {
        const googlePath = finalPath.map(p => new google.maps.LatLng(p.lat, p.lng));
        polylineRef.current.setPath(googlePath);
      }
      
      // Snap to roads and update
      if (finalPath.length > 1) {
        snapPathToRoads(finalPath);
      } else if (finalPath.length > 0) {
        onPathChange?.(finalPath);
      }
      
      // Notify parent that custom drawing is complete
      if (onCustomDrawComplete) {
        onCustomDrawComplete();
      }
    };

    const handleMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;
      setIsDrawing(false);
      
      // Clean up listeners
      if (moveListener) {
        google.maps.event.removeListener(moveListener);
        moveListener = null;
      }
      if (mouseUpListener) {
        google.maps.event.removeListener(mouseUpListener);
        mouseUpListener = null;
      }
      if (globalMouseUpHandler) {
        document.removeEventListener("mouseup", globalMouseUpHandler);
        globalMouseUpHandler = null;
      }
      
      // Finish drawing and snap to roads
      finishDrawing();
    };

    // Listen for mouse move while dragging (starts immediately after clicking origin)
    moveListener = map.addListener("mousemove", (moveEvent: google.maps.MapMouseEvent) => {
      if (!isDragging || !moveEvent.latLng) return;
      
      const lat = moveEvent.latLng.lat();
      const lng = moveEvent.latLng.lng();
      
      setDrawingPath((prev) => {
        // Only add point if it's different enough from the last point
        if (prev.length > 0) {
          const lastAdded = prev[prev.length - 1];
          const distance = Math.sqrt(
            Math.pow(lat - lastAdded.lat, 2) + 
            Math.pow(lng - lastAdded.lng, 2)
          );
          
          // Minimum distance threshold (~5 meters)
          if (distance < 0.00005) {
            return prev; // Don't add if too close
          }
        }
        
        const newPath = [...prev, { lat, lng }];
        
        // Update polyline in real-time
        if (polylineRef.current) {
          const googlePath = newPath.map(p => new google.maps.LatLng(p.lat, p.lng));
          polylineRef.current.setPath(googlePath);
        }
        
        return newPath;
      });
    });

    // Listen for mousedown to start dragging
    const mouseDownListener = map.addListener("mousedown", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      isDragging = true;
    });

    // Listen for mouse up on map
    mouseUpListener = map.addListener("mouseup", handleMouseUp);
    
    // Also listen globally in case mouse is released outside map
    globalMouseUpHandler = handleMouseUp;
    document.addEventListener("mouseup", globalMouseUpHandler);

    // Cleanup function
    return () => {
      if (moveListener) {
        google.maps.event.removeListener(moveListener);
      }
      if (mouseDownListener) {
        google.maps.event.removeListener(mouseDownListener);
      }
      if (mouseUpListener) {
        google.maps.event.removeListener(mouseUpListener);
      }
      if (globalMouseUpHandler) {
        document.removeEventListener("mouseup", globalMouseUpHandler);
      }
    };
  }, [map, searchOrigin, searchDestination, drawingPath, snapPathToRoads, onPathChange, onCustomDrawComplete]);

  // Handle waiting for start point - user can click on origin marker or map
  useEffect(() => {
    if (!map || mode !== "create" || !waitingForStart || !isDrawingCustomRoute) {
      return;
    }

    // Ensure we have origin and destination before allowing drawing
    if (!searchOrigin || !searchDestination) {
      return;
    }

    // Also allow clicking anywhere on map to start (as fallback)
    const mapClickListener = map.addListener("mousedown", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      // Start drawing from origin when clicking anywhere on map
      startDrawingFromOrigin(true);
    });

    return () => {
      google.maps.event.removeListener(mapClickListener);
    };
  }, [map, mode, waitingForStart, isDrawingCustomRoute, searchOrigin, searchDestination, startDrawingFromOrigin]);

  // Create mode: Handle cursor styling when drawing (drag-based drawing is handled above)
  useEffect(() => {
    if (!map || mode !== "create" || !isDrawing) {
      if (map) {
        map.setOptions({ draggable: true });
      }
      return;
    }

    // Disable map dragging while drawing
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

    return () => {
      if (map) {
        map.setOptions({ draggable: true });
      }
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
  }, [map, mode, isDrawing]);

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
      mapRef.current.classList.remove("drawing-mode");
    }
    
    if (polyline) {
      polyline.setMap(null);
      setPolyline(null);
      polylineRef.current = null;
    }
    
    if (pencilMarkerRef.current) {
      pencilMarkerRef.current.setMap(null);
      pencilMarkerRef.current = null;
    }
    
    // Notify parent that drawing is cancelled
    if (onCustomDrawComplete) {
      onCustomDrawComplete();
    }
  };

  return (
    <div className="relative h-full w-full">
      <div 
        ref={mapRef} 
        className={`h-full w-full ${isDrawingCustomRoute ? 'drawing-mode' : ''}`}
        style={{
          cursor: (isDrawingCustomRoute && (waitingForStart || isDrawing)) ? "crosshair" : "default"
        } as React.CSSProperties}
      />
      {mode === "create" && isDrawingCustomRoute && (
        <div className="pointer-events-none absolute bottom-4 left-4 z-20 flex items-center gap-3">
          <div className="pointer-events-auto rounded-lg bg-white/95 px-4 py-2 text-xs font-medium text-gray-700 shadow-lg">
            {waitingForStart ? "Drag from A to B to sketch your route." : isDrawing ? "Release to finish your custom route." : ""}
          </div>
          <button
            onClick={resetDrawing}
            className="pointer-events-auto rounded-lg bg-gray-600 px-3 py-2 text-xs font-semibold text-white shadow-lg hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}


