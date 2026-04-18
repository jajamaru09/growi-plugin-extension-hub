const PAGE_ID_RE = /^\/([0-9a-f]{24})$/i;

const EXCLUDED_PREFIXES = ['/admin', '/trash', '/me', '/login', '/_search', '/_api/'];

export function sanitizePageId(id: string): string {
  return id.replace(/^\//, '');
}

export function extractPageId(pathname: string): string | null {
  const m = pathname.match(PAGE_ID_RE);
  return m ? m[1] : null;
}

export function isExcludedPath(pathname: string): boolean {
  return EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function isRootPage(pathname: string): boolean {
  return pathname === '/';
}
