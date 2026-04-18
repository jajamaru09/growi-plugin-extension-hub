import type { Revision } from '../hub/types';

const LIMIT = 100;

interface RevisionListResponse {
  revisions: Array<{
    _id: string;
    body: string;
    author: { username: string; name?: string };
    createdAt: string;
  }>;
  totalCount: number;
}

export async function fetchRevisions(pageId: string, signal?: AbortSignal): Promise<Revision[]> {
  const id = pageId.replace(/^\//, '');
  const all: Revision[] = [];
  let offset = 0;

  while (true) {
    const res = await fetch(
      `/_api/v3/revisions/list?pageId=${encodeURIComponent(id)}&offset=${offset}&limit=${LIMIT}`,
      { credentials: 'same-origin', signal },
    );
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data: RevisionListResponse = await res.json();
    all.push(...data.revisions);
    if (all.length >= data.totalCount) break;
    offset += LIMIT;
  }

  all.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return all;
}

export async function fetchRevision(revisionId: string, pageId: string, signal?: AbortSignal): Promise<Revision | null> {
  const cleanPageId = pageId.replace(/^\//, '');
  const res = await fetch(`/_api/v3/revisions/${encodeURIComponent(revisionId)}?pageId=${encodeURIComponent(cleanPageId)}`, {
    credentials: 'same-origin',
    signal,
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.revision ?? null;
}
