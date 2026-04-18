import type { GrowiPageContext, PageMode } from './types';
import { extractPageId, isExcludedPath, isRootPage } from '../api/utils';
import { fetchPageIdByPath } from '../api/page';

export type NavigationCallback = (ctx: GrowiPageContext) => void;

export interface NavigationMonitor {
  start(): void;
  stop(): void;
  addListener(callback: NavigationCallback): () => void;
  fireCurrentPage(): void;
  fireCurrentPageTo(callback: NavigationCallback): Promise<void>;
}

function hashToMode(hash: string): PageMode {
  return hash === '#edit' ? 'edit' : 'view';
}

export function createNavigationMonitor(debugLog: (...args: unknown[]) => void): NavigationMonitor {
  let lastKey: string | null = null;
  let isListening = false;
  const listeners = new Set<NavigationCallback>();

  function buildContext(url: URL): GrowiPageContext | null {
    if (isExcludedPath(url.pathname)) return null;
    const mode = hashToMode(url.hash);
    const revisionId = url.searchParams.get('revisionId') ?? undefined;

    if (isRootPage(url.pathname)) {
      // pageId is resolved async via resolveAndDispatch
      return { pageId: '', mode, revisionId, path: '/' };
    }

    const pageId = extractPageId(url.pathname);
    if (!pageId) return null;
    return { pageId: `/${pageId}`, mode, revisionId, path: undefined };
  }

  function dispatch(ctx: GrowiPageContext): void {
    const key = `${ctx.pageId}::${ctx.mode}::${ctx.revisionId ?? ''}`;
    if (key === lastKey) return;
    lastKey = key;

    debugLog('[PluginHub] page change:', ctx);

    listeners.forEach((cb) => {
      try {
        const result = cb(ctx) as unknown;
        if (result instanceof Promise) {
          (result as Promise<void>).catch((e) =>
            console.error('[PluginHub] onPageChange callback error', e),
          );
        }
      } catch (e) {
        console.error('[PluginHub] onPageChange callback error', e);
      }
    });
  }

  async function resolveAndDispatch(url: URL): Promise<void> {
    const ctx = buildContext(url);
    if (!ctx) return;

    // Root page: resolve actual pageId via API
    if (isRootPage(url.pathname) && !ctx.pageId) {
      try {
        const resolved = await fetchPageIdByPath('/', undefined);
        if (resolved) {
          ctx.pageId = `/${resolved}`;
        }
      } catch (e) {
        debugLog('[PluginHub] failed to resolve root pageId:', e);
      }
    }

    dispatch(ctx);
  }

  function onNavigateSuccess(): void {
    const nav = (window as any).navigation;
    const entry = nav?.currentEntry;
    if (!entry?.url) return;
    resolveAndDispatch(new URL(entry.url));
  }

  function start(): void {
    const nav = (window as any).navigation;
    if (!nav) return;
    if (isListening) return;
    isListening = true;
    nav.addEventListener('navigatesuccess', onNavigateSuccess);
    debugLog('[PluginHub] navigation monitoring started');
  }

  function stop(): void {
    const nav = (window as any).navigation;
    nav?.removeEventListener('navigatesuccess', onNavigateSuccess);
    isListening = false;
    lastKey = null;
    debugLog('[PluginHub] navigation monitoring stopped');
  }

  function fireCurrentPage(): void {
    resolveAndDispatch(new URL(location.href));
  }

  function addListener(callback: NavigationCallback): () => void {
    listeners.add(callback);
    return () => { listeners.delete(callback); };
  }

  /** Fire current page context to a specific callback (bypasses lastKey dedup) */
  async function fireCurrentPageTo(callback: NavigationCallback): Promise<void> {
    const url = new URL(location.href);
    const ctx = buildContext(url);
    if (!ctx) return;

    if (isRootPage(url.pathname) && !ctx.pageId) {
      try {
        const resolved = await fetchPageIdByPath('/', undefined);
        if (resolved) ctx.pageId = `/${resolved}`;
      } catch { /* ignore */ }
    }

    try {
      const result = callback(ctx) as unknown;
      if (result instanceof Promise) {
        (result as Promise<void>).catch((e) =>
          console.error('[PluginHub] onPageChange callback error', e),
        );
      }
    } catch (e) {
      console.error('[PluginHub] onPageChange callback error', e);
    }
  }

  return { start, stop, addListener, fireCurrentPage, fireCurrentPageTo };
}
