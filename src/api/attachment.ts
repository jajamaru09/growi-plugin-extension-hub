import type { Attachment } from '../hub/types';

const LIMIT = 100;

interface AttachmentListResponse {
  paginateResult: {
    docs: Attachment[];
    totalPages: number;
  };
}

export async function fetchAttachments(pageId: string, signal?: AbortSignal): Promise<Attachment[]> {
  const id = pageId.replace(/^\//, '');
  const allDocs: Attachment[] = [];
  let pageNumber = 1;

  while (true) {
    const res = await fetch(
      `/_api/v3/attachment/list?pageId=${encodeURIComponent(id)}&pageNumber=${pageNumber}&limit=${LIMIT}`,
      { credentials: 'include', signal },
    );
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data: AttachmentListResponse = await res.json();
    allDocs.push(...data.paginateResult.docs);
    if (pageNumber >= data.paginateResult.totalPages) break;
    pageNumber++;
  }

  return Array.from(new Map(allDocs.map((d) => [d._id, d])).values());
}

export async function fetchAttachment(attachmentId: string, signal?: AbortSignal): Promise<Attachment | null> {
  const res = await fetch(`/_api/v3/attachment/${encodeURIComponent(attachmentId)}`, {
    credentials: 'include',
    signal,
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.attachment ?? null;
}
