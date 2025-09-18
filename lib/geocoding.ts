type GeocodeResult = { lat: number; lng: number; address?: string; city?: string } | null;

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

export async function geocodeWithNominatim(query: string): Promise<GeocodeResult> {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '1',
    'accept-language': 'ja',
  });
  const headers: Record<string, string> = {
    'User-Agent': `family-weekend/web (${process.env.NOMINATIM_EMAIL || 'contact@local'})`,
  };
  // Politeness delay per Nominatim usage policy
  await sleep(1100);
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, { headers });
  if (!res.ok) return null;
  const json = await res.json();
  if (!Array.isArray(json) || json.length === 0) return null;
  const r = json[0];
  return {
    lat: Number(r.lat),
    lng: Number(r.lon),
    address: r.display_name || undefined,
    city: r.address?.city || r.address?.town || r.address?.village || r.address?.county || undefined,
  };
}

export async function geocodeAddress({ name, city, address }: { name?: string; city?: string; address?: string; }): Promise<GeocodeResult> {
  const parts: string[] = [];
  if (address) parts.push(String(address));
  if (city && (!address || !String(address).includes(city))) parts.push(String(city));
  if (!parts.length && name) parts.push(String(name));
  if (!parts.length) return null;
  const query = parts.join(', ');
  try {
    return await geocodeWithNominatim(query);
  } catch (e) {
    console.warn('[geocode] failed for', query, e instanceof Error ? e.message : String(e));
    return null;
  }
}

