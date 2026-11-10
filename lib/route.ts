/**
 * OSRM Driving Route Service with 5s timeout & Haversine fallback.
 * Uses public OSRM server:
 * https://router.project-osrm.org/route/v1/driving/{lng},{lat};{lng},{lat}?overview=full&geometries=geojson
 * NOTE: OSRM expects longitude first ({lng},{lat})!
 */

export interface RouteResult {
  coordinates: [number, number][]; // [lat, lng] for Leaflet
  distanceKm: number;
  durationMin: number;
  isRoadRoute: boolean;
}

export async function fetchOsrmRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<RouteResult | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data.routes || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];
    // OSRM coordinates are [lng, lat] -> convert to [lat, lng] for Leaflet
    const latLngCoordinates: [number, number][] = route.geometry.coordinates.map(
      (coord: [number, number]) => [coord[1], coord[0]]
    );

    const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
    const durationMin = Math.max(1, Math.ceil(route.duration / 60));

    return {
      coordinates: latLngCoordinates,
      distanceKm,
      durationMin,
      isRoadRoute: true,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    // On timeout or network failure, return null to gracefully trigger fallback
    return null;
  }
}

