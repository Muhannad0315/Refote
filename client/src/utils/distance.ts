export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters))
    throw new Error("formatDistance: invalid meters");
  // Format meters with thousands separator (examples use comma separators)
  const metersDisplay = Math.round(meters).toLocaleString("en-US");

  // Convert to miles and round to 1 decimal place
  const miles = meters / 1609.34;
  const milesRounded = Math.round(miles * 10) / 10;

  return `${metersDisplay} m (~${milesRounded.toFixed(1)} mi)`;
}
