/**
 * Location stamps for meeting and site-visit tracking.
 *
 * In the preview the device GPS would be far from the sample customers (all in Tricity, Punjab and
 * NCR), so positions are simulated: a trip starts at the nearest KENNIX office and arrives in the
 * customer's city. Set VITE_USE_DEVICE_GPS=true to read the real device location instead.
 */
import type { GeoStamp } from '../types'

export const OFFICES = {
  Chandigarh: { name: 'KENNIX office, Sector 17, Chandigarh', lat: 30.7398, lng: 76.7827 },
  Gurugram: { name: 'KENNIX office, Cyber City, Gurugram', lat: 28.495, lng: 77.089 },
} as const

export const CITY_POSITIONS: Record<string, { lat: number; lng: number; state: string }> = {
  Zirakpur: { lat: 30.6425, lng: 76.8173, state: 'Punjab' },
  Panchkula: { lat: 30.6942, lng: 76.8606, state: 'Haryana' },
  Mohali: { lat: 30.7046, lng: 76.7179, state: 'Punjab' },
  Chandigarh: { lat: 30.7333, lng: 76.7794, state: 'Chandigarh' },
  'New Chandigarh': { lat: 30.7836, lng: 76.699, state: 'Punjab' },
  Kharar: { lat: 30.746, lng: 76.6469, state: 'Punjab' },
  Ludhiana: { lat: 30.901, lng: 75.8573, state: 'Punjab' },
  Gurugram: { lat: 28.4595, lng: 77.0266, state: 'Haryana' },
  'Delhi NCR': { lat: 28.6139, lng: 77.209, state: 'Delhi' },
  Noida: { lat: 28.5355, lng: 77.391, state: 'Uttar Pradesh' },
}

const NCR = new Set(['Gurugram', 'Delhi NCR', 'Noida'])

export function officeFor(city: string) {
  return NCR.has(city) ? OFFICES.Gurugram : OFFICES.Chandigarh
}

/** Small deterministic offset so stamps for different journeys don't sit on the same point. */
function jitter(seed: string, scale = 0.012) {
  let hash = 0
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return { lat: ((hash % 1000) / 1000) * scale, lng: (((hash >> 10) % 1000) / 1000) * scale }
}

export function simulatedStamp(point: 'start' | 'destination', city: string, seed: string, at: string): GeoStamp {
  const base = point === 'start' ? officeFor(city) : CITY_POSITIONS[city] ?? OFFICES.Chandigarh
  const offset = jitter(`${seed}-${point}`, point === 'start' ? 0.002 : 0.012)
  return { at, lat: round(base.lat + offset.lat), lng: round(base.lng + offset.lng), simulated: true }
}

function round(value: number) {
  return Math.round(value * 1e5) / 1e5
}

/** Reads the device position when allowed (VITE_USE_DEVICE_GPS=true), otherwise simulates it. */
export async function captureStamp(point: 'start' | 'destination', city: string, seed: string, at: string): Promise<GeoStamp> {
  if (import.meta.env.VITE_USE_DEVICE_GPS === 'true' && typeof navigator !== 'undefined' && navigator.geolocation) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000 }))
      return { at, lat: round(position.coords.latitude), lng: round(position.coords.longitude), simulated: false }
    } catch {
      // Permission denied or no fix: fall back to the simulated point so the visit can still be logged.
    }
  }
  return simulatedStamp(point, city, seed, at)
}

export function mapLink(stamp: { lat: number; lng: number }) {
  return `https://www.google.com/maps?q=${stamp.lat},${stamp.lng}`
}
