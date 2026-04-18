import { initHub } from './src/hub/queue';
import { mountHubUI, unmountHubUI } from './src/ui/HubMount';

declare global {
  interface Window {
    pluginActivators?: Record<string, { activate(): void; deactivate(): void }>;
  }
}

const PLUGIN_NAME = 'growi-plugin-extension-hub';

let internals: ReturnType<typeof initHub> | null = null;
let navCleanup: (() => void) | null = null;

function activate(): void {
  internals = initHub();
  mountHubUI(internals.hub);

  // Re-mount UI on page navigation (DOM may be replaced by GROWI)
  navCleanup = internals.nav.addListener(() => {
    mountHubUI(internals!.hub);
  });

  // Fire initial page change for all registered plugins
  internals.nav.fireCurrentPage();
}

function deactivate(): void {
  navCleanup?.();
  navCleanup = null;
  internals?.nav.stop();
  unmountHubUI();
  internals = null;
}

if (window.pluginActivators == null) {
  window.pluginActivators = {};
}
window.pluginActivators[PLUGIN_NAME] = { activate, deactivate };
