export interface UserLocation {
  latitude: number;
  longitude: number;
}

export type LocationPermission =
  | "granted"
  | "denied"
  | "prompt"
  | "unavailable";

export async function checkLocationPermission(): Promise<LocationPermission> {
  if (!navigator.geolocation) {
    return "unavailable";
  }

  if (!navigator.permissions) {
    return "prompt";
  }

  try {
    const result = await navigator.permissions.query({ name: "geolocation" });
    return result.state as LocationPermission;
  } catch {
    return "prompt";
  }
}

export function requestUserLocation(): Promise<UserLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
  });
}

export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  // Earth radius in meters — return distance in meters (not kilometers)
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
