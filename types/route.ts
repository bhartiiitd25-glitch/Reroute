export type RouteMode = "general" | "microroute";

export interface GeneralRoute {
  type: "general";
  destLat: number;
  destLng: number;
  encodedPolyline: string;
  note?: string;
}

export interface MicroRoute {
  type: "microroute";
  xLat: number;
  xLng: number;
  yLat: number;
  yLng: number;
  encodedXY: string;
  note?: string;
  ttlHours: number; // 1-72
}

export type RouteData = GeneralRoute | MicroRoute;

