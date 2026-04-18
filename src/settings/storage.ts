import type { HubSettings } from '../hub/types';

const STORAGE_KEY = 'growiPluginHub:settings';

const DEFAULT_SETTINGS: HubSettings = {
  disabledPlugins: [],
  debug: false,
  debugPlugins: [],
};

export function loadSettings(): HubSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      disabledPlugins: Array.isArray(parsed.disabledPlugins) ? parsed.disabledPlugins : [],
      debug: typeof parsed.debug === 'boolean' ? parsed.debug : false,
      debugPlugins: Array.isArray(parsed.debugPlugins) ? parsed.debugPlugins : [],
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: HubSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function isPluginDisabled(settings: HubSettings, pluginId: string): boolean {
  return settings.disabledPlugins.includes(pluginId);
}
