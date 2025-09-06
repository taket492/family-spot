export type WebSearchItem = {
  title: string;
  link: string;
  snippet?: string;
  source?: string; // domain or provider
};

export async function webSearch(query: string, opts?: { count?: number }): Promise<WebSearchItem[]> {
  const provider = (process.env.SEARCH_PROVIDER || 'google').toLowerCase();
  const count = Math.min(Math.max(opts?.count ?? 5, 1), 10);
  if (provider === 'bing') return bingSearch(query, count);
  return googleCseSearch(query, count);
}

async function googleCseSearch(query: string, count: number): Promise<WebSearchItem[]> {
  const key = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CSE_ID; // Programmable Search Engine ID
  if (!key || !cx) return [];
  const params = new URLSearchParams({ key, cx, q: query, num: String(count) });
  const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params.toString()}`);
  if (!res.ok) return [];
  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];
  return items.map((it: any) => ({
    title: String(it.title || ''),
    link: String(it.link || ''),
    snippet: it.snippet ? String(it.snippet) : undefined,
    source: it.displayLink ? String(it.displayLink) : 'google',
  })).filter((x: WebSearchItem) => x.title && x.link);
}

async function bingSearch(query: string, count: number): Promise<WebSearchItem[]> {
  const key = process.env.BING_SEARCH_KEY;
  if (!key) return [];
  const params = new URLSearchParams({ q: query, count: String(count), mkt: 'ja-JP', safeSearch: 'Moderate' });
  const res = await fetch(`https://api.bing.microsoft.com/v7.0/search?${params.toString()}`, {
    headers: { 'Ocp-Apim-Subscription-Key': key },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const webPages = (data as any).webPages?.value || [];
  return webPages.map((it: any) => ({
    title: String(it.name || ''),
    link: String(it.url || ''),
    snippet: it.snippet ? String(it.snippet) : undefined,
    source: it.displayUrl ? String(it.displayUrl) : 'bing',
  })).filter((x: WebSearchItem) => x.title && x.link);
}

