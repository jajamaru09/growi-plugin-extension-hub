import type { PageInfo } from '../hub/types';

export async function fetchPageIdByPath(path: string, signal?: AbortSignal): Promise<string | null> {
  const res = await fetch(`/_api/v3/page/?path=${encodeURIComponent(path)}`, {
    credentials: 'same-origin',
    signal,
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.page?._id ?? null;
}

export async function fetchPageInfo(pageId: string, signal?: AbortSignal): Promise<PageInfo | null> {
  const id = pageId.replace(/^\//, '');
  const res = await fetch(`/_api/v3/page?pageId=${encodeURIComponent(id)}`, {
    credentials: 'same-origin',
    signal,
  });
  if (!res.ok) return null;
  const data = await res.json();
  const page = data.page;
  if (!page) return null;
  return {
    _id: page._id,
    path: page.path,
    revision: page.revision
      ? { _id: page.revision._id, body: page.revision.body }
      : undefined,
    seenUsers: page.seenUsers ?? undefined,
  };
}
