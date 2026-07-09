// Route optimization: nearest-neighbor construction + 2-opt improvement over a
// travel matrix. The matrix comes from the Google Distance Matrix API when
// GOOGLE_MAPS_API_KEY is set, otherwise from haversine distance at an assumed
// 22 mph urban average — good enough to order stops sensibly without a key.

export interface Point {
  lat: number;
  lng: number;
}

export interface TravelMatrix {
  miles: number[][];
  minutes: number[][];
  source: 'google' | 'haversine';
}

const EARTH_RADIUS_MI = 3958.8;
const AVG_MPH = 22;

export function haversineMiles(a: Point, b: Point): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.sqrt(h));
}

function haversineMatrix(points: Point[]): TravelMatrix {
  const n = points.length;
  const miles = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const minutes = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  // Streets aren't straight lines — pad crow-flies distance by ~30%.
  const ROAD_FACTOR = 1.3;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const mi = haversineMiles(points[i], points[j]) * ROAD_FACTOR;
      miles[i][j] = miles[j][i] = mi;
      minutes[i][j] = minutes[j][i] = (mi / AVG_MPH) * 60;
    }
  }
  return { miles, minutes, source: 'haversine' };
}

async function googleMatrix(points: Point[], apiKey: string): Promise<TravelMatrix | null> {
  try {
    const coords = points.map((p) => `${p.lat},${p.lng}`).join('|');
    const url =
      `https://maps.googleapis.com/maps/api/distancematrix/json` +
      `?origins=${encodeURIComponent(coords)}&destinations=${encodeURIComponent(coords)}` +
      `&units=imperial&key=${apiKey}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 'OK') return null;
    const n = points.length;
    const miles = Array.from({ length: n }, () => new Array<number>(n).fill(0));
    const minutes = Array.from({ length: n }, () => new Array<number>(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const el = data.rows?.[i]?.elements?.[j];
        if (!el || el.status !== 'OK') return null;
        miles[i][j] = el.distance.value / 1609.34;
        minutes[i][j] = el.duration.value / 60;
      }
    }
    return { miles, minutes, source: 'google' };
  } catch {
    return null;
  }
}

/** Distance Matrix caps elements per request; fall back to haversine for big days. */
export async function travelMatrix(points: Point[]): Promise<TravelMatrix> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (apiKey && points.length >= 2 && points.length <= 25) {
    const m = await googleMatrix(points, apiKey);
    if (m) return m;
  }
  return haversineMatrix(points);
}

export async function geocode(address: string): Promise<Point | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const loc = data.results?.[0]?.geometry?.location;
    return loc ? { lat: loc.lat, lng: loc.lng } : null;
  } catch {
    return null;
  }
}

/**
 * Solve the open route (start at index 0, no return leg) with nearest-neighbor
 * then 2-opt. Returns stop visit order as indices into the matrix (excluding 0).
 */
export function optimizeOrder(matrix: number[][]): number[] {
  const n = matrix.length;
  if (n <= 2) return n === 2 ? [1] : [];

  // Nearest neighbor from the depot.
  const visited = new Set<number>([0]);
  const tour = [0];
  while (tour.length < n) {
    const last = tour[tour.length - 1];
    let best = -1;
    let bestDist = Infinity;
    for (let j = 0; j < n; j++) {
      if (!visited.has(j) && matrix[last][j] < bestDist) {
        best = j;
        bestDist = matrix[last][j];
      }
    }
    tour.push(best);
    visited.add(best);
  }

  // 2-opt improvement (keep depot fixed at position 0, open path).
  const pathCost = (t: number[]) => {
    let c = 0;
    for (let i = 0; i < t.length - 1; i++) c += matrix[t[i]][t[i + 1]];
    return c;
  };
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 50) {
    improved = false;
    for (let i = 1; i < tour.length - 1; i++) {
      for (let k = i + 1; k < tour.length; k++) {
        const candidate = [...tour.slice(0, i), ...tour.slice(i, k + 1).reverse(), ...tour.slice(k + 1)];
        if (pathCost(candidate) < pathCost(tour) - 1e-9) {
          tour.splice(0, tour.length, ...candidate);
          improved = true;
        }
      }
    }
  }

  return tour.slice(1);
}

export function legTotals(order: number[], matrix: TravelMatrix) {
  let miles = 0;
  let minutes = 0;
  let prev = 0;
  const legs: { miles: number; minutes: number }[] = [];
  for (const idx of order) {
    const mi = matrix.miles[prev][idx];
    const min = matrix.minutes[prev][idx];
    legs.push({ miles: round1(mi), minutes: Math.round(min) });
    miles += mi;
    minutes += min;
    prev = idx;
  }
  return { legs, totalMiles: round1(miles), totalMinutes: Math.round(minutes) };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Multi-stop Google Maps directions URL (max 9 waypoints + destination). */
export function googleMapsDirectionsUrl(start: string, stops: string[]): string {
  if (stops.length === 0) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(start)}`;
  const destination = stops[stops.length - 1];
  const waypoints = stops.slice(0, -1).slice(0, 9);
  const params = new URLSearchParams({
    api: '1',
    origin: start,
    destination,
    travelmode: 'driving',
  });
  if (waypoints.length) params.set('waypoints', waypoints.join('|'));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Apple Maps only takes one destination per link — used per-stop on the route card. */
export function appleMapsUrl(address: string): string {
  return `https://maps.apple.com/?daddr=${encodeURIComponent(address)}&dirflg=d`;
}
