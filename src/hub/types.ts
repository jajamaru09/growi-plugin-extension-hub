export type PageMode = 'view' | 'edit';

export interface GrowiPageContext {
  pageId: string;
  mode: PageMode;
  revisionId?: string;
  path?: string;
}

export type PageChangeCallback = (ctx: GrowiPageContext) => void | Promise<void>;

export interface PluginRegistration {
  id: string;
  label: string;
  icon?: string;
  order?: number;
  required?: boolean;
  menuItem?: boolean;
  onAction?: (pageId: string) => void;
  onPageChange?: PageChangeCallback;
  onDisable?: () => void;
  badge?: number | null;
  badgeColor?: string;
}

export interface PageInfo {
  _id: string;
  path: string;
  revision?: {
    _id: string;
    body: string;
  };
  seenUsers?: string[];
}

export interface Revision {
  _id: string;
  body: string;
  author: { username: string; name?: string };
  createdAt: string;
}

export interface Attachment {
  _id: string;
  fileName: string;
  fileSize: number;
  filePathProxied: string;
  creator: { username: string };
  createdAt: string;
}

export interface User {
  _id: string;
  username: string;
  name: string;
  imageUrlCached?: string;
}

export interface SearchResult {
  _id: string;
  path: string;
  snippet?: string;
}

export type PluginStatus = 'active' | 'disabled' | 'error';

export interface PluginState {
  registration: PluginRegistration;
  status: PluginStatus;
}

export interface HubSettings {
  disabledPlugins: string[];
  debug: boolean;
  debugPlugins: string[];  // empty = all plugins, non-empty = only listed plugins
}

export interface HubApi {
  fetchPageIdByPath(path: string, signal?: AbortSignal): Promise<string | null>;
  fetchPageInfo(pageId: string, signal?: AbortSignal): Promise<PageInfo | null>;
  fetchRevisions(pageId: string, signal?: AbortSignal): Promise<Revision[]>;
  fetchRevision(revisionId: string, pageId: string, signal?: AbortSignal): Promise<Revision | null>;
  fetchAttachments(pageId: string, signal?: AbortSignal): Promise<Attachment[]>;
  fetchAttachment(attachmentId: string, signal?: AbortSignal): Promise<Attachment | null>;
  fetchUsers(userIds: string[], signal?: AbortSignal): Promise<User[]>;
  searchPages(keyword: string, signal?: AbortSignal): Promise<SearchResult[]>;
  sanitizePageId(id: string): string;
  extractPageId(pathname: string): string | null;
  isExcludedPath(pathname: string): boolean;
}

export interface GrowiPluginHub {
  register(plugin: PluginRegistration): void;
  unregister(id: string): void;
  updateBadge(id: string, value: number | null): void;
  emit(event: string, data?: unknown): void;
  on(event: string, callback: (data: unknown) => void): () => void;
  api: HubApi;
  debug: boolean;
  log(pluginId: string, ...args: unknown[]): void;
  _getPluginStates(): PluginState[];
  _onRegistryUpdate(callback: () => void): () => void;
  _getSettings(): HubSettings;
  _updateSettings(settings: HubSettings): void;
}

export interface GrowiPluginHubQueue {
  _queue: PluginRegistration[];
}

declare global {
  interface Window {
    growiPluginHub?: GrowiPluginHub | GrowiPluginHubQueue;
  }
}
