export const SERVICE_RADIUS_MILES = Object.freeze([5, 10, 15, 25, 50]);

export function normalizeServiceRadiusMiles(value) {
  const miles = Number(value);
  return SERVICE_RADIUS_MILES.includes(miles) ? miles : null;
}
