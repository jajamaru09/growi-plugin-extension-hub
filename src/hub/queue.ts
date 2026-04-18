import type {
  GrowiPluginHub,
  GrowiPluginHubQueue,
  HubSettings,
  PluginRegistration,
  PluginState,
} from './types';
import { createRegistry, type Registry } from './registry';
import { createNavigationMonitor, type NavigationMonitor } from './navigation';
import { createEventBus, type EventBus } from './events';
import { loadSettings, saveSettings } from '../settings/storage';
import * as pageApi from '../api/page';
import * as revisionApi from '../api/revision';
import * as attachmentApi from '../api/attachment';
import * as userApi from '../api/user';
import * as searchApi from '../api/search';
import * as apiUtils from '../api/utils';

export interface HubInternals {
  hub: GrowiPluginHub;
  registry: Registry;
  nav: NavigationMonitor;
  events: EventBus;
}

export function initHub(): HubInternals {
  // Collect queued registrations
  const prev = window.growiPluginHub as GrowiPluginHubQueue | undefined;
  const pending: PluginRegistration[] = prev?._queue ?? [];

  // Load settings
  let settings: HubSettings = loadSettings();

  // Create debug logger
  function debugLog(...args: unknown[]): void {
    if (settings.debug) {
      console.log(...args);
    }
  }

  // Create subsystems
  const nav = createNavigationMonitor(debugLog);
  const registry = createRegistry(nav, settings, debugLog);
  const events = createEventBus();

  // Build public API
  const hub: GrowiPluginHub = {
    register: (plugin) => registry.register(plugin),
    unregister: (id) => registry.unregister(id),
    updateBadge: (id, value) => registry.updateBadge(id, value),
    emit: (event, data) => events.emit(event, data),
    on: (event, callback) => events.on(event, callback),
    api: {
      fetchPageIdByPath: pageApi.fetchPageIdByPath,
      fetchPageInfo: pageApi.fetchPageInfo,
      fetchRevisions: revisionApi.fetchRevisions,
      fetchRevision: revisionApi.fetchRevision,
      fetchAttachments: attachmentApi.fetchAttachments,
      fetchAttachment: attachmentApi.fetchAttachment,
      fetchUsers: userApi.fetchUsers,
      searchPages: searchApi.searchPages,
      sanitizePageId: apiUtils.sanitizePageId,
      extractPageId: apiUtils.extractPageId,
      isExcludedPath: apiUtils.isExcludedPath,
    },
    get debug() { return settings.debug; },
    set debug(value: boolean) {
      settings = { ...settings, debug: value };
      saveSettings(settings);
    },
    log(pluginId: string, ...args: unknown[]): void {
      if (!settings.debug) return;
      if (settings.debugPlugins.includes(pluginId)) return;  // blacklist: skip excluded plugins
      console.log(`[${pluginId}]`, ...args);
    },
    _getPluginStates: () => registry.getPluginStates(),
    _onRegistryUpdate: (callback) => registry.onUpdate(callback),
    _getSettings: () => ({ ...settings }),
    _updateSettings: (newSettings: HubSettings) => {
      settings = { ...newSettings };
      saveSettings(settings);
      registry.reconcileSettings(settings);
    },
  };

  // Install on window
  window.growiPluginHub = hub;

  // Drain queue
  pending.forEach((plugin) => {
    debugLog('[PluginHub] draining queued plugin:', plugin.id);
    registry.register(plugin);
  });

  // Start navigation monitoring
  nav.start();

  debugLog(`[PluginHub] initialized. ${pending.length} queued plugin(s) processed.`);

  return { hub, registry, nav, events };
}
