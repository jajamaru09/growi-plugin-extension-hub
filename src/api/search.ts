import type { SearchResult } from '../hub/types';

export async function searchPages(keyword: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const url = `/_api/search?q=${encodeURIComponent(`"${keyword}"`)}&limit=50`;
  const res = await fetch(url, { credentials: 'same-origin', signal });
  if (!res.ok) return [];
  const json = await res.json();
  if (!json.ok) return [];
  return (json.data as Array<{ data: SearchResult }>).map((item) => item.data);
}
