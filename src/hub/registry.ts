import type { PluginRegistration, PluginState, PluginStatus, GrowiPageContext, HubSettings } from './types';
import type { NavigationMonitor } from './navigation';
import { isPluginDisabled } from '../settings/storage';

export interface Registry {
  register(plugin: PluginRegistration): void;
  unregister(id: string): void;
  updateBadge(id: string, value: number | null): void;
  getPluginStates(): PluginState[];
  onUpdate(callback: () => void): () => void;
  reconcileSettings(newSettings: HubSettings): void;
}

export function createRegistry(
  nav: NavigationMonitor,
  settings: HubSettings,
  debugLog: (...args: unknown[]) => void,
): Registry {
  let plugins: PluginState[] = [];
  const updateListeners = new Set<() => void>();
  const navCleanups = new Map<string, () => void>();

  function notifyUpdate(): void {
    updateListeners.forEach((cb) => {
      try { cb(); } catch (e) { console.error('[PluginHub] registry listener error', e); }
    });
  }

  function register(plugin: PluginRegistration): void {
    const existingIdx = plugins.findIndex((p) => p.registration.id === plugin.id);
    const disabled = !plugin.required && isPluginDisabled(settings, plugin.id);
    const status: PluginStatus = disabled ? 'disabled' : 'active';

    const state: PluginState = { registration: plugin, status };

    if (existingIdx >= 0) {
      // Clean up old nav listener
      navCleanups.get(plugin.id)?.();
      plugins = plugins.map((p, i) => (i === existingIdx ? state : p));
    } else {
      plugins = [...plugins, state];
    }

    // Set up navigation callback if active and has onPageChange
    if (status === 'active' && plugin.onPageChange) {
      const cleanup = nav.addListener((ctx: GrowiPageContext) => {
        plugin.onPageChange!(ctx);
      });
      navCleanups.set(plugin.id, cleanup);
    }

    // Fire onDisable immediately if the plugin is registered in the disabled state.
    // Without this, a plugin that modifies global state at activate() time
    // (e.g. wrapping customGenerateViewOptions) keeps running despite being disabled,
    // because onDisable is otherwise only fired on active→disabled transitions.
    if (status === 'disabled' && plugin.onDisable) {
      try { plugin.onDisable(); }
      catch (e) { console.error('[PluginHub] onDisable error (initial register)', e); }
    }

    debugLog(`[PluginHub] registered: ${plugin.id} (${status})`);
    notifyUpdate();
  }

  function unregister(id: string): void {
    const plugin = plugins.find((p) => p.registration.id === id);
    navCleanups.get(id)?.();
    navCleanups.delete(id);
    if (plugin) {
      try { plugin.registration.onDisable?.(); } catch (e) {
        console.error('[PluginHub] onDisable error', e);
      }
    }
    plugins = plugins.filter((p) => p.registration.id !== id);
    debugLog(`[PluginHub] unregistered: ${id}`);
    notifyUpdate();
  }

  function updateBadge(id: string, value: number | null): void {
    plugins = plugins.map((p) =>
      p.registration.id === id
        ? { ...p, registration: { ...p.registration, badge: value } }
        : p,
    );
    notifyUpdate();
  }

  function getPluginStates(): PluginState[] {
    return [...plugins];
  }

  function onUpdate(callback: () => void): () => void {
    updateListeners.add(callback);
    return () => { updateListeners.delete(callback); };
  }

  function reconcileSettings(newSettings: HubSettings): void {
    settings = newSettings;
    plugins = plugins.map((p) => {
      const disabled = !p.registration.required && isPluginDisabled(settings, p.registration.id);
      const newStatus: PluginStatus = disabled ? 'disabled' : 'active';

      if (newStatus !== p.status) {
        if (newStatus === 'disabled') {
          // Remove nav listener
          navCleanups.get(p.registration.id)?.();
          navCleanups.delete(p.registration.id);
          // Notify plugin of disable
          try { p.registration.onDisable?.(); } catch (e) {
            console.error('[PluginHub] onDisable error', e);
          }
        } else if (newStatus === 'active' && p.registration.onPageChange) {
          // Add nav listener
          const callback = (ctx: GrowiPageContext) => {
            p.registration.onPageChange!(ctx);
          };
          const cleanup = nav.addListener(callback);
          navCleanups.set(p.registration.id, cleanup);
          // Fire current page to re-enabled plugin immediately
          nav.fireCurrentPageTo(callback);
        }
        debugLog(`[PluginHub] ${p.registration.id}: ${p.status} → ${newStatus}`);
      }

      return { ...p, status: newStatus };
    });
    notifyUpdate();
  }

  return { register, unregister, updateBadge, getPluginStates, onUpdate, reconcileSettings };
}
